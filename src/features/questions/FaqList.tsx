import { ChevronDown, ChevronRight } from 'lucide-react'
import { getFeatures, type FaqEntry } from '../../content'
import { AltBlock } from '../../components/layout'
import { useLanguage } from '../../i18n/languageContext'
import { guideHref } from '../../lib/links'

/**
 * The site's own answers, as a list of questions that open in place. Native
 * <details> keeps them working with the keyboard and readable without script.
 */
export function FaqList({ entries, showGuides = true }: { entries: FaqEntry[]; showGuides?: boolean }) {
  return (
    <div className="faq-list">
      {entries.map((entry) => (
        <FaqItem key={entry.id} entry={entry} showGuides={showGuides} />
      ))}
    </div>
  )
}

function FaqItem({ entry, showGuides }: { entry: FaqEntry; showGuides: boolean }) {
  const { t, alt } = useLanguage()
  const questionAlt = alt(entry.question)
  const answerAlt = alt(entry.answer)
  const guides = showGuides ? getFeatures(entry.guides ?? []) : []
  const links = [
    ...guides.map((feature) => ({ href: guideHref(feature.slug), label: feature.name })),
    ...(entry.links ?? []),
  ]

  return (
    <details className="faq-item" id={`faq-${entry.id}`}>
      <summary>
        <span>
          {t(entry.question)}
          {questionAlt && (
            <span className="faq-question-alt" dir="rtl" lang="ar">
              {questionAlt}
            </span>
          )}
        </span>
        <ChevronDown size={18} className="faq-chevron" aria-hidden="true" />
      </summary>
      <div className="faq-answer">
        <p>{t(entry.answer)}</p>
        {answerAlt && (
          <AltBlock>
            <p>{answerAlt}</p>
          </AltBlock>
        )}
        {links.length > 0 && (
          <p className="faq-links">
            {links.map((link) => (
              <a key={link.href} className="inline-link" href={link.href}>
                {t(link.label)} <ChevronRight size={15} className="flip-rtl" aria-hidden="true" />
              </a>
            ))}
          </p>
        )}
      </div>
    </details>
  )
}
