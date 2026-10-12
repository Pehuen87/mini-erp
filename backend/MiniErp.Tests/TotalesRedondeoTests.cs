using MiniErp.Core.Models;
using MiniErp.Core.Services;
using Xunit;

namespace MiniErp.Tests;

// Reglas 1 y 2: subtotal por linea y IVA por linea redondeado a 2 decimales
// (MidpointRounding.AwayFromZero). El subtotal de linea tambien se redondea a 2 decimales
// y el IVA se calcula sobre ese subtotal redondeado.
public class TotalesRedondeoTests
{
    private static Totales Calcular(params PresupuestoItem[] items)
    {
        var db = TestDbFactory.Create();
        var service = new PresupuestoService(db, new NumeracionService(db));
        return service.CalcularTotales(new Presupuesto { Items = items.ToList() });
    }

    private static PresupuestoItem Item(int cantidad, decimal precio, decimal descuento, decimal alicuota)
        => new PresupuestoItem { Cantidad = cantidad, PrecioUnitario = precio, DescuentoPct = descuento, AlicuotaIva = alicuota };

    [Fact]
    public void CalcularTotales_Descuento100_TodoEnCero()
    {
        var t = Calcular(Item(5, 200m, 100m, 21m));

        Assert.Equal(0m, t.Subtotal);
        Assert.Equal(0m, t.Iva);
        Assert.Equal(0m, t.Total);
    }

    [Fact]
    public void CalcularTotales_DescuentoConDecimales_DaBien()
    {
        // 3 * 1000 = 3000; -12,5% => 2625; IVA 21% => 551,25.
        var t = Calcular(Item(3, 1000m, 12.5m, 21m));

        Assert.Equal(2625m, t.Subtotal);
        Assert.Equal(551.25m, t.Iva);
        Assert.Equal(3176.25m, t.Total);
    }

    [Fact]
    public void CalcularTotales_PrecioConCentavos_RedondeaIva()
    {
        // 33,33 * 21% = 6,9993 => 7,00.
        var t = Calcular(Item(1, 33.33m, 0m, 21m));

        Assert.Equal(33.33m, t.Subtotal);
        Assert.Equal(7.00m, t.Iva);
        Assert.Equal(40.33m, t.Total);
    }

    [Fact]
    public void CalcularTotales_SinItems_TodoEnCero()
    {
        var t = Calcular();

        Assert.Equal(0m, t.Subtotal);
        Assert.Equal(0m, t.Iva);
        Assert.Equal(0m, t.Total);
    }

    [Fact]
    public void CalcularTotales_AlicuotasMixtasConPreciosDelSeed_DaBien()
    {
        // ART-001 (35.000, 21%) + ART-004 (4.500, 10,5%).
        var t = Calcular(Item(1, 35000m, 0m, 21m), Item(1, 4500m, 0m, 10.5m));

        Assert.Equal(39500m, t.Subtotal);
        Assert.Equal(7822.50m, t.Iva);
        Assert.Equal(47322.50m, t.Total);
    }

    [Fact]
    public void CalcularTotales_Alicuota10_5_RedondeaIvaPorLineaAntesDeSumar()
    {
        // Cada linea: 10,04 * 10,5% = 1,0542 => 1,05. Suma 3,15 (redondeando al final daria 3,16).
        var t = Calcular(Item(1, 10.04m, 0m, 10.5m), Item(1, 10.04m, 0m, 10.5m), Item(1, 10.04m, 0m, 10.5m));

        Assert.Equal(30.12m, t.Subtotal);
        Assert.Equal(3.15m, t.Iva);
        Assert.Equal(33.27m, t.Total);
    }

    [Fact]
    public void CalcularTotales_Alicuota21_RedondeaIvaPorLineaAntesDeSumar()
    {
        // Cada linea: 1,02 * 21% = 0,2142 => 0,21. Suma 0,63 (redondeando al final daria 0,64).
        var t = Calcular(Item(1, 1.02m, 0m, 21m), Item(1, 1.02m, 0m, 21m), Item(1, 1.02m, 0m, 21m));

        Assert.Equal(3.06m, t.Subtotal);
        Assert.Equal(0.63m, t.Iva);
        Assert.Equal(3.69m, t.Total);
    }

    [Fact]
    public void CalcularTotales_IvaEnMitadExacta_RedondeaAlejandoseDeCero()
    {
        // 0,50 * 21% = 0,105 => 0,11 (AwayFromZero; ToEven daria 0,10).
        var t = Calcular(Item(1, 0.50m, 0m, 21m));

        Assert.Equal(0.50m, t.Subtotal);
        Assert.Equal(0.11m, t.Iva);
        Assert.Equal(0.61m, t.Total);
    }

    [Fact]
    public void CalcularTotales_SubtotalDeLinea_SeRedondeaA2Decimales()
    {
        // 33,33 * 0,90 = 29,997 => 30,00; IVA 21% => 6,30.
        var t = Calcular(Item(1, 33.33m, 10m, 21m));

        Assert.Equal(30.00m, t.Subtotal);
        Assert.Equal(6.30m, t.Iva);
        Assert.Equal(36.30m, t.Total);
    }

    [Fact]
    public void CalcularTotales_IvaSeCalculaSobreSubtotalRedondeado()
    {
        // 0,99 * 0,50 = 0,495 => 0,50; IVA 0,50 * 21% = 0,105 => 0,11.
        // (Sobre 0,495 sin redondear daria 0,10395 => 0,10.)
        var t = Calcular(Item(1, 0.99m, 50m, 21m));

        Assert.Equal(0.50m, t.Subtotal);
        Assert.Equal(0.11m, t.Iva);
        Assert.Equal(0.61m, t.Total);
    }
}
