using Microsoft.EntityFrameworkCore;
using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

// Regla 6: numeros de presupuesto secuenciales, sin colisiones y sin reutilizar numeros borrados.
public class NumeracionTests
{
    private static async Task<(PresupuestoService service, Func<Task<Presupuesto>> crear)> Armar()
    {
        var (db, service, _) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);
        return (service, () => service.CrearAsync(cliente.Id, 15, new List<PresupuestoItem>
        {
            new PresupuestoItem { ArticuloId = art.Id, Cantidad = 1 }
        }));
    }

    [Fact]
    public async Task Crear_Varios_NumeraSecuencialmenteDesdeUno()
    {
        var (_, crear) = await Armar();

        var p1 = await crear();
        var p2 = await crear();
        var p3 = await crear();

        Assert.Equal(new[] { 1, 2, 3 }, new[] { p1.Numero, p2.Numero, p3.Numero });
    }

    [Fact]
    public async Task Crear_TrasBorrarElUltimo_NoReutilizaElNumero()
    {
        var (service, crear) = await Armar();
        await crear();
        var p2 = await crear();
        await service.EliminarAsync(p2.Id);

        var p3 = await crear();

        Assert.Equal(3, p3.Numero);
    }

    [Fact]
    public async Task Crear_TrasBorrarUnoDelMedio_NoColisiona()
    {
        var (service, crear) = await Armar();
        await crear();
        var p2 = await crear();
        await crear();
        await service.EliminarAsync(p2.Id);

        var p4 = await crear();

        Assert.Equal(4, p4.Numero);
    }

    [Fact]
    public async Task Crear_TrasBorrarElPrimero_NoColisiona()
    {
        var (service, crear) = await Armar();
        var p1 = await crear();
        await crear();
        await service.EliminarAsync(p1.Id);

        var p3 = await crear();

        Assert.Equal(3, p3.Numero);
    }

    [Fact]
    public async Task Crear_TrasBorrarTodos_ContinuaLaSecuencia()
    {
        var (service, crear) = await Armar();
        var creados = new[] { await crear(), await crear(), await crear() };
        foreach (var p in creados)
            await service.EliminarAsync(p.Id);

        var nuevo = await crear();

        Assert.Equal(4, nuevo.Numero);
    }

    [Fact]
    public async Task Crear_FallidoNoConsumeNumero()
    {
        var (db, service, _) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        var art = await Escenario.ArticuloAsync(db, stock: 10);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CrearAsync(cliente.Id, 15,
            new List<PresupuestoItem> { new PresupuestoItem { ArticuloId = 9999, Cantidad = 1 } }));
        var pres = await service.CrearAsync(cliente.Id, 15,
            new List<PresupuestoItem> { new PresupuestoItem { ArticuloId = art.Id, Cantidad = 1 } });

        Assert.Equal(1, pres.Numero);
    }

    [Fact]
    public async Task Base_NumeroDuplicado_LoRechaza()
    {
        var (db, _, _) = Escenario.Armar();
        var cliente = await Escenario.ClienteAsync(db);
        db.Presupuestos.Add(new Presupuesto { Numero = 7, Fecha = DateTime.UtcNow, ClienteId = cliente.Id, ValidezDias = 15 });
        await db.SaveChangesAsync();

        db.Presupuestos.Add(new Presupuesto { Numero = 7, Fecha = DateTime.UtcNow, ClienteId = cliente.Id, ValidezDias = 15 });

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }
}
