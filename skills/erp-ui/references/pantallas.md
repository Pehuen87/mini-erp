# Pantallas de referencia

Bocetos orientativos de **disposición visual**. Mostrar solo los campos, columnas y acciones que la pantalla
**ya tiene**: elementos como KPIs, filtros, búsqueda, orden, paginación, columna "Vence", desglose de IVA,
fila de totales, vista de detalle, imprimir o quitar ítem son ideas para la sección de **sugerencias** del
reporte, no para implementar (ver "Reglas estrictas" en SKILL.md).

## Lista de presupuestos

```
Presupuestos                                              [+ Nuevo presupuesto]
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Borrador  │ │ Aprobados │ │ Por vencer│ │ Monto apr.│   ← KPIs (opcional, clickeables = filtro)
│    12     │ │     5     │ │     2     │ │ $ 1,2 M   │
└───────────┘ └───────────┘ └───────────┘ └───────────┘
[Buscar cliente o n.º…]  Estado [Todos ▾]  Desde [__/__/____] Hasta [__/__/____]  (Limpiar)

 N.º ↓    Fecha       Cliente                  Vence        Estado       Ítems        Total
 P-0042   11/10/2026  Ferretería López SRL     18/10/2026   [Borrador]       3    $ 242.000,00  ⋯
 P-0041   09/10/2026  Juan Pérez               12/10/2026   [Aprobado]       1     $ 12.100,00  ⋯
                                               ⚠ Vence en 1 día
 P-0039   01/10/2026  Constructora Sur SA      08/10/2026   [Borrador]       8    $ 980.450,50  ⋯
                                               ✖ Vencido
──────────────────────────────────────────────────────────────────────────────────────────
 3 resultados                                                     Total   $ 1.234.550,50
                                                         ‹ 1 2 3 ›   20 por página ▾
```

- Columnas: N.º (mono), Fecha, Cliente (razón social + CUIT en texto secundario opcional), Vence (fecha + aviso),
  Estado (badge), Ítems (cantidad, opcional), Total (derecha), Acciones (menú ⋯ o botones).
- Acciones por estado: Borrador → Editar, Aprobar, Rechazar, Eliminar · Aprobado → Facturar, Ver ·
  Facturado → Ver factura · Rechazado → Eliminar.
- Acciones destructivas con confirmación que nombre el documento ("¿Eliminar el presupuesto P-0042?").
- Filtros reflejados en la URL (`?estado=aprobado&desde=…`) para poder compartir/volver.
- Fila clickeable → detalle (el menú de acciones detiene la propagación del click).

## Detalle de presupuesto

```
← Presupuestos
Presupuesto P-0042   [Borrador]                         [Editar] [Aprobar] [Imprimir]
─────────────────────────────────────────────────────────────────────────────────────
Cliente                          Fecha        11/10/2026
Ferretería López SRL             Validez      7 días
CUIT 30-71234567-9               Vence        18/10/2026  (en 7 días)
Responsable Inscripto

 #  Código   Descripción                   Cant.   P. unit.     Desc.   IVA      Importe
 1  TOR-08   Tornillo 8mm x 100u              10   $ 1.500,00    10 %   21 %   $ 13.500,00
 2  MAR-01   Martillo carpintero               2  $ 12.000,00     —     21 %   $ 24.000,00
 3  LIB-03   Manual de uso                     1   $ 5.000,00     —   10,5 %    $ 5.000,00
                                                         ┌────────────────────────────────┐
                                                         │ Subtotal            $ 42.500,00 │
                                                         │ IVA 21 %             $ 7.875,00 │
                                                         │ IVA 10,5 %             $ 525,00 │
                                                         │ ─────────────────────────────── │
                                                         │ Total               $ 50.900,00 │
                                                         └────────────────────────────────┘
Observaciones: Entrega en obra.
```

- "Importe" de ítem = neto de la línea (cant × precio − descuento), sin IVA; aclararlo en el encabezado si es ambiguo
  ("Importe neto"). Si el proyecto muestra con IVA, rotular "Importe c/IVA".
- Descuento "—" cuando es 0 (menos ruido que "0 %").
- Panel de totales: una línea de IVA por alícuota presente; si hay descuento global, línea "Descuento −$ X" antes del IVA.
- Historial de estados (opcional): línea de tiempo pequeña al pie ("Creado 11/10 · Aprobado 12/10 por …").

## Alta / edición de presupuesto (presentación)

- Cabecera: selector de cliente con búsqueda (mostrar razón social + CUIT + condición IVA), fecha, validez.
- Grilla de ítems editable: selector de artículo con búsqueda por código/descripción, cantidad, precio (prellenado),
  descuento, IVA (solo lectura si viene del artículo), importe calculado, botón quitar. Fila "+ Agregar ítem".
- Panel de totales fijo/sticky a la derecha o abajo que se recalcula en vivo.
- Validaciones inline junto al campo (cantidad > 0, descuento 0–100); botón Guardar deshabilitado con motivo visible.
- Advertencia no bloqueante si la cantidad supera el stock ("Stock disponible: 4").

## Lista de facturas

```
 Tipo  Comprobante       Fecha       Cliente               Presup.   Estado      Neto         IVA          Total
 [A]   00001-00000123    11/10/2026  Ferretería López SRL  P-0040    [Emitida]   $ 42.500,00  $ 8.400,00   $ 50.900,00
 [B]   00001-00000122    10/10/2026  Juan Pérez            P-0038    [Emitida]   $ 10.000,00  $ 2.100,00   $ 12.100,00
 [A]   00001-00000121    05/10/2026  Constructora Sur SA   —         [Anulada]  ~~$ 9.000,00~~ …
────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Totales del período                                                  $ 52.500,00  $ 10.500,00  $ 63.000,00
```

- Neto e IVA en columnas separadas (útil para control de IVA ventas); en móvil solo Total.
- "Presup." enlaza al presupuesto de origen. Anuladas atenuadas y excluidas del total (aclararlo en el pie).
- Si hay cobros: columna Saldo y badge Pendiente / Parcial / Pagada; saldo > 0 vencido en rojo.

## Detalle / impresión de factura

```
┌───────────────────────────────────────┬───┬──────────────────────────────────────┐
│ MI EMPRESA SA                         │ A │ FACTURA                              │
│ Domicilio · CUIT 30-…                 │   │ N.º 00001-00000123                   │
│ IVA Responsable Inscripto             │   │ Fecha 11/10/2026                     │
├───────────────────────────────────────┴───┴──────────────────────────────────────┤
│ Cliente: Ferretería López SRL   CUIT 30-71234567-9   Resp. Inscripto             │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ítems (igual que el detalle de presupuesto)                                      │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                              Subtotal / IVA por alícuota / TOTAL │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- La letra del comprobante va en un recuadro centrado en la cabecera.
- Vista de impresión con `@media print`: ocultar navegación y botones, fondo blanco, tipografía 10–11pt,
  `thead` repetido en cada página, evitar cortar filas (`break-inside: avoid`).
- Datos fiscales reales (CAE, etc.) solo si la API los provee; no inventarlos.

## Panel / KPIs (opcional)

- Tarjetas: presupuestos en borrador, aprobados sin facturar (monto), por vencer esta semana, facturado del mes (neto/IVA/total).
- Montos grandes abreviados en KPIs (`$ 1,2 M`) con valor exacto en tooltip; nunca abreviar en tablas ni documentos.
- Si se agregan gráficos (facturación por mes, por cliente), cargar el skill `dataviz` primero.
