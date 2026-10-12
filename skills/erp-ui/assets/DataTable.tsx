// REFERENCIA de estructura de tabla. No agregar este archivo al proyecto: usar su markup/clases como guía
// al reestructurar el JSX existente (el skill erp-ui no crea archivos ni agrega funcionalidad).

import { useMemo, useState, type ReactNode } from 'react';

export type Align = 'left' | 'right' | 'center';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Contenido de la celda. */
  cell: (row: T) => ReactNode;
  /** Valor para ordenar; si falta, la columna no es ordenable. */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  align?: Align;
  /** Columna numérica: alinea a la derecha y usa cifras tabulares. */
  numeric?: boolean;
  /** Contenido del pie (p. ej. total de la columna). */
  footer?: ReactNode;
  width?: string;
  className?: string;
}

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  caption?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Texto a la izquierda del pie, p. ej. "3 resultados". */
  footerLabel?: ReactNode;
}

const cmp = (a: unknown, b: unknown): number => {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
};

export function DataTable<T>(props: DataTableProps<T>) {
  const { columns, rows, rowKey, caption, loading, error, onRetry, empty, onRowClick, rowClassName, footerLabel } = props;
  const [innerSort, setInnerSort] = useState<SortState>(props.defaultSort ?? null);
  const controlled = props.onSortChange !== undefined;
  const sort = controlled ? props.sort ?? null : innerSort;

  const sorted = useMemo(() => {
    if (controlled || !sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => factor * cmp(col.sortValue!(a), col.sortValue!(b)));
  }, [rows, columns, sort, controlled]);

  const toggleSort = (key: string) => {
    const next: SortState = sort?.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' };
    if (controlled) props.onSortChange!(next);
    else setInnerSort(next);
  };

  const alignOf = (c: Column<T>): Align => c.align ?? (c.numeric ? 'right' : 'left');
  const cellClass = (c: Column<T>) =>
    [`erp-cell--${alignOf(c)}`, c.numeric && 'erp-num', c.className].filter(Boolean).join(' ');
  const hasFooter = footerLabel != null || columns.some((c) => c.footer != null);

  let body: ReactNode;
  if (loading) {
    body = Array.from({ length: 5 }, (_, i) => (
      <tr key={i} className="erp-row--skeleton" aria-hidden="true">
        {columns.map((c) => <td key={c.key}><span className="erp-skeleton" /></td>)}
      </tr>
    ));
  } else if (error) {
    body = (
      <tr><td colSpan={columns.length} className="erp-table__message erp-table__message--error" role="alert">
        {error} {onRetry && <button type="button" className="erp-link" onClick={onRetry}>Reintentar</button>}
      </td></tr>
    );
  } else if (sorted.length === 0) {
    body = <tr><td colSpan={columns.length} className="erp-table__message">{empty ?? 'No hay datos para mostrar.'}</td></tr>;
  } else {
    body = sorted.map((row) => (
      <tr
        key={rowKey(row)}
        className={[onRowClick && 'erp-row--clickable', rowClassName?.(row)].filter(Boolean).join(' ') || undefined}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
      >
        {columns.map((c) => <td key={c.key} className={cellClass(c)}>{c.cell(row)}</td>)}
      </tr>
    ));
  }

  return (
    <div className="erp-table-wrap">
      <table className="erp-table" aria-busy={loading || undefined}>
        {caption && <caption className="erp-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={cellClass(c)}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortValue ? (
                    <button type="button" className="erp-sort" onClick={() => toggleSort(c.key)}>
                      {c.header}
                      <span className="erp-sort__icon" aria-hidden="true">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{body}</tbody>
        {hasFooter && !loading && !error && sorted.length > 0 && (
          <tfoot>
            <tr>
              {columns.map((c, i) => (
                <td key={c.key} className={cellClass(c)}>
                  {i === 0 && footerLabel != null && c.footer == null ? footerLabel : c.footer}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Badge de estado. `tone` mapea a colores semánticos de erp-ui.css. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'muted';

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`erp-badge erp-badge--${tone}`}>{children}</span>;
}

/** Panel de totales de un documento. Las líneas vienen calculadas (idealmente de la API). */
export function TotalsPanel({ lines, total, totalLabel = 'Total' }: {
  lines: { label: ReactNode; value: ReactNode; negative?: boolean }[];
  total: ReactNode;
  totalLabel?: ReactNode;
}) {
  return (
    <dl className="erp-totals">
      {lines.map((l, i) => (
        <div key={i} className={l.negative ? 'erp-totals__row erp-negative' : 'erp-totals__row'}>
          <dt>{l.label}</dt><dd className="erp-num">{l.value}</dd>
        </div>
      ))}
      <div className="erp-totals__row erp-totals__total">
        <dt>{totalLabel}</dt><dd className="erp-num">{total}</dd>
      </div>
    </dl>
  );
}
