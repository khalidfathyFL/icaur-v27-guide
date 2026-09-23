import { getCategory, type Feature } from '../content'
import { useLanguage } from '../i18n/languageContext'
import { useTrim } from '../vehicle/trimContext'
import { guideHref } from '../lib/links'
import { AltBlock } from './layout'
import { VerificationBadge } from './VerificationBadge'

export function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="feature-grid">
      {features.map((feature) => (
        <FeatureCard key={feature.id} feature={feature} />
      ))}
    </div>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { t, alt, pair, language } = useLanguage()
  const { trim } = useTrim()
  const category = getCategory(feature.categoryId)
  const summaryAlt = alt(feature.summary)

  return (
    <a className="feature-card" href={guideHref(feature.slug)}>
      {category && <span className="category-label">{pair(category.name)}</span>}
      <h3>{pair(feature.name)}</h3>
      {language === 'ar' && <p>{feature.name.en}</p>}
      <small>{t(feature.summary)}</small>
      {summaryAlt && (
        <AltBlock>
          <small>{summaryAlt}</small>
        </AltBlock>
      )}
      <div className="card-footer">
        <VerificationBadge status={feature.availability[trim]} />
        <span>{feature.lastVerified}</span>
      </div>
    </a>
  )
}
