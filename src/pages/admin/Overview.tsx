import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/languageContext'
import { ApiError, api, type ApiStats } from '../../lib/api'

/**
 * Who owns what, and where.
 *
 * Headline numbers are stat tiles rather than one-bar charts, and each
 * breakdown is a single-series magnitude comparison, so the bars use one hue
 * and carry their own value label instead of a legend.
 */

/** Hex for each launch colour, used only as a small swatch beside its name. */
const SWATCHES: Record<string, string> = {
  White: '#f2f2f0',
  Black: '#1b1b1d',
  Grey: '#8a8d91',
  Silver: '#c7cbd0',
  Green: '#3f5d4a',
  Brown: '#6b4f3a',
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

/**
 * A labelled magnitude list. Bars share one hue because this compares amounts
 * of a single measure rather than distinct series, and every bar is directly
 * labelled so the value never depends on reading the length.
 */
function BarList({
  title,
  rows,
  emptyLabel,
  swatchFor,
}: {
  title: string
  rows: { label: string; count: number }[]
  emptyLabel: string
  swatchFor?: (label: string) => string | undefined
}) {
  const max = Math.max(...rows.map((row) => row.count), 1)

  return (
    <section className="bar-list">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted-note">{emptyLabel}</p>
      ) : (
        <ol>
          {rows.map((row) => {
            const swatch = swatchFor?.(row.label)
            return (
              <li key={row.label} title={`${row.label}: ${row.count}`}>
                <span className="bar-label">
                  {swatch && <i className="bar-swatch" style={{ background: swatch }} aria-hidden />}
                  {row.label}
                </span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} />
                </span>
                <span className="bar-value">{row.count}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export function Overview() {
  const { tx } = useLanguage()
  const [stats, setStats] = useState<ApiStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .stats()
      .then(({ stats: result }) => {
        if (!cancelled) setStats(result)
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : 'Could not load.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="form-error">{error}</p>
  if (!stats) return <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>

  const trimLabels: Record<string, string> = { play: 'Play RWD', wild: 'Wild AWD' }

  /** Drops the "not set" bucket from a breakdown and sorts busiest first. */
  const named = (rows: { value: string | null; count: number }[], label?: (value: string) => string) =>
    rows
      .filter((row): row is { value: string; count: number } => Boolean(row.value))
      .map((row) => ({ label: label?.(row.value) ?? row.value, count: row.count }))
      .sort((a, b) => b.count - a.count)

  const unsetTrim = stats.byTrim.find((row) => row.value === null)?.count ?? 0

  return (
    <div className="admin-overview">
      <div className="stat-row">
        <StatTile label={tx('Accounts', 'الحسابات')} value={stats.total} />
        <StatTile label={tx('New in 30 days', 'جديد خلال 30 يوما')} value={stats.recent} />
        <StatTile label={tx('Published posts', 'مقالات منشورة')} value={stats.approvedPosts} />
        <StatTile label={tx('Corrections waiting', 'تصحيحات منتظرة')} value={stats.pendingSuggestions} />
      </div>

      <div className="bar-grid">
        <BarList
          title={tx('Which trim they own', 'الفئة التي يملكونها')}
          rows={named(stats.byTrim, (value) => trimLabels[value] ?? value)}
          emptyLabel={tx('Nobody has told us yet.', 'لم يخبرنا أحد بعد.')}
        />

        <BarList
          title={tx('Country', 'الدولة')}
          rows={named(stats.byCountry)}
          emptyLabel={tx('Nobody has told us yet.', 'لم يخبرنا أحد بعد.')}
        />

        <BarList
          title={tx('Governorate', 'المحافظة')}
          rows={named(stats.byCity)}
          emptyLabel={tx('Nobody has told us yet.', 'لم يخبرنا أحد بعد.')}
        />

        <BarList
          title={tx('Colour', 'اللون')}
          rows={named(stats.byColour)}
          emptyLabel={tx('Nobody has told us yet.', 'لم يخبرنا أحد بعد.')}
          swatchFor={(label) => SWATCHES[label]}
        />
      </div>

      {unsetTrim > 0 && (
        <p className="muted-note">
          {tx(
            `${unsetTrim} ${unsetTrim === 1 ? 'account has' : 'accounts have'} not said which trim they own.`,
            `${unsetTrim} حساب لم يحدد الفئة التي يملكها.`,
          )}
        </p>
      )}

      <p className="muted-note overview-note">
        {tx(
          'Counts only. Individual details stay on the Accounts page and are never aggregated into anything that identifies someone.',
          'أعداد فقط. بيانات الأفراد تبقى في صفحة الحسابات ولا تُجمع أبدا في شيء يحدد هوية أحد.',
        )}
      </p>
    </div>
  )
}
