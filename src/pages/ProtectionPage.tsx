import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock, ExternalLink, Globe, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react'
import { AltBlock, PageFrame } from '../components/layout'
import { OwnerReviews, Rating } from '../components/OwnerReviews'
import {
  COVERAGE_LABELS,
  SERVICES,
  SERVICE_LABELS,
  centerName,
  durationText,
  packageName,
} from '../features/centers/labels'
import { egp, whatsappLink } from '../features/parts/labels'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured, type ApiCenter, type ProtectionService } from '../lib/api'
import { formatDate } from '../lib/format'
import { ServiceUnavailable } from './AccountPage'

type Sort = 'city' | 'price' | 'rating'

const asService = (value: string | null): ProtectionService | 'all' =>
  SERVICES.includes(value as ProtectionService) ? (value as ProtectionService) : 'all'

/** The cheapest package offering this service, or the cheapest overall. */
function fromPrice(center: ApiCenter, service: ProtectionService | 'all'): number | null {
  const prices = center.packages.filter((item) => service === 'all' || item.service === service).map((item) => item.priceEgp)
  return prices.length === 0 ? null : Math.min(...prices)
}

export function ProtectionPage({ params }: { params: URLSearchParams }) {
  const { tx, t, language } = useLanguage()
  const [centers, setCenters] = useState<ApiCenter[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A link such as #/protection?service=ppf opens pre-filtered.
  const [service, setService] = useState<ProtectionService | 'all'>(() => asService(params.get('service')))
  const [city, setCity] = useState('all')
  const [sort, setSort] = useState<Sort>('city')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false
    api
      .listCenters()
      .then(({ centers: list }) => {
        if (!cancelled) setCenters(list)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Could not load the protection centers.', 'تعذر تحميل مراكز الحماية.'))
      })

    return () => {
      cancelled = true
    }
  }, [tx])

  const cities = useMemo(() => [...new Set((centers ?? []).map((center) => center.city))].sort(), [centers])

  const shown = useMemo(() => {
    if (!centers) return null
    const needle = query.trim().toLowerCase()
    const list = centers.filter(
      (center) =>
        (service === 'all' || center.services.includes(service)) &&
        (city === 'all' || center.city === city) &&
        (!needle ||
          `${center.name.en} ${center.name.ar} ${center.area ?? ''} ${center.packages.map((item) => item.brand ?? '').join(' ')}`
            .toLowerCase()
            .includes(needle)),
    )
    const sorted = [...list]
    if (sort === 'price') sorted.sort((a, b) => (fromPrice(a, service) ?? Infinity) - (fromPrice(b, service) ?? Infinity))
    if (sort === 'rating') sorted.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    return sorted
  }, [centers, service, city, sort, query])

  if (!apiConfigured) return <ServiceUnavailable />

  const chip = (value: ProtectionService | 'all', label: string) => (
    <button
      key={value}
      type="button"
      className={value === service ? 'part-chip selected' : 'part-chip'}
      aria-pressed={value === service}
      onClick={() => setService(value)}
    >
      {label}
    </button>
  )

  return (
    <PageFrame
      eyebrow={tx('Market', 'السوق')}
      title={tx('Protection centers', 'مراكز الحماية')}
      intro={tx(
        'Where to get the V27 protected in Egypt: PPF, ceramic coating, window film and more. Each center lists its packages with what they cover, the material, the warranty and the price.',
        'أين تحمي V27 في مصر: فيلم الحماية، النانو سيراميك، تظليل الزجاج وغيرها. كل مركز يعرض باقاته بما تغطيه والخامة والضمان والسعر.',
      )}
    >
      <p className="muted-note protection-crosslink">
        {tx('Buying protection parts to fit yourself?', 'تشتري قطع حماية لتركبها بنفسك؟')}{' '}
        <a className="inline-link" href="#/accessories?category=protection">
          {tx('See protection accessories', 'شاهد إكسسوارات الحماية')}
        </a>
      </p>

      <div className="part-filters">
        <div className="part-chip-row" role="group" aria-label={tx('Service', 'الخدمة')}>
          {chip('all', tx('Every service', 'كل الخدمات'))}
          {SERVICES.map((key) => chip(key, t(SERVICE_LABELS[key])))}
        </div>
        <div className="part-filter-row">
          <input
            className="part-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('Search centers, areas or brands…', 'ابحث في المراكز أو المناطق أو الماركات…')}
            aria-label={tx('Search protection centers', 'ابحث في مراكز الحماية')}
          />
          {cities.length > 1 && (
            <label className="part-sort">
              <span>{tx('City', 'المدينة')}</span>
              <select value={city} onChange={(event) => setCity(event.target.value)}>
                <option value="all">{tx('All cities', 'كل المدن')}</option>
                {cities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="part-sort">
            <span>{tx('Sort', 'الترتيب')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="city">{tx('By city', 'حسب المدينة')}</option>
              <option value="price">{tx('Cheapest first', 'الأرخص أولا')}</option>
              <option value="rating">{tx('Best rated', 'الأعلى تقييما')}</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {shown === null && !error && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>}
      {shown?.length === 0 && (
        <p className="muted-note">
          {centers?.length === 0
            ? tx('No protection centers listed yet.', 'لا توجد مراكز حماية مدرجة بعد.')
            : tx('Nothing matches these filters.', 'لا يوجد ما يطابق هذه الاختيارات.')}
        </p>
      )}

      <div className="part-grid">
        {shown?.map((center) => {
          const price = fromPrice(center, service)
          return (
            <a className="part-card" key={center.id} href={`#/protection/${center.slug}`}>
              <div className="part-card-image">
                {center.images[0] ? (
                  <img src={center.images[0].url} alt={center.images[0].alt ?? ''} loading="lazy" />
                ) : (
                  <ShieldCheck size={36} aria-hidden="true" />
                )}
              </div>
              <div className="part-card-body">
                <small>
                  <MapPin size={12} aria-hidden="true" /> {center.city}
                  {center.area ? ` · ${center.area}` : ''}
                </small>
                <h2>{centerName(center, language)}</h2>
                <div className="center-service-tags">
                  {center.services.slice(0, 3).map((key) => (
                    <span key={key}>{t(SERVICE_LABELS[key])}</span>
                  ))}
                  {center.services.length > 3 && <span>+{center.services.length - 3}</span>}
                </div>
                <div className="part-card-foot">
                  {price !== null ? (
                    <strong>
                      {tx('From', 'يبدأ من')} <span dir="ltr">{egp.format(price)}</span>
                    </strong>
                  ) : (
                    <span className="muted-note">{tx('Ask for prices', 'اسأل عن الأسعار')}</span>
                  )}
                  <small>{tx(`${center.packages.length} packages`, `${center.packages.length} باقات`)}</small>
                </div>
                {center.ratingCount > 0 && <Rating value={center.ratingAvg} count={center.ratingCount} />}
              </div>
            </a>
          )
        })}
      </div>
    </PageFrame>
  )
}

export function ProtectionCenterPage({ slug }: { slug: string }) {
  const { tx, t, alt, language } = useLanguage()
  const [center, setCenter] = useState<ApiCenter | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState(0)
  const [service, setService] = useState<ProtectionService | 'all'>('all')

  const load = useCallback(() => {
    api
      .readCenter(slug)
      .then(({ center: found }) => setCenter(found))
      .catch(() => setError(tx('Protection center not found.', 'مركز الحماية غير موجود.')))
  }, [slug, tx])

  useEffect(() => {
    if (apiConfigured) load()
  }, [load])

  if (!apiConfigured) return <ServiceUnavailable />

  const crumbs = [{ label: tx('Protection centers', 'مراكز الحماية'), href: '#/protection' }]

  if (error || !center) {
    return (
      <PageFrame eyebrow={tx('Protection', 'الحماية')} title={error ?? tx('Loading…', 'جارٍ التحميل…')} intro="" breadcrumbs={crumbs}>
        {error ? (
          <a className="primary-action" href="#/protection">
            {tx('Back to protection centers', 'ارجع إلى مراكز الحماية')}
          </a>
        ) : (
          <span />
        )}
      </PageFrame>
    )
  }

  const name = centerName(center, language)
  const side = language === 'ar' && center.description.ar ? 'ar' : 'en'
  const description = center.description[side] || center.description.en || center.description.ar
  const descriptionAlt = side === 'en' && center.description.ar ? alt(center.description) : null
  const image = center.images[photo] ?? center.images[0]
  const packages = center.packages.filter((item) => service === 'all' || item.service === service)
  const where = [center.area, center.city].filter(Boolean).join(', ')

  return (
    <PageFrame eyebrow={where} title={name} intro="" breadcrumbs={[...crumbs, { label: name }]}>
      <div className="part-detail">
        <div className="part-gallery">
          <div className="part-gallery-main">
            {image ? <img src={image.url} alt={image.alt ?? name} /> : <ShieldCheck size={56} aria-hidden="true" />}
          </div>
          {center.images.length > 1 && (
            <div className="part-gallery-thumbs">
              {center.images.map((item, index) => (
                <button
                  key={item.url}
                  type="button"
                  className={index === photo ? 'selected' : undefined}
                  aria-pressed={index === photo}
                  aria-label={item.alt || tx(`Photo ${index + 1}`, `صورة ${index + 1}`)}
                  onClick={() => setPhoto(index)}
                >
                  <img src={item.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="part-summary">
          <div className="part-badges">
            {center.ratingCount > 0 && <Rating value={center.ratingAvg} count={center.ratingCount} />}
            {center.fromPriceEgp !== null && (
              <span className="center-from">
                {tx('Packages from', 'الباقات تبدأ من')} <strong dir="ltr">{egp.format(center.fromPriceEgp)}</strong>
              </span>
            )}
          </div>

          <ul className="center-contact">
            {center.address && (
              <li>
                <MapPin size={16} aria-hidden="true" />
                <span>{center.address}</span>
              </li>
            )}
            {center.hours && (
              <li>
                <Clock size={16} aria-hidden="true" />
                <span>{center.hours}</span>
              </li>
            )}
          </ul>

          <div className="part-supplier-actions">
            {center.phone && (
              <a className="part-action" href={`tel:${center.phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                <Phone size={14} aria-hidden="true" /> {center.phone}
              </a>
            )}
            {center.whatsapp && (
              <a className="part-action" href={whatsappLink(center.whatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
            )}
            {center.mapUrl && (
              <a className="part-action" href={center.mapUrl} target="_blank" rel="noopener noreferrer nofollow">
                <MapPin size={14} aria-hidden="true" /> {tx('Directions', 'الاتجاهات')}
              </a>
            )}
            {center.website && (
              <a className="part-action" href={center.website} target="_blank" rel="noopener noreferrer nofollow">
                <Globe size={14} aria-hidden="true" /> {tx('Website', 'الموقع')}
              </a>
            )}
            {center.instagram && (
              <a className="part-action" href={center.instagram} target="_blank" rel="noopener noreferrer nofollow">
                <ExternalLink size={14} aria-hidden="true" /> {tx('Social page', 'صفحة التواصل')}
              </a>
            )}
          </div>

          <p className="muted-note part-checked">
            {tx('Packages last checked', 'آخر تحقق من الباقات')} {formatDate(center.checkedAt, language)}
          </p>
        </div>
      </div>

      {description && (
        <section className="part-section">
          <p className="part-description" dir={side === 'ar' ? 'rtl' : 'ltr'} lang={side}>
            {description}
          </p>
          {descriptionAlt && (
            <AltBlock>
              <p className="part-description">{descriptionAlt}</p>
            </AltBlock>
          )}
        </section>
      )}

      <section className="part-section">
        <h2>{tx('Packages', 'الباقات')}</h2>

        {center.services.length > 1 && (
          <div className="part-chip-row center-package-filter" role="group" aria-label={tx('Service', 'الخدمة')}>
            {(['all', ...center.services] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={key === service ? 'part-chip selected' : 'part-chip'}
                aria-pressed={key === service}
                onClick={() => setService(key)}
              >
                {key === 'all' ? tx('All', 'الكل') : t(SERVICE_LABELS[key])}
              </button>
            ))}
          </div>
        )}

        {center.packages.length === 0 && (
          <p className="muted-note">{tx('No packages listed yet. Contact the center for prices.', 'لا توجد باقات مدرجة بعد. تواصل مع المركز لمعرفة الأسعار.')}</p>
        )}

        <div className="center-packages">
          {packages.map((item) => {
            const duration = durationText(item.durationDays, tx)
            const notes = item.notes ? item.notes[language === 'ar' ? 'ar' : 'en'] || item.notes.en || item.notes.ar : null
            const material = [item.brand, item.product].filter(Boolean).join(' ')
            const specs = [
              { label: tx('Material', 'الخامة'), value: [material, item.materialType].filter(Boolean).join(' · ') },
              { label: tx('Thickness', 'السُمك'), value: item.thicknessMil === undefined ? '' : `${item.thicknessMil} mil` },
              {
                label: tx('Self-healing', 'ذاتي الالتئام'),
                value: item.selfHealing === undefined ? '' : item.selfHealing ? tx('Yes', 'نعم') : tx('No', 'لا'),
              },
              {
                label: tx('Warranty', 'الضمان'),
                value:
                  item.warrantyYears === undefined
                    ? ''
                    : item.warrantyYears === 0
                      ? tx('None', 'لا يوجد')
                      : tx(`${item.warrantyYears} year${item.warrantyYears === 1 ? '' : 's'}`, `${item.warrantyYears} سنة`),
              },
              { label: tx('Time at the center', 'المدة في المركز'), value: duration ?? '' },
            ].filter((row) => row.value)

            return (
              <article className="center-package-card" id={`package-${item.id}`} key={item.id}>
                <header>
                  <small>{t(SERVICE_LABELS[item.service])}</small>
                  <h3>{packageName(item, language)}</h3>
                  <div className="center-package-price">
                    {item.wildPriceEgp !== undefined ? (
                      <>
                        <span>
                          Play <strong dir="ltr">{egp.format(item.priceEgp)}</strong>
                        </span>
                        <span>
                          Wild <strong dir="ltr">{egp.format(item.wildPriceEgp)}</strong>
                        </span>
                      </>
                    ) : (
                      <strong dir="ltr">{egp.format(item.priceEgp)}</strong>
                    )}
                  </div>
                </header>

                {item.coverage.length > 0 && (
                  <div>
                    <p className="center-package-label">{tx('Covers', 'يغطي')}</p>
                    <ul className="center-coverage-list">
                      {item.coverage.map((area) => (
                        <li key={area}>{t(COVERAGE_LABELS[area])}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {specs.length > 0 && (
                  <dl className="center-package-specs">
                    {specs.map((row) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {item.inclusions.length > 0 && (
                  <div>
                    <p className="center-package-label">{tx('Included', 'يشمل')}</p>
                    <ul className="center-inclusions">
                      {item.inclusions.map((line) => (
                        <li key={line}>
                          <Check size={14} aria-hidden="true" /> {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {notes && <p className="center-package-notes">{notes}</p>}
              </article>
            )
          })}
        </div>
        <p className="muted-note">
          {tx(
            'Prices are as the center quoted them on the date above. Confirm the price, film and warranty in writing before booking.',
            'الأسعار كما ذكرها المركز في التاريخ أعلاه. تأكد من السعر والفيلم والضمان كتابيا قبل الحجز.',
          )}
        </p>
      </section>

      <OwnerReviews kind="center" targetId={center.id} onRatingChanged={load} />

      <a className="inline-link" href="#/protection">
        {tx('Back to protection centers', 'ارجع إلى مراكز الحماية')}
      </a>
    </PageFrame>
  )
}
