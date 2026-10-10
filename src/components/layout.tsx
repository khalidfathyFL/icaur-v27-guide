import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/**
 * In bilingual mode the Arabic rendering sits under the English one in its own
 * RTL block, instead of being spliced into the same sentence.
 */
export function AltBlock({ children }: { children: ReactNode }) {
  return (
    <div className="alt-lang" dir="rtl" lang="ar">
      {children}
    </div>
  )
}

export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight size={14} className="flip-rtl" aria-hidden="true" />}
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageFrame({
  eyebrow,
  title,
  intro,
  breadcrumbs,
  children,
}: {
  eyebrow: string
  title: string
  intro: ReactNode
  breadcrumbs?: Crumb[]
  children: ReactNode
}) {
  useDocumentTitle(title)

  return (
    <div className="page-frame">
      <div className="page-title">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <div className="page-intro">{intro}</div>}
      </div>
      {children}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  compact,
  action,
}: {
  eyebrow: string
  title: string
  compact?: boolean
  /** Optional link shown at the end of the heading row, e.g. "See all". */
  action?: ReactNode
}) {
  return (
    <div className={compact ? 'section-heading compact' : 'section-heading'}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function InfoBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="info-block">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}
