import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useShortText } from '../../i18n/languageContext'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** A CSS grid track, e.g. `minmax(0, 2fr)` or `120px`. Defaults to an equal share. */
  width?: string
  align?: 'start' | 'end'
}

const PAGE_SIZE = 12

/**
 * The panel's list view: a toolbar (count, search, filters, actions), rows
 * laid out on a CSS grid, and a pager. Below 720px each row becomes a card
 * with its column names as labels, so nothing scrolls sideways on a phone.
 *
 * `rows` is null while loading. Searching is done here over `searchText`;
 * filters belong to the caller, who passes rows already filtered.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder,
  filters,
  actions,
  onRowClick,
  empty,
  error,
  pageSize = PAGE_SIZE,
}: {
  rows: T[] | null
  columns: Column<T>[]
  rowKey: (row: T) => string
  searchText?: (row: T) => string
  searchPlaceholder?: string
  filters?: ReactNode
  actions?: ReactNode
  onRowClick?: (row: T) => void
  empty: ReactNode
  error?: string | null
  pageSize?: number
}) {
  const tx = useShortText()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const needle = query.trim().toLowerCase()
  const matching = rows && searchText && needle ? rows.filter((row) => searchText(row).toLowerCase().includes(needle)) : rows
  const total = matching?.length ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  // A filter change can shrink the list under the current page.
  const current = Math.min(page, pageCount)
  const shown = matching?.slice((current - 1) * pageSize, current * pageSize) ?? []

  const template = { gridTemplateColumns: columns.map((column) => column.width ?? 'minmax(0, 1fr)').join(' ') } as CSSProperties

  /** Buttons and links inside a row do their own thing rather than opening the row. */
  const fromControl = (event: MouseEvent | KeyboardEvent) =>
    (event.target as HTMLElement).closest('button, a, input, select, label, textarea') !== null

  return (
    <div className="panel-table">
      <div className="panel-table-toolbar">
        <span className="panel-table-count">
          {rows === null ? tx('Loading…', 'جارٍ التحميل…') : tx(`${total} ${total === 1 ? 'result' : 'results'}`, `${total} نتيجة`)}
        </span>
        <div className="panel-table-tools">
          {searchText && (
            <label className="panel-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder={searchPlaceholder ?? tx('Search…', 'بحث…')}
                aria-label={searchPlaceholder ?? tx('Search', 'بحث')}
              />
            </label>
          )}
          {filters}
          {actions}
        </div>
      </div>

      {error && <p className="form-error panel-table-error">{error}</p>}

      <div className="panel-table-grid" role="table">
        <div className="panel-table-row head" role="row" style={template}>
          {columns.map((column) => (
            <span role="columnheader" key={column.key} className={column.align === 'end' ? 'end' : undefined}>
              {column.header}
            </span>
          ))}
        </div>

        {rows === null &&
          Array.from({ length: 4 }, (_, index) => (
            <div className="panel-table-row" role="row" style={template} key={`skeleton-${index}`}>
              {columns.map((column) => (
                <span role="cell" key={column.key}>
                  <span className="panel-skeleton" />
                </span>
              ))}
            </div>
          ))}

        {shown.map((row) => (
          <div
            className={onRowClick ? 'panel-table-row clickable' : 'panel-table-row'}
            role="row"
            style={template}
            key={rowKey(row)}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={(event) => {
              if (onRowClick && !fromControl(event)) onRowClick(row)
            }}
            onKeyDown={(event) => {
              if (onRowClick && event.key === 'Enter' && !fromControl(event)) onRowClick(row)
            }}
          >
            {columns.map((column) => (
              <span
                role="cell"
                key={column.key}
                data-label={column.header}
                className={column.align === 'end' ? 'end' : undefined}
              >
                {column.render(row)}
              </span>
            ))}
          </div>
        ))}
      </div>

      {rows !== null && total === 0 && !error && empty}

      {pageCount > 1 && (
        <nav className="panel-pager" aria-label={tx('Pages', 'الصفحات')}>
          <span>
            {tx(
              `Showing ${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} of ${total}`,
              `عرض ${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} من ${total}`,
            )}
          </span>
          <div>
            <button
              type="button"
              className="panel-icon-button"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label={tx('Previous page', 'الصفحة السابقة')}
            >
              <ChevronLeft size={16} className="flip-rtl" />
            </button>
            {pageNumbers(current, pageCount).map((number, index) =>
              number === null ? (
                <span className="panel-pager-gap" key={`gap-${index}`}>
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={number}
                  className={number === current ? 'panel-pager-page active' : 'panel-pager-page'}
                  aria-current={number === current ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              className="panel-icon-button"
              disabled={current === pageCount}
              onClick={() => setPage(current + 1)}
              aria-label={tx('Next page', 'الصفحة التالية')}
            >
              <ChevronRight size={16} className="flip-rtl" />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

/** First, last, and the current page with one neighbour each side; `null` marks a gap. */
function pageNumbers(current: number, count: number): (number | null)[] {
  const wanted = new Set([1, count, current - 1, current, current + 1].filter((n) => n >= 1 && n <= count))
  const sorted = [...wanted].sort((a, b) => a - b)
  const result: (number | null)[] = []
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) result.push(null)
    result.push(n)
  })
  return result
}
