---
name: erp-ui
description: Mejora visualmente las pantallas de un ERP en un proyecto React existente (listados de presupuestos y facturas, tablas de ítems, subtotales, IVA, totales, fechas, estados) SIN cambiar la lógica ni agregar funcionalidad ni crear archivos — solo markup, orden de campos, formato de valores y CSS existentes. Usar cuando el usuario pida "mostrar los presupuestos en una tabla", "mejorar visualmente la lista de facturas", "que se vean bien los ítems / totales / IVA" o similar.
argument-hint: [pantalla, p. ej. "lista de presupuestos", "alta", "todo"]
---

# UI de ERP: mejorar cómo se ven presupuestos, facturas, ítems y totales

Objetivo: que las pantallas existentes se lean rápido y sin ambigüedad (tablas bien armadas, números
alineados, moneda y fechas con formato, estados reconocibles, totales destacados) **tocando solo la
presentación**. El usuario está desarrollando la funcionalidad: este skill no la cambia.

## Reglas estrictas

**Permitido**
- Reestructurar el **JSX** de los componentes existentes: pasar una lista (`<ul>`, `<p>` sueltos) a una
  `<table>` semántica, agrupar en secciones/tarjetas, agregar encabezados, `<caption>`, `<th scope>`, `<label>`.
- **Mover y reordenar** campos y columnas que ya se muestran (p. ej. Total a la última columna, Estado junto al número).
- **Formatear** valores que ya se muestran: moneda, fechas, porcentajes, cantidades, n.º con ceros a la izquierda,
  estado como badge (mapeo visual del valor que ya existe).
- Agregar `className`, `aria-*`, `title`, `scope`, textos de etiquetas y encabezados.
- Editar **los archivos CSS que ya existen** (`index.css`, `App.css`, `*.module.css`, tokens) para agregar estilos.
- Si hace falta un formateador, declararlo **dentro del mismo archivo** que lo usa (constante con `Intl.NumberFormat`
  / `toLocaleDateString('es-AR')`), sin exportarlo ni crear módulos.

**Prohibido**
- **Crear archivos** (componentes, utils, CSS, tests). Los `assets/` de este skill son referencia para copiar
  fragmentos en archivos existentes, no para agregarlos al proyecto.
- Cambiar **lógica**: estado (`useState`, `useReducer`), efectos, handlers, llamadas a la API, reducers, cálculos,
  validaciones, `alert`s, manejo de errores, navegación entre vistas, props e interfaces, tipos.
- Agregar **funcionalidad**: filtros, búsqueda, orden, paginación, vista de detalle, botones nuevos (quitar,
  imprimir, cancelar…), recarga tras acciones, totales o columnas calculadas que no existan (vencimiento,
  desglose de IVA, suma de la página), KPIs.
- Cambiar qué acciones se muestran o cuándo (si hoy "Facturar" aparece para `Borrador`, sigue igual).
- Tocar el backend, `client.ts`, tipos de la API o dependencias.

Si una mejora visual requiere romper alguna regla (p. ej. mostrar el desglose de IVA necesita un cálculo nuevo),
**no hacerla**: anotarla como sugerencia en el reporte final.

## 1. Relevar

1. Leer los componentes de la pantalla pedida y anotar **qué datos ya se muestran** y en qué orden, qué botones
   existen y bajo qué condición.
2. Ver qué CSS existe (global, módulos, tokens; p. ej. los de `copy-site-styles`) y reutilizar sus variables.
3. Buscar formateos sueltos (`toFixed`, `toLocaleString`, `new Date(`) que se puedan mejorar **en el lugar**.

## 2. Proponer

Mostrar un boceto ASCII corto de cómo quedará cada pantalla con **los mismos datos y acciones**, reordenados.
Ver [references/pantallas.md](references/pantallas.md) como guía de disposición (solo aplicar los elementos
que la pantalla ya tenga).

## 3. Reglas visuales

**Tablas**
- Una fila por registro; encabezados cortos en `<thead>` con `scope="col"`; `<caption>` o `aria-label`.
- Orden de columnas típico: identificador → fecha → cliente/descripción → estado → importes → acciones.
- Numéricas alineadas a la derecha con `font-variant-numeric: tabular-nums`; columna principal se expande.
- Encabezado con fondo suave, separadores finos entre filas, hover de fila, sticky header si la tabla es larga.
- Tabla envuelta en un contenedor con `overflow-x: auto` para pantallas chicas.
- Ítems anidados de un documento (p. ej. ítems de cada presupuesto en un listado): mostrarlos en una sub-tabla
  compacta dentro de una fila de detalle (`<tr><td colSpan>`) o en un `<details>` nativo **sin estado nuevo**.
- Si la tabla tiene inputs (grilla de alta), inputs numéricos angostos y alineados a la derecha.

**Números y moneda**: `$ 1.234,50` (`Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`),
cantidades sin decimales si son enteras, porcentajes `21 %`, descuento `—` si es 0.

**Fechas**: `dd/mm/aaaa`. Las fechas solo-fecha (`2026-10-11` / `…T00:00:00`) se muestran sin corrimiento de zona.

**Estados**: badge con texto + color semántico consistente. Borrador = neutro · Aprobado = azul ·
Facturado = verde · Rechazado = rojo · Eliminado/Anulada = atenuado.

**Identificadores**: n.º con ceros a la izquierda en fuente monoespaciada (`P-000042`, `00000123`).

**Totales**: los valores de subtotal/IVA/total que ya existen, en un panel alineado a la derecha debajo de los
ítems (lista `<dl>`), con el **Total** destacado (más grande, negrita, separador arriba). No agregar líneas nuevas.

**Botones existentes**: jerarquía visual (acción principal sólida, secundarias outline/ghost), en el lugar lógico
(acciones de fila al final de la fila; acción principal de la pantalla arriba a la derecha) sin cambiar su `onClick`.

**Estados de carga/error existentes**: si el componente ya retorna "Loading…" o un error, se pueden estilizar
(contenedor, color, texto en español) sin cambiar cuándo se muestran.

**Accesibilidad**: `<label>` asociados, `aria-label` en inputs de grilla, contraste AA, foco visible.

## 4. Implementar

1. Editar solo los archivos existentes de la pantalla y su CSS. Puede tomarse como referencia
   [assets/erp-ui.css](assets/erp-ui.css) (copiar las reglas necesarias al CSS existente, adaptando variables a los
   tokens del proyecto) y [assets/format.ts](assets/format.ts) (copiar solo el formateador necesario como constante
   local del componente).
2. Mantener intactos nombres de handlers, estado, props, `key`s, condiciones de render y orden de efectos.
3. Revisar el diff antes de terminar: cada línea cambiada debe ser markup, `className`, texto visible, formato de un
   valor ya mostrado o CSS. Si aparece otra cosa, revertirla.

## 5. Verificar

- Correr build, lint y tests del proyecto. No agregar tests nuevos (serían archivos nuevos).
- Si es posible, levantar la app y revisar las tablas con datos reales en desktop y móvil.
- Reportar: qué pantallas cambiaron visualmente, qué campos se movieron, y una lista de **sugerencias no aplicadas**
  porque requerían lógica o funcionalidad nueva (filtros, desglose de IVA, vencimiento, etc.).
