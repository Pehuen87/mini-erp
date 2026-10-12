using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

// Regla 7: datos validos al crear un presupuesto. Los rechazos son InvalidOperationException
// (el controller ya los traduce a 400) y no deben dejar nada persistido.
public class PresupuestoValidacionTests
{
    private static async Task<(AppDbContext db, PresupuestoService service, Cliente cliente, Articulo art)> Armar()
    {
        var (db, service, _) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        return (db, service, cliente, art);
    }

    private static List<PresupuestoItem> Items(params (Articulo art, int cantidad, decimal descuento)[] items)
        => items.Select(i => new PresupuestoItem { ArticuloId = i.art.Id, Cantidad = i.cantidad, DescuentoPct = i.descuento }).ToList();

    private static async Task AssertNadaPersistido(AppDbContext db)
    {
        Assert.Equal(0, await db.Presupuestos.CountAsync());
        Assert.Equal(0, await db.PresupuestoItems.CountAsync());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Crear_CantidadInvalida_Rechaza(int cantidad)
    {
        var (db, service, cliente, art) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(cliente.Id, 15, Items((art, cantidad, 0m))));

        await AssertNadaPersistido(db);
    }

    [Fact]
    public async Task Crear_CantidadUno_Acepta()
    {
        var (_, service, cliente, art) = await Armar();

        var pres = await service.CrearAsync(cliente.Id, 15, Items((art, 1, 0m)));

        Assert.True(pres.Id > 0);
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(100.01)]
    public async Task Crear_DescuentoFueraDeRango_Rechaza(double descuento)
    {
        var (db, service, cliente, art) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(cliente.Id, 15, Items((art, 1, (decimal)descuento))));

        await AssertNadaPersistido(db);
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(100.0)]
    public async Task Crear_DescuentoEnElLimite_Acepta(double descuento)
    {
        var (_, service, cliente, art) = await Armar();

        var pres = await service.CrearAsync(cliente.Id, 15, Items((art, 1, (decimal)descuento)));

        Assert.True(pres.Id > 0);
    }

    [Fact]
    public async Task Crear_UnItemInvalidoEntreValidos_RechazaTodo()
    {
        var (db, service, cliente, art) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(cliente.Id, 15, Items((art, 1, 0m), (art, 0, 0m), (art, 2, 5m))));

        await AssertNadaPersistido(db);
    }

    [Fact]
    public async Task Crear_SinItems_Rechaza()
    {
        var (db, service, cliente, _) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(cliente.Id, 15, new List<PresupuestoItem>()));

        await AssertNadaPersistido(db);
    }

    [Fact]
    public async Task Crear_ArticuloInexistente_Rechaza()
    {
        var (db, service, cliente, _) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(cliente.Id, 15, new List<PresupuestoItem> { new PresupuestoItem { ArticuloId = 9999, Cantidad = 1 } }));

        await AssertNadaPersistido(db);
    }

    [Fact]
    public async Task Crear_ClienteInexistente_Rechaza()
    {
        var (db, service, _, art) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(9999, 15, Items((art, 1, 0m))));

        await AssertNadaPersistido(db);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Crear_ValidezInvalida_Rechaza(int validezDias)
    {
        var (db, service, cliente, art) = await Armar();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CrearAsync(cliente.Id, validezDias, Items((art, 1, 0m))));

        await AssertNadaPersistido(db);
    }

    [Fact]
    public async Task Crear_ValidezUnDia_Acepta()
    {
        var (_, service, cliente, art) = await Armar();

        var pres = await service.CrearAsync(cliente.Id, 1, Items((art, 1, 0m)));

        Assert.True(pres.Id > 0);
    }

    [Fact]
    public async Task Crear_CantidadMayorAlStock_AceptaYNoTocaElStock()
    {
        // El stock se controla recien al facturar.
        var (_, service, cliente, art) = await Armar();

        var pres = await service.CrearAsync(cliente.Id, 15, Items((art, 50, 0m)));

        Assert.True(pres.Id > 0);
        Assert.Equal(10, art.StockActual);
    }
}
