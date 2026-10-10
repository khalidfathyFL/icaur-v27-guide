import { BookOpen, ChevronRight, MonitorSmartphone, Search } from 'lucide-react'
import { POPULAR_SLUGS, featuresByCategory, features, getFeatures, imageUrls } from '../content'
import { CategoryIcon } from '../components/CategoryIcon'
import { FeatureGrid } from '../components/FeatureGrid'
import { SectionHeading } from '../components/layout'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { TrimSwitch } from '../components/SiteHeader'
import { VerificationLegend } from '../components/VerificationBadge'
import { useSearch } from '../features/search/searchContext'
import { useLanguage, useShortText } from '../i18n/languageContext'
import { guideHref } from '../lib/links'

/** The four questions asked most at the car, shown as one-tap shortcuts under the search. */
const QUICK_SLUGS = POPULAR_SLUGS.slice(0, 4)

export function HomePage() {
  const { t, tx, pair, isBilingual } = useLanguage()
  const short = useShortText()
  const { openSearch } = useSearch()
  const popular = getFeatures(POPULAR_SLUGS)
  const quick = getFeatures(QUICK_SLUGS)
  const groups = featuresByCategory()

  useDocumentTitle('')

  return (
    <>
      <section className="hero-section">
        <img
          src={imageUrls.hero}
          alt=""
          fetchPriority="high"
        />
        <div className="hero-copy">
          <p className="eyebrow">{tx('Egypt owner guide · English & Arabic', 'دليل المالك في مصر · عربي وإنجليزي')}</p>
          <h1>{short('Everything about your iCAUR V27, in one place', 'كل ما تحتاجه عن iCAUR V27 في مكان واحد')}</h1>
          {isBilingual && (
            <p className="hero-alt" lang="ar" dir="rtl">
              كل ما تحتاجه عن iCAUR V27 في مكان واحد
            </p>
          )}
          <p>
            {tx(
              'Step-by-step guides for the screen, charging, driver assistance, the spare wheel and more, with a clear label on what is confirmed for Egypt.',
              'أدلة خطوة بخطوة للشاشة والشحن ومساعدة السائق والاستبن وغيرها، مع توضيح ما هو مؤكد لمصر.',
            )}
          </p>

          <button className="hero-search" type="button" onClick={() => openSearch()}>
            <Search size={20} aria-hidden="true" />
            <span>
              {short(`Search ${features.length} guides: spare wheel, charging…`, `ابحث في ${features.length} دليل: الاستبن، الشحن…`)}
            </span>
            <kbd aria-hidden="true">/</kbd>
          </button>

          <div className="hero-quick" aria-label={tx('Popular questions', 'أسئلة شائعة')}>
            {quick.map((feature) => (
              <a key={feature.id} href={guideHref(feature.slug)}>
                {t(feature.name)}
              </a>
            ))}
          </div>

          <div className="hero-actions">
            <a className="primary-action" href="#/guides">
              <BookOpen size={18} aria-hidden="true" />
              {short('Browse all guides', 'تصفح كل الأدلة')}
            </a>
            <a className="secondary-action" href="#/guides/screen-map">
              <MonitorSmartphone size={18} aria-hidden="true" />
              {short('Try the screen simulator', 'جرب محاكي الشاشة')}
            </a>
          </div>
        </div>
      </section>

      <SectionHeading eyebrow={tx('Browse', 'تصفح')} title={tx('Find help by topic', 'ابحث حسب الموضوع')} />
      <div className="topic-grid">
        {groups.map(({ category, features: inCategory }) => (
          <a key={category.id} className="topic-tile" href={`#/guides?topic=${category.id}`}>
            <span className="topic-icon">
              <CategoryIcon id={category.id} />
            </span>
            <span className="topic-text">
              <strong>{pair(category.name)}</strong>
              <small>
                {tx(
                  `${inCategory.length} ${inCategory.length === 1 ? 'guide' : 'guides'}`,
                  `${inCategory.length} ${inCategory.length === 1 ? 'دليل' : 'أدلة'}`,
                )}
              </small>
            </span>
            <ChevronRight size={18} className="topic-arrow flip-rtl" aria-hidden="true" />
          </a>
        ))}
      </div>

      <SectionHeading
        eyebrow={tx('Start here', 'ابدأ هنا')}
        title={tx('Most asked questions', 'أكثر الأسئلة شيوعا')}
        action={
          <a className="inline-link" href="#/guides">
            {tx('See all guides', 'كل الأدلة')} <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
          </a>
        }
      />
      <FeatureGrid features={popular} />

      <section className="split-section">
        <div>
          <SectionHeading
            eyebrow={tx('Interactive', 'تفاعلي')}
            title={tx('Learn the screen before you sit in the car', 'تعرّف على الشاشة قبل أن تركب السيارة')}
            compact
          />
          <p>
            {tx(
              'A working model of the centre display: real switches, settings and climate controls, each marked with whether it is confirmed for Egypt.',
              'نموذج يعمل من الشاشة المركزية: مفاتيح وإعدادات وتحكم في التكييف، مع توضيح ما هو مؤكد لمصر.',
            )}
          </p>
          <a className="primary-action" href="#/guides/screen-map">
            {tx('Open the simulator', 'افتح المحاكي')} <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
          </a>
        </div>
        <img src={imageUrls.screen} alt={tx('iCAUR V27 centre screen', 'شاشة iCAUR V27 المركزية')} loading="lazy" />
      </section>

      <SectionHeading
        eyebrow={tx('How to read this guide', 'كيف تقرأ هذا الدليل')}
        title={tx('What the labels mean', 'معنى العلامات')}
      />
      <section className="legend-section">
        <div className="legend-trim">
          <strong>{tx('Labels follow your trim', 'العلامات حسب فئة سيارتك')}</strong>
          <p>
            {tx(
              'Pick the trim you own or are considering. Every guide shows whether that feature is confirmed for it.',
              'اختر الفئة التي تملكها أو تفكر فيها، وسيوضح كل دليل إن كانت الميزة مؤكدة لها.',
            )}
          </p>
          <TrimSwitch />
        </div>
        <VerificationLegend />
      </section>
    </>
  )
}
