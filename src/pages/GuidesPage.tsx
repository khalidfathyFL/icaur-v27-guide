import { featuresByCategory } from '../content'
import { FeatureGrid } from '../components/FeatureGrid'
import { PageFrame } from '../components/layout'
import { useLanguage } from '../i18n/languageContext'

export function GuidesPage() {
  const { tx, pair } = useLanguage()
  const groups = featuresByCategory()

  return (
    <PageFrame
      eyebrow={tx('Guides', 'الأدلة')}
      title={tx('All Features With Verification', 'كل الميزات بنظام تحقق واضح')}
      intro={tx(
        'Each card uses one schema: English/Arabic name, location, steps, requirements, unavailable conditions, safety notes, sources, and videos.',
        'كل بطاقة مبنية من Schema واحد يشمل الاسم، المكان، الخطوات، الشروط، السلامة، المصادر، والفيديوهات.',
      )}
    >
      {groups.map(({ category, features }) => (
        <section key={category.id} className="guide-category">
          <h2>{pair(category.name)}</h2>
          <FeatureGrid features={features} />
        </section>
      ))}
    </PageFrame>
  )
}
