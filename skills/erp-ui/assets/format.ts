// Formateadores de presentación para UI de ERP (es-AR). REFERENCIA: copiar solo la función necesaria
// como constante local dentro del componente existente; no agregar este archivo al proyecto.

const LOCALE = 'es-AR';
const TZ = 'America/Argentina/Buenos_Aires';

const moneyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1 });
const qtyFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });
const pctFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** $ 1.234,50 — usar en tablas y documentos. */
export const formatMoney = (n: number | null | undefined): string => (n == null ? '—' : moneyFmt.format(n));

/** $ 1,2 M — solo para KPIs (mostrar el valor exacto en un tooltip). */
export const formatMoneyCompact = (n: number): string => compactFmt.format(n);

/** 3 · 2,5 */
export const formatQty = (n: number): string => qtyFmt.format(n);

/** 21 % · 10,5 % · "—" si es 0 y se pide ocultar ceros (útil en columna Descuento). */
export const formatPct = (n: number, { dashIfZero = false } = {}): string =>
  dashIfZero && n === 0 ? '—' : `${pctFmt.format(n)} %`;

/**
 * Parsea "2026-10-11" o "2026-10-11T00:00:00" como fecha LOCAL (sin corrimiento a UTC,
 * que mostraría el día anterior). Con zona explícita (Z / ±hh:mm) respeta el instante.
 */
export function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.0+)?)?)?$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

/** 11/10/2026 */
export const formatDate = (value: string | Date | null | undefined): string =>
  value == null ? '—' : parseDate(value).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });

/** 11/10/2026 14:30 */
export const formatDateTime = (value: string | Date): string =>
  parseDate(value).toLocaleString(LOCALE, { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Hoy (fecha local, sin hora). */
export function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(value: string | Date, days: number): Date {
  const d = parseDate(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

const DAY = 86_400_000;

export type Vencimiento =
  | { estado: 'vigente'; dias: number; texto: string }
  | { estado: 'porVencer'; dias: number; texto: string }
  | { estado: 'vencido'; dias: number; texto: string };

/** Estado visual de un vencimiento. El último día es válido. `umbral` = días para "por vencer". */
export function vencimiento(fechaVence: string | Date, umbral = 3, hoy: Date = today()): Vencimiento {
  const v = parseDate(fechaVence);
  const vence = new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const dias = Math.round((vence.getTime() - hoy.getTime()) / DAY);
  if (dias < 0) return { estado: 'vencido', dias, texto: `Vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}` };
  if (dias === 0) return { estado: 'porVencer', dias, texto: 'Vence hoy' };
  if (dias <= umbral) return { estado: 'porVencer', dias, texto: `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}` };
  return { estado: 'vigente', dias, texto: `En ${dias} días` };
}

/** 20-12345678-6 */
export function formatCuit(cuit: string): string {
  const d = cuit.replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : cuit;
}

/** 00001-00000042 (factura) o P-000042 (presupuesto: pasar prefijo y sin punto de venta). */
export function formatNumeroComprobante(numero: number, opts: { puntoVenta?: number; prefijo?: string; digitos?: number } = {}): string {
  const { puntoVenta, prefijo, digitos = puntoVenta != null ? 8 : 6 } = opts;
  const n = String(numero).padStart(digitos, '0');
  if (puntoVenta != null) return `${String(puntoVenta).padStart(5, '0')}-${n}`;
  return prefijo ? `${prefijo}-${n}` : n;
}

/** Suma segura para pies de tabla (evita 0.1 + 0.2 = 0.30000000000000004). */
export const sumMoney = (values: number[]): number =>
  values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;

/** "1 resultado" / "3 resultados" */
export const plural = (n: number, singular: string, pluralForm = `${singular}s`): string =>
  `${n} ${n === 1 ? singular : pluralForm}`;
