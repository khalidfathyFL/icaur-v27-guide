import { useEffect, useState } from 'react'
import { ChevronRight, MessageCircleQuestion } from 'lucide-react'
import { getFaqForGuide } from '../../content'
import { useLanguage } from '../../i18n/languageContext'
import { api, apiConfigured, type ApiQuestion } from '../../lib/api'
import { FaqList } from './FaqList'
import { QuestionList } from './QuestionList'

const SHOWN = 5

/**
 * Questions under a guide: the site's own answers that belong to it, then
 * what owners asked about it, with a way to ask one more.
 */
export function GuideQuestions({ slug }: { slug: string }) {
  const { tx } = useLanguage()
  const faq = getFaqForGuide(slug)
  const [community, setCommunity] = useState<{ questions: ApiQuestion[]; total: number } | null>(null)

  useEffect(() => {
    if (!apiConfigured) return
    let cancelled = false
    api
      .listQuestions({ guide: slug, limit: SHOWN })
      .then(({ questions, total }) => {
        if (!cancelled) setCommunity({ questions, total })
      })
      // The guide reads fine without its questions; a failed load just leaves them out.
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [slug])

  if (faq.length === 0 && !apiConfigured) return null

  const askHref = `#/questions?guide=${slug}&ask=1`

  return (
    <section className="info-block guide-questions">
      <h2>
        <MessageCircleQuestion size={20} />
        {tx('Questions about this guide', 'أسئلة عن هذا الدليل')}
      </h2>

      {faq.length > 0 && <FaqList entries={faq} showGuides={false} />}

      {community && community.questions.length > 0 && (
        <>
          <h3>{tx('Asked by owners', 'أسئلة الملاك')}</h3>
          <QuestionList questions={community.questions} showGuide={false} />
          {community.total > community.questions.length && (
            <a className="inline-link" href={`#/questions?guide=${slug}`}>
              {tx(`See all ${community.total}`, `اعرض الكل (${community.total})`)}{' '}
              <ChevronRight size={15} className="flip-rtl" aria-hidden="true" />
            </a>
          )}
        </>
      )}

      {apiConfigured && (
        <p className="guide-questions-ask">
          <span>{tx('Something not covered here?', 'سؤالك غير موجود؟')}</span>
          <a className="secondary-button" href={askHref}>
            {tx('Ask other owners', 'اسأل الملاك')}
          </a>
        </p>
      )}
    </section>
  )
}
