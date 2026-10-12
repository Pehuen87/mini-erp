using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Models;
using Xunit;

namespace MiniErp.Tests;

// Reglas 3 (stock), 4 (idempotencia) y 5 (validez por dia calendario UTC), mas estados.
// Orden de chequeo al facturar: no existe -> ya facturado -> rechazado -> vencido -> stock.
public class FacturacionReglasTests
{
    // ---- Stock ----

    [Fact]
    public async Task Facturar_SinStockSuficiente_NoTocaElStock()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 5);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 10));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(5, art.StockActual);
    }

    [Fact]
    public async Task Facturar_CantidadIgualAlStock_DejaStockEnCero()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 3);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 3));

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(0, art.StockActual);
    }

    [Fact]
    public async Task Facturar_CantidadUnoMasQueElStock_RechazaSinEfectos()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 3);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 4));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(3, art.StockActual);
        Assert.Equal(0, await db.Facturas.CountAsync());
        Assert.Equal(EstadoPresupuesto.Aprobado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_VariosItemsYUnoSinStock_NoDescuentaNinguno()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var conStock = await Escenario.ArticuloAsync(db, stock: 10);
        var sinStock = await Escenario.ArticuloAsync(db, stock: 2);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (conStock, 5), (sinStock, 5));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(10, conStock.StockActual);
        Assert.Equal(2, sinStock.StockActual);
        Assert.Equal(0, await db.Facturas.CountAsync());
    }

    [Fact]
    public async Task Facturar_MismoArticuloEnDosLineasQueSuperanElStock_Rechaza()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 6), (art, 6));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(10, art.StockActual);
    }

    [Fact]
    public async Task Facturar_MismoArticuloEnDosLineasQueSumanElStock_DejaStockEnCero()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 4), (art, 6));

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(0, art.StockActual);
    }

    // ---- Idempotencia y existencia ----

    [Fact]
    public async Task Facturar_DosVeces_GeneraUnaSolaFacturaYQuedaFacturado()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 100);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 10));

        await fact.FacturarAsync(pres.Id);
        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(1, await db.Facturas.CountAsync());
        Assert.Equal(EstadoPresupuesto.Facturado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_PresupuestoInexistente_LanzaKeyNotFound()
    {
        var (_, _, fact) = Escenario.Armar();

        await Assert.ThrowsAsync<KeyNotFoundException>(() => fact.FacturarAsync(9999));
    }

    [Fact]
    public async Task Facturar_ReintentoTrasReponerStock_Factura()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 5);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 10));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));
        art.StockActual = 20;
        await db.SaveChangesAsync();

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(10, art.StockActual);
        Assert.Equal(EstadoPresupuesto.Facturado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_NumeraFacturasSecuencialmenteSinConsumirNumeroEnFallos()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var p1 = await Escenario.PresupuestoAsync(db, cliente, (art, 1));
        var pSinStock = await Escenario.PresupuestoAsync(db, cliente, (art, 100));
        var p3 = await Escenario.PresupuestoAsync(db, cliente, (art, 1));

        var f1 = await fact.FacturarAsync(p1.Id);
        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pSinStock.Id));
        var f2 = await fact.FacturarAsync(p3.Id);

        Assert.Equal(1, f1.Numero);
        Assert.Equal(2, f2.Numero);
    }

    // ---- Totales de la factura ----

    [Fact]
    public async Task Facturar_GuardaTotalesConIvaRedondeadoPorLinea()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 100, precio: 10.04m, alicuota: 10.5m);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 1), (art, 1), (art, 1));

        var factura = await fact.FacturarAsync(pres.Id);

        Assert.Equal(30.12m, factura.Subtotal);
        Assert.Equal(3.15m, factura.Iva);
        Assert.Equal(33.27m, factura.Total);
    }

    [Fact]
    public async Task Facturar_UsaPrecioYAlicuotaDelMomentoDelPresupuesto()
    {
        var (db, presupuestos, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 100, precio: 4500m, alicuota: 10.5m);
        var pres = await presupuestos.CrearAsync(cliente.Id, 30, new List<PresupuestoItem>
        {
            new PresupuestoItem { ArticuloId = art.Id, Cantidad = 1 }
        });

        art.PrecioUnitario = 9999m;
        art.AlicuotaIva = 21m;
        await db.SaveChangesAsync();

        var factura = await fact.FacturarAsync(pres.Id);

        Assert.Equal(4500m, factura.Subtotal);
        Assert.Equal(472.50m, factura.Iva);
        Assert.Equal(4972.50m, factura.Total);
    }

    // ---- Estados ----

    [Fact]
    public async Task Facturar_Borrador_Factura()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow, 30, EstadoPresupuesto.Borrador, (art, 1));

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(EstadoPresupuesto.Facturado, pres.Estado);
        Assert.Equal(9, art.StockActual);
    }

    [Fact]
    public async Task Facturar_Rechazado_RechazaSinEfectos()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow, 30, EstadoPresupuesto.Rechazado, (art, 1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(10, art.StockActual);
        Assert.Equal(0, await db.Facturas.CountAsync());
        Assert.Equal(EstadoPresupuesto.Rechazado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_RechazadoYVencido_InformaRechazado()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.AddDays(-60), 30, EstadoPresupuesto.Rechazado, (art, 1));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Contains("rechaz", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Eliminar_Facturado_RechazaYConservaLaFactura()
    {
        var (db, presupuestos, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, (art, 1));
        await fact.FacturarAsync(pres.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(() => presupuestos.EliminarAsync(pres.Id));

        Assert.True(await db.Presupuestos.AnyAsync(p => p.Id == pres.Id));
        Assert.Equal(1, await db.Facturas.CountAsync());
    }

    [Fact]
    public async Task Eliminar_Borrador_LoElimina()
    {
        var (db, presupuestos, _) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow, 30, EstadoPresupuesto.Borrador, (art, 1));

        await presupuestos.EliminarAsync(pres.Id);

        Assert.False(await db.Presupuestos.AnyAsync(p => p.Id == pres.Id));
    }

    // ---- Validez (dia calendario, UTC) ----

    [Fact]
    public async Task Facturar_Vigente_Factura()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow, 30, EstadoPresupuesto.Aprobado, (art, 1));

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(EstadoPresupuesto.Facturado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_Vencido_RechazaSinEfectos()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.AddDays(-31), 30, EstadoPresupuesto.Aprobado, (art, 1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Equal(10, art.StockActual);
        Assert.Equal(0, await db.Facturas.CountAsync());
    }

    [Fact]
    public async Task Facturar_UltimoDiaDeValidez_Factura()
    {
        // Creado hace 30 dias a las 00:00; hoy es el ultimo dia valido aunque ya pasaron mas de 30*24 horas.
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.Date.AddDays(-30), 30, EstadoPresupuesto.Aprobado, (art, 1));

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(EstadoPresupuesto.Facturado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_DiaSiguienteAlUltimoDeValidez_Rechaza()
    {
        // Creado hace 31 dias a las 23:59; el ultimo dia valido fue ayer.
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var fecha = DateTime.UtcNow.Date.AddDays(-31).AddHours(23).AddMinutes(59);
        var pres = await Escenario.PresupuestoAsync(db, cliente, fecha, 30, EstadoPresupuesto.Aprobado, (art, 1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));
    }

    [Fact]
    public async Task Facturar_ValidezUnDiaCreadoAyer_Factura()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.Date.AddDays(-1), 1, EstadoPresupuesto.Aprobado, (art, 1));

        await fact.FacturarAsync(pres.Id);

        Assert.Equal(EstadoPresupuesto.Facturado, pres.Estado);
    }

    [Fact]
    public async Task Facturar_ValidezUnDiaCreadoHaceDosDias_Rechaza()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.Date.AddDays(-2), 1, EstadoPresupuesto.Aprobado, (art, 1));

        await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));
    }

    [Fact]
    public async Task Facturar_VencidoYYaFacturado_InformaYaFacturado()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.AddDays(-60), 30, EstadoPresupuesto.Facturado, (art, 1));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Contains("facturado", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("vencido", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Facturar_VencidoYSinStock_InformaVencidoYNoTocaStock()
    {
        var (db, _, fact) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 1);
        var pres = await Escenario.PresupuestoAsync(db, cliente, DateTime.UtcNow.AddDays(-60), 30, EstadoPresupuesto.Aprobado, (art, 5));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => fact.FacturarAsync(pres.Id));

        Assert.Contains("vencido", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, art.StockActual);
    }
}
