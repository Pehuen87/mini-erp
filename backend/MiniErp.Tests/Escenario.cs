using MiniErp.Core.Data;
using MiniErp.Core.Models;
using MiniErp.Core.Services;

namespace MiniErp.Tests;

/// <summary>
/// Helpers para armar datos de prueba sobre la base en memoria de <see cref="TestDbFactory"/>.
/// </summary>
internal static class Escenario
{
    public static (AppDbContext db, PresupuestoService presupuestos, FacturacionService facturacion) Armar()
    {
        var db = TestDbFactory.Create();
        var numeracion = new NumeracionService(db);
        var presupuestos = new PresupuestoService(db, numeracion);
        return (db, presupuestos, new FacturacionService(db, presupuestos, numeracion));
    }

    public static async Task<Cliente> ClienteAsync(AppDbContext db)
    {
        var cliente = new Cliente { RazonSocial = "Cliente Test", Cuit = "20-00000000-0", CondicionIva = CondicionIva.ResponsableInscripto };
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        return cliente;
    }

    public static async Task<Articulo> ArticuloAsync(AppDbContext db, int stock, decimal precio = 100m, decimal alicuota = 21m)
    {
        var art = new Articulo
        {
            Codigo = $"A{db.Articulos.Count() + 1}",
            Descripcion = "Articulo",
            PrecioUnitario = precio,
            StockActual = stock,
            AlicuotaIva = alicuota
        };
        db.Articulos.Add(art);
        await db.SaveChangesAsync();
        return art;
    }

    /// <summary>Presupuesto Aprobado, de hoy, con 30 dias de validez.</summary>
    public static Task<Presupuesto> PresupuestoAsync(AppDbContext db, Cliente cliente, params (Articulo art, int cantidad)[] items)
        => PresupuestoAsync(db, cliente, DateTime.UtcNow, 30, EstadoPresupuesto.Aprobado, items);

    public static async Task<Presupuesto> PresupuestoAsync(
        AppDbContext db, Cliente cliente, DateTime fecha, int validezDias, EstadoPresupuesto estado,
        params (Articulo art, int cantidad)[] items)
    {
        var pres = new Presupuesto
        {
            Numero = db.Presupuestos.Count() + 1,
            Fecha = fecha,
            ClienteId = cliente.Id,
            ValidezDias = validezDias,
            Estado = estado,
            Items = items.Select(i => new PresupuestoItem
            {
                ArticuloId = i.art.Id,
                Cantidad = i.cantidad,
                PrecioUnitario = i.art.PrecioUnitario,
                AlicuotaIva = i.art.AlicuotaIva
            }).ToList()
        };
        db.Presupuestos.Add(pres);
        await db.SaveChangesAsync();
        return pres;
    }
}
