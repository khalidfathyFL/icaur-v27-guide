import { Video as VideoIcon } from 'lucide-react'
import { glossary, reviews, sources, videos } from '../content'
import { AltBlock, PageFrame } from '../components/layout'
import { useLanguage } from '../i18n/languageContext'
import { sourceHref } from '../lib/links'

export function ReviewsPage() {
  const { t, list, tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Reviews', 'المراجعات')}
      title={tx(
        'Road Tests, Owner Feedback, and Watchouts',
        'اختبارات القيادة وتجارب الملاك ونقاط الانتباه',
      )}
      intro={tx(
        'These cards summarize public reviews and owner discussions in English and Arabic. They are buying context, not Egypt trim confirmation.',
        'هذه البطاقات تلخص مراجعات ونقاشات ملاك بالإنجليزية والعربية. هي سياق للشراء وليست تأكيدا لتجهيزات مصر.',
      )}
    >
      <div className="review-grid">
        {reviews.map((review) => (
          <a className="review-card" href={review.url} target="_blank" rel="noreferrer" key={review.id}>
            <div className="review-card-top">
              <span>{review.outlet}</span>
              <small>
                {review.market} · {review.language} · {review.date}
              </small>
            </div>
            <h2>{review.title}</h2>
            <p>{t(review.verdict)}</p>
            <div className="review-columns">
              <div>
                <strong>{tx('Strengths', 'نقاط القوة')}</strong>
                <ul>
                  {list(review.positives).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>{tx('Watchouts', 'نقاط الانتباه')}</strong>
                <ul>
                  {list(review.watchouts).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </a>
        ))}
      </div>
    </PageFrame>
  )
}

export function VideosPage() {
  const { tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Videos', 'الفيديوهات')}
      title={tx('Video Library For Research', 'مكتبة فيديوهات للبحث والتحقق')}
      intro={tx(
        'Videos are research references. Each card keeps the shown market so China or export features are not mixed with Egypt equipment.',
        'الفيديوهات مراجع بحث مع حفظ السوق الظاهر داخل كل بطاقة.',
      )}
    >
      <div className="video-grid">
        {videos.map((video) => (
          <a className="video-card" href={video.url} target="_blank" rel="noreferrer" key={video.id}>
            <VideoIcon size={20} />
            <strong>{video.title}</strong>
            <span>
              {video.platform} - {video.language}
            </span>
            <small>{video.marketShown}</small>
            <p>{video.notes}</p>
          </a>
        ))}
      </div>
    </PageFrame>
  )
}

export function SourcesPage() {
  const { tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Sources', 'المصادر')}
      title={tx('Source and Verification Log', 'سجل المصادر والتحقق')}
      intro={tx(
        'Every guide fact should connect to a source, market, and checked date.',
        'أي معلومة في الأدلة يجب أن ترتبط بمصدر وسوق وتاريخ مراجعة.',
      )}
    >
      <div className="source-list full">
        {sources.map((source) => (
          <a key={source.id} href={sourceHref(source.url)} target="_blank" rel="noreferrer">
            <strong>{source.title}</strong>
            <span>
              {source.market} - checked {source.checked}
            </span>
            <small>{source.url}</small>
          </a>
        ))}
      </div>
    </PageFrame>
  )
}

export function GlossaryPage() {
  const { t, alt, tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Glossary', 'القاموس')}
      title={tx('English / Arabic Terms', 'مصطلحات إنجليزي / عربي')}
      intro={tx(
        'A quick glossary so owners, sales, and service teams use the same language.',
        'قاموس سريع لتوحيد اللغة بين المالك والمبيعات والخدمة.',
      )}
    >
      <div className="glossary-grid">
        {glossary.map((entry) => {
          const definitionAlt = alt(entry.definition)
          return (
            <div key={entry.term}>
              <strong>{entry.term}</strong>
              <p>{t(entry.definition)}</p>
              {definitionAlt && (
                <AltBlock>
                  <p>{definitionAlt}</p>
                </AltBlock>
              )}
            </div>
          )
        })}
      </div>
    </PageFrame>
  )
}

export function NotFoundPage() {
  const { tx } = useLanguage()

  return (
    <PageFrame
      eyebrow="404"
      title={tx('Page Not Found', 'الصفحة غير موجودة')}
      intro={tx('This link does not exist in the current version.', 'الرابط غير موجود في النسخة الحالية.')}
    >
      <a className="primary-action" href="#/guides">
        {tx('Back to Guides', 'ارجع إلى الأدلة')}
      </a>
    </PageFrame>
  )
}
