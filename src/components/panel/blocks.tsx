import type { ComponentType, ReactNode } from 'react'
import { ArrowUpRight, ChevronDown, Inbox } from 'lucide-react'

/**
 * The small building blocks every panel page is made of: stat cards, cards
 * with a header row, empty states, filter selects and the page intro.
 */

type Icon = ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info'

export function StatCard({
  icon: IconComponent,
  label,
  value,
  tone = 'neutral',
  hint,
  href,
  linkLabel,
}: {
  icon: Icon
  label: string
  /** `null` while loading, which shows a placeholder instead of a zero. */
  value: number | string | null
  tone?: Tone
  hint?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="panel-stat">
      <div className="panel-stat-top">
        <span className={`panel-stat-icon ${tone}`}>
          <IconComponent size={18} aria-hidden="true" />
        </span>
        <span className="panel-stat-label">{label}</span>
      </div>
      {value === null ? <span className="panel-skeleton panel-stat-skeleton" /> : <strong>{value}</strong>}
      {(hint || href) && (
        <div className="panel-stat-foot">
          {hint && <small>{hint}</small>}
          {href && (
            <a href={href}>
              {linkLabel} <ArrowUpRight size={14} aria-hidden="true" className="flip-rtl" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function Card({
  title,
  description,
  action,
  className,
  flush = false,
  children,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  /** Drops the body padding, for tables and lists that run edge to edge. */
  flush?: boolean
  children: ReactNode
}) {
  return (
    <section className={className ? `panel-card ${className}` : 'panel-card'}>
      {(title || action) && (
        <header className="panel-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? 'panel-card-body flush' : 'panel-card-body'}>{children}</div>
    </section>
  )
}

/** A "View all" style link for a card header. */
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="panel-card-link" href={href}>
      {children} <ArrowUpRight size={14} aria-hidden="true" className="flip-rtl" />
    </a>
  )
}

export function EmptyState({
  icon: IconComponent = Inbox,
  title,
  text,
  action,
}: {
  icon?: Icon
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="panel-empty">
      <span className="panel-empty-icon">
        <IconComponent size={26} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
      {action}
    </div>
  )
}

/** Intro line and the main actions of a section, above its content. */
export function PageHeader({ description, actions }: { description?: ReactNode; actions?: ReactNode }) {
  if (!description && !actions) return null
  return (
    <div className="panel-page-head">
      {description && <p>{description}</p>}
      {actions && <div className="panel-page-actions">{actions}</div>}
    </div>
  )
}

export type FilterOption<T extends string> = { value: T; label: string }

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: FilterOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <label className="panel-filter">
      <span className="visually-hidden">{label}</span>
      <span className="queue-filter-select">
        <select value={value} onChange={(event) => onChange(event.target.value as T)} aria-label={label}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </label>
  )
}

/** First letter of a name, for the round avatars in rows and the user card. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`panel-avatar ${size}`} aria-hidden="true">
      {name.trim().slice(0, 1).toUpperCase() || '?'}
    </span>
  )
}

/** A short definition list for record details inside a drawer. */
export function DetailList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  const shown = rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== '')
  return (
    <dl className="panel-details">
      {shown.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
