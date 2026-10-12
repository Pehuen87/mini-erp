using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MiniErp.Core.Data;
using Xunit;

namespace MiniErp.Tests;

/// <summary>
/// Levanta la API sobre una base SQLite en memoria propia (seedeada al arrancar, como en produccion).
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");

    public ApiFactory() => _conn.Open();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(_conn));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _conn.Dispose();
    }
}

// Flujos del README de punta a punta por HTTP. Cada test usa una base nueva con el seed.
public class ApiFlujosTests
{
    public record ArticuloResp(int Id, string Codigo, decimal PrecioUnitario, int StockActual, decimal AlicuotaIva);
    public record ClienteResp(int Id, string RazonSocial);
    public record ItemResp(int ArticuloId, int Cantidad, decimal DescuentoPct, decimal SubtotalLinea);
    public record PresupuestoResp(int Id, int Numero, string Estado, int ValidezDias, List<ItemResp> Items, decimal Subtotal, decimal Iva, decimal Total);
    public record FacturaResp(int Id, int Numero, int PresupuestoId, decimal Subtotal, decimal Iva, decimal Total);

    private static async Task<ArticuloResp> Articulo(HttpClient c, string codigo)
        => (await c.GetFromJsonAsync<List<ArticuloResp>>($"/api/articulos?busqueda={codigo}"))!.Single(a => a.Codigo == codigo);

    private static async Task<int> ClienteId(HttpClient c)
        => (await c.GetFromJsonAsync<List<ClienteResp>>("/api/clientes"))![0].Id;

    private static object Item(int articuloId, int cantidad, decimal descuentoPct = 0m)
        => new { articuloId, cantidad, descuentoPct };

    private static Task<HttpResponseMessage> PostPresupuesto(HttpClient c, int clienteId, int validezDias, params object[] items)
        => c.PostAsJsonAsync("/api/presupuestos", new { clienteId, validezDias, items });

    private static async Task<PresupuestoResp> CrearPresupuesto(HttpClient c, params object[] items)
    {
        var resp = await PostPresupuesto(c, await ClienteId(c), 15, items);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        return (await resp.Content.ReadFromJsonAsync<PresupuestoResp>())!;
    }

    private static Task<HttpResponseMessage> Facturar(HttpClient c, int presupuestoId)
        => c.PostAsync($"/api/facturas/facturar/{presupuestoId}", null);

    // ---- Flujo 1: crear y listar ----

    [Fact]
    public async Task Flujo1_CrearYListar_ApareceEnLaLista()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");

        var creado = await CrearPresupuesto(c, Item(art.Id, 1));
        var lista = await c.GetFromJsonAsync<List<PresupuestoResp>>("/api/presupuestos");

        var listado = Assert.Single(lista!, p => p.Id == creado.Id);
        Assert.Equal(creado.Total, listado.Total);
    }

    [Fact]
    public async Task Flujo1_Listar_IncluyeTodosLosEstadosOrdenadosPorNumeroDesc()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");
        var facturado = await CrearPresupuesto(c, Item(art.Id, 1));
        var borrador = await CrearPresupuesto(c, Item(art.Id, 1));
        Assert.Equal(HttpStatusCode.OK, (await Facturar(c, facturado.Id)).StatusCode);

        var lista = (await c.GetFromJsonAsync<List<PresupuestoResp>>("/api/presupuestos"))!;

        Assert.Equal("Facturado", lista.Single(p => p.Id == facturado.Id).Estado);
        Assert.Equal("Borrador", lista.Single(p => p.Id == borrador.Id).Estado);
        Assert.Equal(lista.Select(p => p.Numero).OrderByDescending(n => n), lista.Select(p => p.Numero));
    }

    [Fact]
    public async Task Obtener_Inexistente_Devuelve404()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();

        var resp = await c.GetAsync("/api/presupuestos/9999");

        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ---- Flujo 2: IVA con alicuotas mezcladas ----

    [Fact]
    public async Task Flujo2_IvaConAlicuotasMezcladas_PresupuestoYFacturaCoinciden()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art001 = await Articulo(c, "ART-001");
        var art004 = await Articulo(c, "ART-004");

        var creado = await CrearPresupuesto(c, Item(art001.Id, 1), Item(art004.Id, 1));
        var obtenido = (await c.GetFromJsonAsync<PresupuestoResp>($"/api/presupuestos/{creado.Id}"))!;

        Assert.Equal(39500m, obtenido.Subtotal);
        Assert.Equal(7822.50m, obtenido.Iva);
        Assert.Equal(47322.50m, obtenido.Total);

        var resp = await Facturar(c, creado.Id);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var factura = (await resp.Content.ReadFromJsonAsync<FacturaResp>())!;
        Assert.Equal(39500m, factura.Subtotal);
        Assert.Equal(7822.50m, factura.Iva);
        Assert.Equal(47322.50m, factura.Total);
    }

    [Fact]
    public async Task Obtener_SumaDeSubtotalesDeLinea_IgualAlSubtotal()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art001 = await Articulo(c, "ART-001");
        var art005 = await Articulo(c, "ART-005");

        var creado = await CrearPresupuesto(c, Item(art001.Id, 3, 12.5m), Item(art005.Id, 7, 33.33m));

        Assert.Equal(creado.Subtotal, creado.Items.Sum(i => i.SubtotalLinea));
    }

    // ---- Flujo 3: numeracion tras borrar ----

    [Fact]
    public async Task Flujo3_NumeracionTrasBorrar_AsignaNumeroNuevo()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");
        var primero = await CrearPresupuesto(c, Item(art.Id, 1));
        var segundo = await CrearPresupuesto(c, Item(art.Id, 1));

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/presupuestos/{segundo.Id}")).StatusCode);
        var tercero = await CrearPresupuesto(c, Item(art.Id, 1));

        Assert.NotEqual(primero.Numero, tercero.Numero);
        Assert.Equal(segundo.Numero + 1, tercero.Numero);
    }

    // ---- Flujo 4: datos invalidos ----

    [Theory]
    [InlineData(0, 0.0, 15)]
    [InlineData(-1, 0.0, 15)]
    [InlineData(1, -0.01, 15)]
    [InlineData(1, 100.01, 15)]
    [InlineData(1, 0.0, 0)]
    [InlineData(1, 0.0, -5)]
    public async Task Flujo4_DatosInvalidos_Devuelve400(int cantidad, double descuento, int validezDias)
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");

        var resp = await PostPresupuesto(c, await ClienteId(c), validezDias, Item(art.Id, cantidad, (decimal)descuento));

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Crear_SinItems_Devuelve400()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();

        var resp = await PostPresupuesto(c, await ClienteId(c), 15);

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Crear_ClienteInexistente_Devuelve400()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");

        var resp = await PostPresupuesto(c, 9999, 15, Item(art.Id, 1));

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Crear_Descuento100_AceptaConSubtotalCero()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");

        var creado = await CrearPresupuesto(c, Item(art.Id, 1, 100m));

        Assert.Equal(0m, creado.Subtotal);
        Assert.Equal(0m, creado.Total);
    }

    // ---- Flujo 5: facturacion ----

    [Fact]
    public async Task Flujo5_CantidadMayorAlStock_SeCreaPeroNoSeFactura()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art006 = await Articulo(c, "ART-006");
        Assert.Equal(3, art006.StockActual);

        var creado = await CrearPresupuesto(c, Item(art006.Id, 4));
        var resp = await Facturar(c, creado.Id);

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Equal(3, (await Articulo(c, "ART-006")).StockActual);
        Assert.Empty((await c.GetFromJsonAsync<List<FacturaResp>>("/api/facturas"))!);
    }

    [Fact]
    public async Task Flujo5_FacturarDosVeces_SegundaFallaYStockSeDescuentaUnaVez()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");
        var creado = await CrearPresupuesto(c, Item(art.Id, 2));

        Assert.Equal(HttpStatusCode.OK, (await Facturar(c, creado.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Facturar(c, creado.Id)).StatusCode);

        Assert.Equal(art.StockActual - 2, (await Articulo(c, "ART-001")).StockActual);
        Assert.Single((await c.GetFromJsonAsync<List<FacturaResp>>("/api/facturas"))!);
    }

    [Fact]
    public async Task Facturar_PresupuestoInexistente_Devuelve404()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();

        var resp = await Facturar(c, 9999);

        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    // ---- Borrado ----

    [Fact]
    public async Task Eliminar_Facturado_Devuelve400YConservaPresupuestoYFactura()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");
        var creado = await CrearPresupuesto(c, Item(art.Id, 1));
        Assert.Equal(HttpStatusCode.OK, (await Facturar(c, creado.Id)).StatusCode);

        var resp = await c.DeleteAsync($"/api/presupuestos/{creado.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync($"/api/presupuestos/{creado.Id}")).StatusCode);
        Assert.Single((await c.GetFromJsonAsync<List<FacturaResp>>("/api/facturas"))!);
    }


    /*con soft delete que teien ahora los presupuestos, este test ya no refleja el comportamiento
    [Fact]

    public async Task Eliminar_Borrador_Devuelve204YDesaparece()
    {
        using var api = new ApiFactory();
        var c = api.CreateClient();
        var art = await Articulo(c, "ART-001");
        var creado = await CrearPresupuesto(c, Item(art.Id, 1));

        var resp = await c.DeleteAsync($"/api/presupuestos/{creado.Id}");

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/presupuestos/{creado.Id}")).StatusCode);
    }*/
}
