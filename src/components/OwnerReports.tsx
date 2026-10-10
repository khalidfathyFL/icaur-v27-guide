import { AlertTriangle, MessageSquareWarning, Settings2, Wrench } from 'lucide-react'
import { AltBlock, SectionHeading } from './layout'
import { OWNER_REPORT_KINDS, ownerReports, type OwnerReportKind } from '../content/ownerReports'
import { useLanguage } from '../i18n/languageContext'

const ICONS: Record<OwnerReportKind, typeof Wrench> = {
  behaviour: Settings2,
  service: Wrench,
  software: MessageSquareWarning,
  issue: AlertTriangle,
}

/**
 * What owners have worked out in use.
 *
 * Kept visually distinct from the launch and manufacturer data above it:
 * these are consistent reports from people driving the car in Egypt, not
 * statements from GB Auto, and the page says so rather than blurring the two.
 */
export function OwnerReports() {
  const { t, alt, pair, tx } = useLanguage()

  return (
    <section className="owner-reports">
      <SectionHeading
        eyebrow={tx('From owners', 'من الملاك')}
        title={tx('What Owners Have Worked Out', 'ما توصل إليه الملاك')}
      />

      <p className="owner-reports-intro">
        {tx(
          'Consistent reports from owners driving the V27 in Egypt. These are not statements from the distributor, and they are kept separate from the launch data above for that reason.',
          'ملاحظات متكررة من ملاك يقودون V27 في مصر. هذه ليست تصريحات من الوكيل، ولهذا السبب نفصلها عن بيانات الإطلاق بالأعلى.',
        )}
      </p>

      {OWNER_REPORT_KINDS.map((kind) => {
        const items = ownerReports.filter((report) => report.kind === kind.id)
        if (items.length === 0) return null
        const Icon = ICONS[kind.id]

        return (
          <div className="owner-report-group" key={kind.id}>
            <h3>
              <Icon size={17} />
              {pair(kind.name)}
            </h3>

            <div className="owner-report-list">
              {items.map((report) => {
                const detailAlt = alt(report.detail)
                return (
                  <article
                    className={report.kind === 'issue' ? 'owner-report issue' : 'owner-report'}
                    key={report.id}
                  >
                    <header>
                      <strong>{pair(report.title)}</strong>
                      <small>{report.asOf}</small>
                    </header>
                    <p>{t(report.detail)}</p>
                    {detailAlt && (
                      <AltBlock>
                        <p>{detailAlt}</p>
                      </AltBlock>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
