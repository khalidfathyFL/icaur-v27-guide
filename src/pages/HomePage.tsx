import { BookOpen, CheckCircle2, ChevronLeft, Search, ShieldCheck, SlidersHorizontal, Wrench } from 'lucide-react'
import { POPULAR_SLUGS, features, getFeatures, imageUrls } from '../content'
import { FeatureGrid } from '../components/FeatureGrid'
import { SectionHeading } from '../components/layout'
import { useLanguage } from '../i18n/languageContext'
import { trimLabel, useTrim } from '../vehicle/trimContext'

export function HomePage() {
  const { tx } = useLanguage()
  const { trim } = useTrim()
  const popular = getFeatures(POPULAR_SLUGS)

  return (
    <>
      <section className="hero-section">
        <img src={imageUrls.hero} alt={tx('iCAUR V27 on an open road', 'iCAUR V27 على طريق خارج المدينة')} />
        <div className="hero-copy">
          <p className="eyebrow">English + Arabic Egypt knowledge base</p>
          <h1>{tx('iCAUR V27 Owner Knowledge Base', 'دليل iCAUR V27 العملي')}</h1>
          <p>
            {tx(
              'A bilingual owner, sales, and service guide covering specs, screen menus, ADAS, charging, spare wheel, maintenance, and videos - with verification status for Play and Wild.',
              'دليل ثنائي اللغة للمالك والمبيعات والخدمة: مواصفات، شاشة، ADAS، شحن، استبن، صيانة، وفيديوهات مع حالة تحقق لكل ميزة حسب Play و Wild.',
            )}
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#/guides">
              <BookOpen size={18} />
              {tx('Open Guides', 'افتح الأدلة')}
            </a>
            <a className="secondary-action" href="#/guides/screen-map">
              <Wrench size={18} />
              {tx('Try the Screen', 'جرب الشاشة')}
            </a>
          </div>
          <div className="hero-metrics" aria-label={tx('Knowledge base summary', 'ملخص قاعدة المعرفة')}>
            <span>
              <strong>{features.length}</strong>
              {tx('structured guides', 'دليل منظم')}
            </span>
            <span>
              <strong>2</strong>
              {tx('Egypt trims', 'فئات مصر')}
            </span>
            <span>
              <strong>100%</strong>
              {tx('source-labeled', 'موثق بالمصادر')}
            </span>
          </div>
        </div>
      </section>

      <section className="trust-band">
        <div>
          <ShieldCheck size={22} />
          <strong>{tx('Trust Rule', 'قاعدة الثقة')}</strong>
          <span>
            {tx(
              'China-market features are never shown as Egypt facts.',
              'لا يتم عرض ميزة صينية كأنها مؤكدة لمصر.',
            )}
          </span>
        </div>
        <div>
          <SlidersHorizontal size={22} />
          <strong>{tx('Selected Trim', 'الفئة الحالية')}</strong>
          <span>
            {trimLabel(trim)} -{' '}
            {tx(
              'incompatible content is labeled for verification.',
              'المحتوى غير المتوافق يظهر كتحقق مطلوب.',
            )}
          </span>
        </div>
        <div>
          <Search size={22} />
          <strong>{tx('Fast Search', 'بحث سريع')}</strong>
          <span>
            {tx(
              'Search in English or Arabic: spare, استبن, lane assist, charging.',
              'ابحث بالعربي أو الإنجليزي: استبن، spare، lane assist، charging.',
            )}
          </span>
        </div>
      </section>

      <SectionHeading
        eyebrow={tx('Start Here', 'ابدأ هنا')}
        title={tx('Common Owner Questions', 'أكثر الأسئلة استخداما بجانب السيارة')}
      />
      <FeatureGrid features={popular} />

      <section className="split-section">
        <div>
          <SectionHeading
            eyebrow={tx('Screen', 'الشاشة')}
            title={tx('Interactive Menu Map', 'خريطة قوائم تفاعلية')}
            compact
          />
          <p>
            {tx(
              'Open the screen guide to use a working model of the centre display: real switches, segmented settings, climate controls, and a verification badge on every option.',
              'افتح دليل الشاشة لتجربة نموذج يعمل من الشاشة المركزية: مفاتيح حقيقية، إعدادات متعددة، تحكم في التكييف، وحالة تحقق لكل خيار.',
            )}
          </p>
          <a className="inline-link" href="#/guides/screen-map">
            {tx('Open Screen Map', 'افتح خريطة الشاشة')} <ChevronLeft size={16} />
          </a>
        </div>
        <img src={imageUrls.screen} alt={tx('iCAUR V27 centre screen', 'شاشة iCAUR V27 المركزية')} />
      </section>

      <SectionHeading eyebrow={tx('Version One', 'النسخة الأولى')} title={tx('What Is Included', 'ما تم تأسيسه الآن')} />
      <div className="acceptance-grid">
        {[
          tx('Bilingual UI and content', 'واجهة ومحتوى ثنائي اللغة'),
          tx('Play / Wild selector', 'اختيار الفئة'),
          tx('Arabic + English search', 'بحث عربي وإنجليزي'),
          tx(`${features.length} structured guide pages`, `${features.length} صفحة منظمة`),
          tx('Interactive centre screen', 'شاشة مركزية تفاعلية'),
          tx('Videos and linked sources', 'فيديوهات ومصادر بروابط'),
          tx('English + Arabic reviews', 'مراجعات إنجليزي وعربي'),
          tx('Play vs Wild comparison', 'مقارنة الفئات'),
        ].map((item) => (
          <div key={item}>
            <CheckCircle2 size={18} />
            {item}
          </div>
        ))}
      </div>
    </>
  )
}
