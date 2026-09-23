import type { ReactNode } from 'react'

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

export function PageFrame({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro: ReactNode
  children: ReactNode
}) {
  return (
    <div className="page-frame">
      <div className="page-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {children}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  compact,
}: {
  eyebrow: string
  title: string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'section-heading compact' : 'section-heading'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
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
