import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, Globe, Mail, MapPin, MessageCircle, Phone, ShieldHalf, X } from 'lucide-react'
import { AltBlock, PageFrame } from '../components/layout'
import { OwnerReviews, Rating } from '../components/OwnerReviews'
import { Segmented } from '../components/Segmented'
import { COVERS, COVER_LABELS, either, insurerName, pct, planName, yearlyPremium } from '../features/insurance/labels'
import { useMarketData } from '../features/market/useMarketData'
import { egp, whatsappLink } from '../features/parts/labels'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured, type ApiInsurer, type InsuranceCover } from '../lib/api'
import { formatDate } from '../lib/format'
import { TRIMS, useTrim } from '../vehicle/trimContext'
import { ServiceUnavailable } from './AccountPage'

type Sort = 'rate' | 'cashback' | 'rating'

/** The trim switch and the car price the premiums are worked out from. */
function TrimPrice() {
  const { tx } = useLanguage()
  const { trim, setTrim } = useTrim()
  const market = useMarketData()
  const price = market.priceFor(trim).priceEgp

  return (
    <div className="insurance-basis">
      <Segmented
        label={tx('Trim', 'الفئة')}
        value={trim}
        onChange={setTrim}
        options={TRIMS.map((item) => ({ value: item.value, label: item.label }))}
      />
      <p className="muted-note">
        {price > 0
          ? tx(`Yearly costs below are for a car worth ${egp.format(price)}, the current list price.`, `التكاليف السنوية أدناه لسيارة قيمتها ${egp.format(price)}، السعر الرسمي الحالي.`)
          : tx('No list price yet, so only the rates are shown.', 'لا يوجد سعر رسمي بعد، لذلك تظهر النسب فقط.')}
      </p>
    </div>
  )
}

/** The current list price of the trim the reader picked. */
function useCarPrice(): number {
  const { trim } = useTrim()
  return useMarketData().priceFor(trim).priceEgp
}

export function InsurancePage() {
  const { tx, language } = useLanguage()
  const price = useCarPrice()
  const [insurers, setInsurers] = useState<ApiInsurer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('rate')
  const [needs, setNeeds] = useState<InsuranceCover[]>([])

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false
    api
      .listInsurers()
      .then(({ insurers: list }) => {
        if (!cancelled) setInsurers(list)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Could not load the insurance companies.', 'تعذر تحميل شركات التأمين.'))
      })

    return () => {
      cancelled = true
    }
  }, [tx])

  const shown = useMemo(() => {
    if (!insurers) return null
    // An insurer qualifies when one of its plans covers everything ticked.
    const list = insurers.filter(
      (insurer) => needs.length === 0 || insurer.plans.some((plan) => needs.every((cover) => plan.covers.includes(cover))),
    )
    const sorted = [...list]
    if (sort === 'rate') sorted.sort((a, b) => (a.lowestRatePct ?? Infinity) - (b.lowestRatePct ?? Infinity))
    if (sort === 'cashback') sorted.sort((a, b) => (b.bestCashbackPct ?? -1) - (a.bestCashbackPct ?? -1))
    if (sort === 'rating') sorted.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    return sorted
  }, [insurers, needs, sort])

  if (!apiConfigured) return <ServiceUnavailable />

  return (
    <PageFrame
      eyebrow={tx('Market', 'السوق')}
      title={tx('Car insurance', 'تأمين السيارة')}
      intro={tx(
        'Insurance companies in Egypt and their plans for the V27: the yearly rate, what each plan covers, cashback, the deductible and the terms. Yearly costs are worked out from the current list price.',
        'شركات التأمين في مصر وخططها لسيارة V27: النسبة السنوية، وما تغطيه كل خطة، والاسترداد النقدي، ونسبة التحمل والشروط. التكاليف السنوية محسوبة من السعر الرسمي الحالي.',
      )}
    >
      <TrimPrice />

      <div className="part-filters">
        <div className="part-chip-row" role="group" aria-label={tx('Must cover', 'يجب أن تغطي')}>
          <span className="insurance-needs-label">{tx('Must cover:', 'يجب أن تغطي:')}</span>
          {COVERS.map((cover) => {
            const on = needs.includes(cover)
            return (
              <button
                key={cover}
                type="button"
                className={on ? 'part-chip selected' : 'part-chip'}
                aria-pressed={on}
                onClick={() => setNeeds((current) => (on ? current.filter((item) => item !== cover) : [...current, cover]))}
              >
                {tx(COVER_LABELS[cover].en, COVER_LABELS[cover].ar)}
              </button>
            )
          })}
        </div>
        <div className="part-filter-row">
          <label className="part-sort">
            <span>{tx('Sort', 'الترتيب')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="rate">{tx('Lowest rate first', 'الأقل نسبة أولا')}</option>
              <option value="cashback">{tx('Best cashback first', 'الأعلى استردادا أولا')}</option>
              <option value="rating">{tx('Best rated', 'الأعلى تقييما')}</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {shown === null && !error && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>}
      {shown?.length === 0 && (
        <p className="muted-note">
          {insurers?.length === 0
            ? tx('No insurance companies listed yet.', 'لا توجد شركات تأمين مدرجة بعد.')
            : tx('No plan covers everything ticked.', 'لا توجد خطة تغطي كل ما اخترته.')}
        </p>
      )}

      <div className="part-grid">
        {shown?.map((insurer) => {
          const premiums = insurer.plans
            .map((plan) => yearlyPremium(plan, price))
            .filter((value): value is number => value !== null)
          const cheapest = premiums.length > 0 ? Math.min(...premiums) : null
          return (
            <a className="part-card" key={insurer.id} href={`#/insurance/${insurer.slug}`}>
              <div className="part-card-image insurer-logo">
                {insurer.images[0] ? (
                  <img src={insurer.images[0].url} alt={insurer.images[0].alt ?? ''} loading="lazy" />
                ) : (
                  <ShieldHalf size={36} aria-hidden="true" />
                )}
              </div>
              <div className="part-card-body">
                <small>{tx(`${insurer.plans.length} plan(s)`, `${insurer.plans.length} خطة`)}</small>
                <h2>{insurerName(insurer, language)}</h2>
                <div className="part-card-foot">
                  {insurer.lowestRatePct !== null ? (
                    <strong>
                      {tx('From', 'من')} <span dir="ltr">{pct(insurer.lowestRatePct)}</span> {tx('a year', 'سنويا')}
                    </strong>
                  ) : (
                    <span className="muted-note">{tx('Ask for a quote', 'اطلب عرض سعر')}</span>
                  )}
                  {insurer.bestCashbackPct !== null && (
                    <span className="badge ok">
                      {tx('Cashback', 'استرداد')} <span dir="ltr">&nbsp;{pct(insurer.bestCashbackPct)}</span>
                    </span>
                  )}
                </div>
                {cheapest !== null && (
                  <small>
                    ≈ <span dir="ltr">{egp.format(cheapest)}</span> {tx('a year', 'سنويا')}
                  </small>
                )}
                {insurer.ratingCount > 0 && <Rating value={insurer.ratingAvg} count={insurer.ratingCount} />}
              </div>
            </a>
          )
        })}
      </div>

      <p className="muted-note insurance-disclaimer">
        {tx(
          'Rates and costs are a guide from what each company published or quoted on the date shown. The policy document is what counts: read the exclusions before you sign.',
          'النسب والتكاليف استرشادية مما نشرته أو ذكرته كل شركة في التاريخ الموضح. وثيقة التأمين هي المرجع: اقرأ الاستثناءات قبل التوقيع.',
        )}
      </p>
    </PageFrame>
  )
}

export function InsurerPage({ slug }: { slug: string }) {
  const { tx, t, alt, language } = useLanguage()
  const price = useCarPrice()
  const [insurer, setInsurer] = useState<ApiInsurer | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .readInsurer(slug)
      .then(({ insurer: found }) => setInsurer(found))
      .catch(() => setError(tx('Insurance company not found.', 'شركة التأمين غير موجودة.')))
  }, [slug, tx])

  useEffect(() => {
    if (apiConfigured) load()
  }, [load])

  if (!apiConfigured) return <ServiceUnavailable />

  const crumbs = [{ label: tx('Car insurance', 'تأمين السيارة'), href: '#/insurance' }]

  if (error || !insurer) {
    return (
      <PageFrame eyebrow={tx('Insurance', 'التأمين')} title={error ?? tx('Loading…', 'جارٍ التحميل…')} intro="" breadcrumbs={crumbs}>
        {error ? (
          <a className="primary-action" href="#/insurance">
            {tx('Back to car insurance', 'ارجع إلى تأمين السيارة')}
          </a>
        ) : (
          <span />
        )}
      </PageFrame>
    )
  }

  const name = insurerName(insurer, language)
  const side = language === 'ar' && insurer.description.ar ? 'ar' : 'en'
  const description = insurer.description[side] || insurer.description.en || insurer.description.ar
  // The Arabic underneath only when it is a second version, not the fallback already shown.
  const descriptionAlt = side === 'en' && insurer.description.en && insurer.description.ar ? alt(insurer.description) : null
  const logo = insurer.images[0]

  return (
    <PageFrame eyebrow={tx('Car insurance', 'تأمين السيارة')} title={name} intro="" breadcrumbs={[...crumbs, { label: name }]}>
      <div className="insurer-head">
        <div className="insurer-head-logo">
          {logo ? <img src={logo.url} alt={logo.alt ?? name} /> : <ShieldHalf size={40} aria-hidden="true" />}
        </div>
        <div className="part-summary">
          <div className="part-badges">
            {insurer.ratingCount > 0 && <Rating value={insurer.ratingAvg} count={insurer.ratingCount} />}
            {insurer.lowestRatePct !== null && (
              <span className="center-from">
                {tx('Plans from', 'الخطط تبدأ من')} <strong dir="ltr">{pct(insurer.lowestRatePct)}</strong> {tx('a year', 'سنويا')}
              </span>
            )}
          </div>
          {insurer.branches && (
            <p className="center-contact-line">
              <MapPin size={16} aria-hidden="true" /> {insurer.branches}
            </p>
          )}
          <div className="part-supplier-actions">
            {insurer.hotline && (
              <a className="part-action" href={`tel:${insurer.hotline.replace(/[^\d+]/g, '')}`} dir="ltr">
                <Phone size={14} aria-hidden="true" /> {insurer.hotline}
              </a>
            )}
            {insurer.phone && (
              <a className="part-action" href={`tel:${insurer.phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                <Phone size={14} aria-hidden="true" /> {insurer.phone}
              </a>
            )}
            {insurer.whatsapp && (
              <a className="part-action" href={whatsappLink(insurer.whatsapp)} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
              </a>
            )}
            {insurer.website && (
              <a className="part-action" href={insurer.website} target="_blank" rel="noopener noreferrer nofollow">
                <Globe size={14} aria-hidden="true" /> {tx('Website', 'الموقع')}
              </a>
            )}
            {insurer.email && (
              <a className="part-action" href={`mailto:${insurer.email}`}>
                <Mail size={14} aria-hidden="true" /> {tx('Email', 'البريد')}
              </a>
            )}
          </div>
          <p className="muted-note part-checked">
            {tx('Plans last checked', 'آخر تحقق من الخطط')} {formatDate(insurer.checkedAt, language)}
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
        <h2>{tx('Plans', 'الخطط')}</h2>
        <TrimPrice />

        {insurer.plans.length === 0 && (
          <p className="muted-note">{tx('No plans listed yet. Contact the company for a quote.', 'لا توجد خطط مدرجة بعد. تواصل مع الشركة لطلب عرض سعر.')}</p>
        )}

        <div className="center-packages">
          {insurer.plans.map((plan) => {
            const premium = yearlyPremium(plan, price)
            const cashback = premium !== null && plan.cashbackPct ? Math.round((premium * plan.cashbackPct) / 100) : null
            const cashbackWhen = either(plan.cashbackCondition, language)
            const installments = either(plan.installments, language)
            const notes = either(plan.notes, language)
            const deductible = [
              plan.deductiblePct !== undefined ? pct(plan.deductiblePct) : null,
              plan.deductibleEgp !== undefined ? egp.format(plan.deductibleEgp) : null,
            ]
              .filter(Boolean)
              .join(tx(' or ', ' أو '))

            const terms = [
              {
                label: tx('Agency repair', 'الإصلاح بالتوكيل'),
                value:
                  plan.agencyRepairYears === undefined
                    ? ''
                    : plan.agencyRepairYears === 0
                      ? tx('No', 'لا')
                      : tx(`First ${plan.agencyRepairYears} year(s)`, `أول ${plan.agencyRepairYears} سنوات`),
              },
              { label: tx('Deductible per claim', 'نسبة التحمل لكل مطالبة'), value: deductible },
              {
                label: tx('No-claims discount', 'خصم عدم المطالبة'),
                value: plan.noClaimsDiscountPct === undefined ? '' : pct(plan.noClaimsDiscountPct),
              },
              {
                label: tx('Oldest car accepted', 'أقصى عمر للسيارة'),
                value: plan.maxCarAgeYears === undefined ? '' : tx(`${plan.maxCarAgeYears} years`, `${plan.maxCarAgeYears} سنوات`),
              },
              { label: tx('Minimum premium', 'الحد الأدنى للقسط'), value: plan.minPremiumEgp === undefined ? '' : egp.format(plan.minPremiumEgp) },
              { label: tx('Installments', 'التقسيط'), value: installments ?? '' },
            ].filter((row) => row.value)

            return (
              <article className="center-package-card" id={`plan-${plan.id}`} key={plan.id}>
                <header>
                  <h3>{planName(plan, language)}</h3>
                  <div className="center-package-price">
                    {plan.ratePct !== undefined ? (
                      <>
                        <span>
                          <strong dir="ltr">{pct(plan.ratePct)}</strong> {tx('a year', 'سنويا')}
                        </span>
                        {premium !== null && (
                          <span>
                            ≈ <strong dir="ltr">{egp.format(premium)}</strong>
                          </span>
                        )}
                      </>
                    ) : (
                      <strong>{tx('Ask for a quote', 'اطلب عرض سعر')}</strong>
                    )}
                  </div>
                </header>

                {plan.cashbackPct !== undefined && plan.cashbackPct > 0 && (
                  <p className="insurance-cashback">
                    <strong>
                      {tx('Cashback', 'استرداد نقدي')} <span dir="ltr">{pct(plan.cashbackPct)}</span>
                    </strong>
                    {cashback !== null && (
                      <>
                        {' '}
                        ≈ <span dir="ltr">{egp.format(cashback)}</span>
                      </>
                    )}
                    {cashbackWhen && <small>{cashbackWhen}</small>}
                  </p>
                )}

                <div>
                  <p className="center-package-label">{tx('Covers', 'يغطي')}</p>
                  {/* Every cover is listed, ticked or crossed, so plans compare line by line. */}
                  <ul className="insurance-covers">
                    {COVERS.filter((cover) => plan.covers.includes(cover)).map((cover) => (
                      <li key={cover} className="yes">
                        <Check size={14} aria-hidden="true" /> {t(COVER_LABELS[cover])}
                      </li>
                    ))}
                    {COVERS.filter((cover) => !plan.covers.includes(cover)).map((cover) => (
                      <li key={cover} className="no">
                        <X size={14} aria-hidden="true" /> {t(COVER_LABELS[cover])}
                      </li>
                    ))}
                  </ul>
                </div>

                {terms.length > 0 && (
                  <dl className="center-package-specs">
                    {terms.map((row) => (
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
            'Yearly cost = rate × the current list price, and never below the minimum premium. Your quote can differ with the car’s insured value, your age and claims history. Confirm the cover and exclusions in the policy before you sign.',
            'التكلفة السنوية = النسبة × السعر الرسمي الحالي، ولا تقل عن الحد الأدنى للقسط. قد يختلف عرضك حسب القيمة التأمينية للسيارة وعمرك وسجل مطالباتك. تأكد من التغطية والاستثناءات في الوثيقة قبل التوقيع.',
          )}
        </p>
      </section>

      <OwnerReviews kind="insurer" targetId={insurer.id} onRatingChanged={load} />

      <a className="inline-link" href="#/insurance">
        <ExternalLink size={14} aria-hidden="true" className="flip-rtl" /> {tx('Back to car insurance', 'ارجع إلى تأمين السيارة')}
      </a>
    </PageFrame>
  )
}
