import { AlertTriangle, BookOpen, Car, CheckCircle2, Gauge, ShieldCheck, Video } from 'lucide-react'
import { getCategory, getFeatures, getSources, getVideos, type Feature } from '../content'
import type { LocalizedList } from '../content/types'
import { FeatureGrid } from '../components/FeatureGrid'
import { AltBlock, InfoBlock, PageFrame, SectionHeading } from '../components/layout'
import { StatusRow } from '../components/VerificationBadge'
import { InfotainmentSimulator } from '../features/infotainment/InfotainmentSimulator'
import { useLanguage } from '../i18n/languageContext'
import { sourceHref } from '../lib/links'
import { useTrim } from '../vehicle/trimContext'

/** The guide whose page hosts the interactive centre-screen simulator. */
const SIMULATOR_FEATURE_ID = 'screen-map'

export function FeaturePage({ feature }: { feature: Feature }) {
  const { t, alt, tx, pair } = useLanguage()
  const { trim } = useTrim()

  const category = getCategory(feature.categoryId)
  const related = getFeatures(feature.related)
  const featureVideos = getVideos(feature.videoIds)
  const featureSources = getSources(feature.sourceIds)
  const summaryAlt = alt(feature.summary)
  const locationAlt = alt(feature.location)

  return (
    <PageFrame
      eyebrow={category ? pair(category.name) : ''}
      title={pair(feature.name)}
      intro={
        <>
          {t(feature.summary)}
          {summaryAlt && <AltBlock>{summaryAlt}</AltBlock>}
        </>
      }
    >
      <div className="feature-layout">
        <aside className="feature-sidebar">
          <h2>{tx('Verification', 'حالة التحقق')}</h2>
          <StatusRow label="Egypt Play" status={feature.availability.play} selected={trim === 'play'} />
          <StatusRow label="Egypt Wild" status={feature.availability.wild} selected={trim === 'wild'} />
          <StatusRow label="China" status={feature.availability.china} />
          <StatusRow label="Other export" status={feature.availability.exportOther} />
          <p className="verified-date">
            {tx('Last verified', 'آخر مراجعة')}: {feature.lastVerified}
          </p>
        </aside>

        <article className="feature-article">
          <InfoBlock icon={<Car size={20} />} title={tx('Location', 'المكان')}>
            <p>{t(feature.location)}</p>
            {locationAlt && (
              <AltBlock>
                <p>{locationAlt}</p>
              </AltBlock>
            )}
            {feature.screenPath && (
              <div className="path-pills">
                {feature.screenPath.map((part) => (
                  <span key={part}>{part}</span>
                ))}
              </div>
            )}
          </InfoBlock>

          {feature.id === SIMULATOR_FEATURE_ID && <InfotainmentSimulator />}

          <InfoBlock icon={<Gauge size={20} />} title={tx('How To Use', 'خطوات الاستخدام')}>
            <BilingualList items={feature.steps} ordered />
          </InfoBlock>

          <div className="two-column">
            <InfoBlock icon={<CheckCircle2 size={20} />} title={tx('Requirements', 'الشروط المطلوبة')}>
              <BilingualList items={feature.requirements} />
            </InfoBlock>

            <InfoBlock icon={<AlertTriangle size={20} />} title={tx('Unavailable When', 'متى لا تعمل')}>
              <BilingualList items={feature.unavailableWhen} />
            </InfoBlock>
          </div>

          <InfoBlock icon={<ShieldCheck size={20} />} title={tx('Safety Notes', 'ملاحظات السلامة')}>
            <BilingualList items={feature.safetyNotes} />
          </InfoBlock>

          {featureVideos.length > 0 && (
            <InfoBlock icon={<Video size={20} />} title={tx('Related Videos', 'فيديوهات مرتبطة')}>
              <div className="video-list">
                {featureVideos.map((video) => (
                  <a key={video.id} href={video.url} target="_blank" rel="noreferrer">
                    <strong>{video.title}</strong>
                    <span>
                      {video.platform} - {video.marketShown} - {video.language}
                    </span>
                    <small>{video.notes}</small>
                  </a>
                ))}
              </div>
            </InfoBlock>
          )}

          <InfoBlock icon={<BookOpen size={20} />} title={tx('Sources', 'المصادر')}>
            <div className="source-list">
              {featureSources.map((source) => (
                <a key={source.id} href={sourceHref(source.url)} target="_blank" rel="noreferrer">
                  <strong>{source.title}</strong>
                  <span>
                    {source.market} - checked {source.checked}
                  </span>
                </a>
              ))}
            </div>
          </InfoBlock>
        </article>
      </div>

      {related.length > 0 && (
        <>
          <SectionHeading eyebrow={tx('Related', 'مرتبط')} title={tx('Related Guides', 'أدلة قريبة')} />
          <FeatureGrid features={related} />
        </>
      )}
    </PageFrame>
  )
}

/** Renders the primary language list, plus the Arabic one underneath in bilingual mode. */
function BilingualList({ items, ordered = false }: { items: LocalizedList; ordered?: boolean }) {
  const { list, altList } = useLanguage()
  const primary = list(items)
  const secondary = altList(items)
  const List = ordered ? 'ol' : 'ul'

  return (
    <>
      <List>
        {primary.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
      {secondary && (
        <AltBlock>
          <List>
            {secondary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </List>
        </AltBlock>
      )}
    </>
  )
}
