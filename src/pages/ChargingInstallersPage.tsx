import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Check, ExternalLink, Globe, Mail, MapPin, MessageCircle, Phone, PlugZap, X } from 'lucide-react'
import { AltBlock, PageFrame } from '../components/layout'
import { OwnerReviews, Rating } from '../components/OwnerReviews'
import { EGYPT_GOVERNORATES } from '../content/places'
import { either } from '../features/insurance/labels'
import { CONNECTOR_LABELS, PHASE_LABELS, SERVICES, SERVICE_LABELS, installerName, kw, packageName } from '../features/installers/labels'
import { egp, whatsappLink } from '../features/parts/labels'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured, type ApiInstaller, type ChargerPhase, type InstallService } from '../lib/api'
import { formatDate } from '../lib/format'
import { ServiceUnavailable } from './AccountPage'

type Sort = 'price' | 'power' | 'rating'

const LIST_HREF = '#/charging/installers'

/** Governorates are stored by English name; show them in the reader's language. */
function useGovernorateName() {
  const { t } = useLanguage()
  return useCallback((name: string) => {
    const found = EGYPT_GOVERNORATES.find((item) => item.en === name)
    return found ? t(found) : name
  }, [t])
}

export function ChargingInstallersPage() {
  const { tx, t, language } = useLanguage()
  const governorateName = useGovernorateName()
  const [installers, setInstallers] = useState<ApiInstaller[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('price')
  const [needs, setNeeds] = useState<InstallService[]>([])
  const [governorate, setGovernorate] = useState('')
  const [phase, setPhase] = useState<ChargerPhase | ''>('')

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false
    api
      .listInstallers()
      .then(({ installers: list }) => {
        if (!cancelled) setInstallers(list)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Could not load the charger installers.', 'تعذر تحميل شركات تركيب الشواحن.'))
      })

    return () => {
      cancelled = true
    }
  }, [tx])

  const shown = useMemo(() => {
    if (!installers) return null
    const list = installers.filter(
      (installer) =>
        needs.every((service) => installer.services.includes(service)) &&
        // A company that has not said where it works is not ruled out.
        (!governorate || installer.governorates.length === 0 || installer.governorates.includes(governorate)) &&
        (!phase || installer.packages.some((item) => item.phase === phase)),
    )
    const sorted = [...list]
    if (sort === 'price') sorted.sort((a, b) => (a.lowestPriceEgp ?? Infinity) - (b.lowestPriceEgp ?? Infinity))
    if (sort === 'power') sorted.sort((a, b) => (b.maxPowerKw ?? -1) - (a.maxPowerKw ?? -1))
    if (sort === 'rating') sorted.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    return sorted
  }, [installers, needs, governorate, phase, sort])

  if (!apiConfigured) return <ServiceUnavailable />

  return (
    <PageFrame
      eyebrow={tx('Charging', 'الشحن')}
      title={tx('Home charger installers', 'تركيب شواحن المنزل')}
      intro={tx(
        'Companies in Egypt that sell and install home chargers for the V27: the wall box, its power, what the installation includes, the price and where they work.',
        'الشركات في مصر التي تبيع وتركب الشواحن المنزلية لسيارة V27: الشاحن وقدرته، وما يشمله التركيب، والسعر، والمحافظات التي تعمل فيها.',
      )}
    >
      <div className="part-filters">
        <div className="part-chip-row" role="group" aria-label={tx('Must offer', 'يجب أن تقدم')}>
          <span className="insurance-needs-label">{tx('Must offer:', 'يجب أن تقدم:')}</span>
          {SERVICES.map((service) => {
            const on = needs.includes(service)
            return (
              <button
                key={service}
                type="button"
                className={on ? 'part-chip selected' : 'part-chip'}
                aria-pressed={on}
                onClick={() => setNeeds((current) => (on ? current.filter((item) => item !== service) : [...current, service]))}
              >
                {t(SERVICE_LABELS[service])}
              </button>
            )
          })}
        </div>
        <div className="part-filter-row">
          <label className="part-sort">
            <span>{tx('Governorate', 'المحافظة')}</span>
            <select value={governorate} onChange={(event) => setGovernorate(event.target.value)}>
              <option value="">{tx('Anywhere', 'أي محافظة')}</option>
              {EGYPT_GOVERNORATES.map((item) => (
                <option key={item.en} value={item.en}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="part-sort">
            <span>{tx('Home supply', 'كهرباء المنزل')}</span>
            <select value={phase} onChange={(event) => setPhase(event.target.value as ChargerPhase | '')}>
              <option value="">{tx('Either', 'أيهما')}</option>
              <option value="1">{t(PHASE_LABELS['1'])}</option>
              <option value="3">{t(PHASE_LABELS['3'])}</option>
            </select>
          </label>
          <label className="part-sort">
            <span>{tx('Sort', 'الترتيب')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="price">{tx('Cheapest first', 'الأرخص أولا')}</option>
              <option value="power">{tx('Most powerful first', 'الأعلى قدرة أولا')}</option>
              <option value="rating">{tx('Best rated', 'الأعلى تقييما')}</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {shown === null && !error && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>}
      {shown?.length === 0 && (
        <p className="muted-note">
          {installers?.length === 0
            ? tx('No charger installers listed yet.', 'لا توجد شركات تركيب مدرجة بعد.')
            : tx('No installer matches everything chosen.', 'لا توجد شركة تطابق كل ما اخترته.')}
        </p>
      )}

      <div className="part-grid">
        {shown?.map((installer) => (
          <a className="part-card" key={installer.id} href={`${LIST_HREF}/${installer.slug}`}>
            <div className="part-card-image insurer-logo">
              {installer.images[0] ? (
                <img src={installer.images[0].url} alt={installer.images[0].alt ?? ''} loading="lazy" />
              ) : (
                <PlugZap size={36} aria-hidden="true" />
              )}
            </div>
            <div className="part-card-body">
              <small>
                {tx(`${installer.packages.length} package(s)`, `${installer.packages.length} باقة`)}
                {installer.governorates.length > 0 &&
                  ` · ${installer.governorates.slice(0, 3).map(governorateName).join(language === 'ar' ? '، ' : ', ')}${installer.governorates.length > 3 ? '…' : ''}`}
              </small>
              <h2>{installerName(installer, language)}</h2>
              <div className="part-card-foot">
                {installer.lowestPriceEgp !== null ? (
                  <strong>
                    {tx('From', 'من')} <span dir="ltr">{egp.format(installer.lowestPriceEgp)}</span>
                  </strong>
                ) : (
                  <span className="muted-note">{tx('Ask for a quote', 'اطلب عرض سعر')}</span>
                )}
                {installer.licensed && (
                  <span className="badge ok">
                    <BadgeCheck size={13} aria-hidden="true" /> {tx('Licensed', 'مرخصة')}
                  </span>
                )}
              </div>
              {installer.maxPowerKw !== null && (
                <small>
                  {tx('Up to', 'حتى')} <span dir="ltr">{kw(installer.maxPowerKw)}</span>
                </small>
              )}
              {installer.ratingCount > 0 && <Rating value={installer.ratingAvg} count={installer.ratingCount} />}
            </div>
          </a>
        ))}
      </div>

      <p className="muted-note insurance-disclaimer">
        {tx(
          'Prices are a guide from what each company published or quoted on the date shown. The final price depends on the survey: the cable run from your meter, and whether your supply needs upgrading. "Licensed" means the company is on the Electricity Regulatory Agency’s list.',
          'الأسعار استرشادية مما نشرته أو ذكرته كل شركة في التاريخ الموضح. السعر النهائي يتحدد بعد المعاينة: طول الكابل من العداد، وهل كهرباء المنزل تحتاج إلى رفع قدرة. "مرخصة" تعني أن الشركة مدرجة في قائمة جهاز تنظيم مرفق الكهرباء.',
        )}{' '}
        <a href="https://egyptera.org/ar/EVComp.aspx" target="_blank" rel="noopener noreferrer">
          {tx('See the list', 'اطلع على القائمة')}
        </a>
      </p>
    </PageFrame>
  )
}

export function ChargingInstallerPage({ slug }: { slug: string }) {
  const { tx, t, alt, language } = useLanguage()
  const governorateName = useGovernorateName()
  const [installer, setInstaller] = useState<ApiInstaller | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .readInstaller(slug)
      .then(({ installer: found }) => setInstaller(found))
      .catch(() => setError(tx('Charger installer not found.', 'شركة التركيب غير موجودة.')))
  }, [slug, tx])

  useEffect(() => {
    if (apiConfigured) load()
  }, [load])

  if (!apiConfigured) return <ServiceUnavailable />

  const crumbs = [{ label: tx('Home charger installers', 'تركيب شواحن المنزل'), href: LIST_HREF }]
  const back = tx('Back to charger installers', 'ارجع إلى شركات تركيب الشواحن')

  if (error || !installer) {
    return (
      <PageFrame eyebrow={tx('Charging', 'الشحن')} title={error ?? tx('Loading…', 'جارٍ التحميل…')} intro="" breadcrumbs={crumbs}>
        {error ? (
          <a className="primary-action" href={LIST_HREF}>
            {back}
          </a>
        ) : (
          <span />
        )}
      </PageFrame>
    )
  }

  const name = installerName(installer, language)
  const side = language === 'ar' && installer.description.ar ? 'ar' : 'en'
  const description = installer.description[side] || installer.description.en || installer.description.ar
  // The Arabic underneath only when it is a second version, not the fallback already shown.
  const descriptionAlt = side === 'en' && installer.description.en && installer.description.ar ? alt(installer.description) : null
  const logo = installer.images[0]
  // Services the company offers in any package, so each package is compared against the same list.
  const offered = SERVICES.filter((service) => installer.services.includes(service))

  return (
    <PageFrame eyebrow={tx('Home charger installers', 'تركيب شواحن المنزل')} title={name} intro="" breadcrumbs={[...crumbs, { label: name }]}>
      <div className="insurer-head">
        <div className="insurer-head-logo">
          {logo ? <img src={logo.url} alt={logo.alt ?? name} /> : <PlugZap size={40} aria-hidden="true" />}
        </div>
        <div className="part-summary">
          <div className="part-badges">
            {installer.licensed && (
              <span className="badge ok">
                <BadgeCheck size={13} aria-hidden="true" /> {tx('Licensed by EgyptERA', 'مرخصة من جهاز تنظيم الكهرباء')}
              </span>
            )}
            {installer.ratingCount > 0 && <Rating value={installer.ratingAvg} count={installer.ratingCount} />}
            {installer.lowestPriceEgp !== null && (
              <span className="center-from">
                {tx('Packages from', 'الباقات تبدأ من')} <strong dir="ltr">{egp.format(installer.lowestPriceEgp)}</strong>
              </span>
            )}
          </div>
          {installer.governorates.length > 0 && (
            <p className="center-contact-line">
              <MapPin size={16} aria-hidden="true" /> {installer.governorates.map(governorateName).join(language === 'ar' ? '، ' : ', ')}
            </p>
          )}
          <div className="part-supplier-actions">
            {installer.hotline && (
              <a className="part-action" href={`tel:${installer.hotline.replace(/[^\d+]/g, '')}`} dir="ltr">
                <Phone size={14} aria-hidden="true" /> {installer.hotline}
              </a>
            )}
            {installer.phone && (
              <a className="part-action" href={`tel:${installer.phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                <Phone size={14} aria-hidden="true" /> {installer.phone}
              </a>
            )}
            {installer.whatsapp && (
              <a className="part-action" href={whatsappLink(installer.whatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
            )}
            {installer.website && (
              <a className="part-action" href={installer.website} target="_blank" rel="noopener noreferrer nofollow">
                <Globe size={14} aria-hidden="true" /> {tx('Website', 'الموقع')}
              </a>
            )}
            {installer.email && (
              <a className="part-action" href={`mailto:${installer.email}`}>
                <Mail size={14} aria-hidden="true" /> {tx('Email', 'البريد')}
              </a>
            )}
          </div>
          <p className="muted-note part-checked">
            {tx('Prices last checked', 'آخر تحقق من الأسعار')} {formatDate(installer.checkedAt, language)}
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

        {installer.packages.length === 0 && (
          <p className="muted-note">{tx('No packages listed yet. Contact the company for a quote.', 'لا توجد باقات مدرجة بعد. تواصل مع الشركة لطلب عرض سعر.')}</p>
        )}

        <div className="center-packages">
          {installer.packages.map((item) => {
            const installments = either(item.installments, language)
            const notes = either(item.notes, language)

            const specs = [
              { label: tx('Charger', 'الشاحن'), value: item.chargerBrand ?? '' },
              { label: tx('Power', 'القدرة'), value: item.powerKw === undefined ? '' : kw(item.powerKw) },
              { label: tx('Home supply', 'كهرباء المنزل'), value: item.phase ? t(PHASE_LABELS[item.phase]) : '' },
              { label: tx('Plug', 'الفيشة'), value: item.connector ? t(CONNECTOR_LABELS[item.connector]) : '' },
              {
                label: tx('Installation', 'التركيب'),
                value: item.installIncluded === undefined ? '' : item.installIncluded ? tx('Included', 'مشمول') : tx('Charged separately', 'بتكلفة منفصلة'),
              },
              {
                label: tx('Cable included', 'الكابل المشمول'),
                value: item.cableMetersIncluded === undefined ? '' : tx(`${item.cableMetersIncluded} m`, `${item.cableMetersIncluded} متر`),
              },
              {
                label: tx('Each extra metre', 'كل متر إضافي'),
                value: item.extraMeterEgp === undefined ? '' : egp.format(item.extraMeterEgp),
              },
              {
                label: tx('Warranty', 'الضمان'),
                value: item.warrantyYears === undefined ? '' : tx(`${item.warrantyYears} year(s)`, `${item.warrantyYears} سنوات`),
              },
              { label: tx('Installments', 'التقسيط'), value: installments ?? '' },
            ].filter((row) => row.value)

            return (
              <article className="center-package-card" id={`package-${item.id}`} key={item.id}>
                <header>
                  <h3>{packageName(item, language)}</h3>
                  <div className="center-package-price">
                    {item.priceEgp !== undefined ? <strong dir="ltr">{egp.format(item.priceEgp)}</strong> : <strong>{tx('Ask for a quote', 'اطلب عرض سعر')}</strong>}
                  </div>
                </header>

                {offered.length > 0 && (
                  <div>
                    <p className="center-package-label">{tx('Includes', 'تشمل')}</p>
                    {/* The company's services, ticked or crossed, so packages compare line by line. */}
                    <ul className="insurance-covers">
                      {offered.filter((service) => item.services.includes(service)).map((service) => (
                        <li key={service} className="yes">
                          <Check size={14} aria-hidden="true" /> {t(SERVICE_LABELS[service])}
                        </li>
                      ))}
                      {offered.filter((service) => !item.services.includes(service)).map((service) => (
                        <li key={service} className="no">
                          <X size={14} aria-hidden="true" /> {t(SERVICE_LABELS[service])}
                        </li>
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

                {notes && <p className="center-package-notes">{notes}</p>}
              </article>
            )
          })}
        </div>
        <p className="muted-note">
          {tx(
            'The V27 takes at most 6.6 kW on AC, so a 7 kW single-phase wall box charges it as fast as it can go; a bigger three-phase box will not make it faster. Check the plug matches your car’s socket, and ask for a site survey before you pay.',
            'تستقبل V27 بحد أقصى 6.6 كيلووات بالتيار المتردد، لذلك يشحنها شاحن جداري 7 كيلووات على 1 فاز بأقصى سرعة ممكنة؛ والشاحن الأكبر على 3 فاز لن يجعلها أسرع. تأكد أن الفيشة تناسب منفذ سيارتك، واطلب معاينة للموقع قبل الدفع.',
          )}
        </p>
      </section>

      <OwnerReviews kind="installer" targetId={installer.id} onRatingChanged={load} />

      <a className="inline-link" href={LIST_HREF}>
        <ExternalLink size={14} aria-hidden="true" className="flip-rtl" /> {back}
      </a>
    </PageFrame>
  )
}
