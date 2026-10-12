import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ExternalLink, MessageCircle, Package, Phone, Star, Store, Trash2 } from 'lucide-react'
import { AltBlock, PageFrame } from '../components/layout'
import { useAuth } from '../auth/authContext'
import type { Trim } from '../content/types'
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_TONE,
  CATEGORIES,
  CATEGORY_LABELS,
  SOURCE_LABELS,
  egp,
  formatOriginal,
  leadTimeText,
  partName,
  partSide,
  whatsappLink,
} from '../features/parts/labels'
import { useLanguage } from '../i18n/languageContext'
import { ApiError, api, apiConfigured, type ApiPart, type ApiPartReview, type PartCategory, type PartSource } from '../lib/api'
import { formatDate } from '../lib/format'
import { sideDir } from '../lib/postLanguage'
import { ServiceUnavailable } from './AccountPage'

type Sort = 'category' | 'price-asc' | 'price-desc' | 'rating'

const asCategory = (value: string | null): PartCategory | 'all' =>
  CATEGORIES.includes(value as PartCategory) ? (value as PartCategory) : 'all'
const asSource = (value: string | null): PartSource | 'all' => (value === 'local' || value === 'china' ? value : 'all')
const asTrim = (value: string | null): Trim | 'all' => (value === 'play' || value === 'wild' ? value : 'all')

/** A part with no trims listed fits both. */
const fitsTrim = (part: ApiPart, trim: Trim | 'all') =>
  trim === 'all' || part.specs.fitsTrims.length === 0 || part.specs.fitsTrims.includes(trim)

export function AccessoriesPage({ params }: { params: URLSearchParams }) {
  const { tx, t, language } = useLanguage()
  const [parts, setParts] = useState<ApiPart[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A link such as #/accessories?category=protection opens pre-filtered.
  const [category, setCategory] = useState<PartCategory | 'all'>(() => asCategory(params.get('category')))
  const [source, setSource] = useState<PartSource | 'all'>(() => asSource(params.get('source')))
  const [trim, setTrim] = useState<Trim | 'all'>(() => asTrim(params.get('trim')))
  const [sort, setSort] = useState<Sort>('category')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false
    api
      .listParts()
      .then(({ parts: list }) => {
        if (!cancelled) setParts(list)
      })
      .catch(() => {
        if (!cancelled) setError(tx('Could not load the accessories.', 'تعذر تحميل الإكسسوارات.'))
      })

    return () => {
      cancelled = true
    }
  }, [tx])

  const shown = useMemo(() => {
    if (!parts) return null
    const needle = query.trim().toLowerCase()
    const list = parts.filter(
      (part) =>
        (category === 'all' || part.category === category) &&
        (source === 'all' || part.source === source) &&
        fitsTrim(part, trim) &&
        (!needle || `${part.name.en} ${part.name.ar} ${part.subcategory ?? ''}`.toLowerCase().includes(needle)),
    )
    const sorted = [...list]
    if (sort === 'price-asc') sorted.sort((a, b) => a.landedEgp - b.landedEgp)
    if (sort === 'price-desc') sorted.sort((a, b) => b.landedEgp - a.landedEgp)
    if (sort === 'rating') sorted.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    return sorted
  }, [parts, category, source, trim, sort, query])

  if (!apiConfigured) return <ServiceUnavailable />

  const chip = <T extends string>(value: T, current: T, onPick: (value: T) => void, label: string) => (
    <button
      key={value}
      type="button"
      className={value === current ? 'part-chip selected' : 'part-chip'}
      aria-pressed={value === current}
      onClick={() => onPick(value)}
    >
      {label}
    </button>
  )

  return (
    <PageFrame
      eyebrow={tx('Market', 'السوق')}
      title={tx('Accessories & protection', 'الإكسسوارات والحماية')}
      intro={tx(
        'Parts for the V27, one by one: what you can buy from shops in Egypt, what has to be imported from China, and what protects the car. Prices include shipping, customs and fitting where they apply.',
        'قطع V27 واحدة واحدة: ما يمكن شراؤه من محلات في مصر، وما يجب استيراده من الصين، وما يحمي السيارة. الأسعار تشمل الشحن والجمارك والتركيب عند وجودها.',
      )}
    >
      <div className="part-filters">
        <div className="part-chip-row" role="group" aria-label={tx('Category', 'الفئة')}>
          {chip('all', category, setCategory, tx('Everything', 'الكل'))}
          {CATEGORIES.map((key) => chip(key, category, setCategory, t(CATEGORY_LABELS[key])))}
        </div>
        <div className="part-filter-row">
          <div className="part-chip-row" role="group" aria-label={tx('Source', 'المصدر')}>
            {chip('all', source, setSource, tx('Local and import', 'محلي واستيراد'))}
            {chip('local', source, setSource, t(SOURCE_LABELS.local))}
            {chip('china', source, setSource, t(SOURCE_LABELS.china))}
          </div>
          <div className="part-chip-row" role="group" aria-label={tx('Trim', 'الفئة')}>
            {chip('all', trim, setTrim, tx('Both trims', 'الفئتان'))}
            {chip('play', trim, setTrim, 'Play')}
            {chip('wild', trim, setTrim, 'Wild')}
          </div>
        </div>
        <div className="part-filter-row">
          <input
            className="part-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('Search accessories…', 'ابحث في الإكسسوارات…')}
            aria-label={tx('Search accessories', 'ابحث في الإكسسوارات')}
          />
          <label className="part-sort">
            <span>{tx('Sort', 'الترتيب')}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="category">{tx('By category', 'حسب الفئة')}</option>
              <option value="price-asc">{tx('Cheapest first', 'الأرخص أولا')}</option>
              <option value="price-desc">{tx('Most expensive first', 'الأغلى أولا')}</option>
              <option value="rating">{tx('Best rated', 'الأعلى تقييما')}</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {shown === null && !error && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>}
      {shown?.length === 0 && (
        <p className="muted-note">
          {parts?.length === 0
            ? tx('No accessories listed yet.', 'لا توجد إكسسوارات مدرجة بعد.')
            : tx('Nothing matches these filters.', 'لا يوجد ما يطابق هذه الاختيارات.')}
        </p>
      )}

      <div className="part-grid">
        {shown?.map((part) => {
          const side = partSide(part, language)
          return (
            <a className="part-card" key={part.id} href={`#/accessories/${part.slug}`}>
              <div className="part-card-image">
                {part.images[0] ? (
                  <img src={part.images[0].url} alt={part.images[0].alt ?? ''} loading="lazy" />
                ) : (
                  <Package size={36} aria-hidden="true" />
                )}
                <span className={`badge part-source ${part.source}`}>{t(SOURCE_LABELS[part.source])}</span>
              </div>
              <div className="part-card-body">
                <small>
                  {t(CATEGORY_LABELS[part.category])}
                  {part.subcategory ? ` · ${part.subcategory}` : ''}
                </small>
                <h2 dir={sideDir(side)} lang={side}>
                  {partName(part, language)}
                </h2>
                <div className="part-card-foot">
                  <strong dir="ltr">{egp.format(part.landedEgp)}</strong>
                  <span className={`badge ${AVAILABILITY_TONE[part.availability]}`}>
                    {t(AVAILABILITY_LABELS[part.availability])}
                  </span>
                </div>
                {part.ratingCount > 0 && <Rating value={part.ratingAvg} count={part.ratingCount} />}
              </div>
            </a>
          )
        })}
      </div>
    </PageFrame>
  )
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="part-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= Math.round(value) ? 'filled' : undefined} />
      ))}
    </span>
  )
}

function Rating({ value, count }: { value: number; count: number }) {
  const { tx } = useLanguage()
  return (
    <span className="part-rating" aria-label={tx(`Rated ${value} of 5 by ${count} owners`, `تقييم ${value} من 5 من ${count} ملاك`)}>
      <Stars value={value} />
      <span>
        {value.toFixed(1)} · {count}
      </span>
    </span>
  )
}

export function AccessoryPage({ slug }: { slug: string }) {
  const { tx, t, alt, language } = useLanguage()
  const [part, setPart] = useState<ApiPart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState(0)

  const load = useCallback(() => {
    api
      .readPart(slug)
      .then(({ part: found }) => setPart(found))
      .catch(() => setError(tx('Accessory not found.', 'الإكسسوار غير موجود.')))
  }, [slug, tx])

  useEffect(() => {
    if (apiConfigured) load()
  }, [load])

  if (!apiConfigured) return <ServiceUnavailable />

  const crumbs = [{ label: tx('Accessories', 'الإكسسوارات'), href: '#/accessories' }]

  if (error || !part) {
    return (
      <PageFrame eyebrow={tx('Accessories', 'الإكسسوارات')} title={error ?? tx('Loading…', 'جارٍ التحميل…')} intro="" breadcrumbs={crumbs}>
        {error ? (
          <a className="primary-action" href="#/accessories">
            {tx('Back to accessories', 'ارجع إلى الإكسسوارات')}
          </a>
        ) : (
          <span />
        )}
      </PageFrame>
    )
  }

  const side = partSide(part, language)
  const name = partName(part, language)
  const description = part.description[side] || part.description.en || part.description.ar
  const descriptionAlt = side === 'en' && part.description.ar ? alt(part.description) : null
  const isImport = part.source === 'china'
  const { price, specs } = part
  const lead = leadTimeText(part.leadTimeDays, tx)
  const image = part.images[photo] ?? part.images[0]
  const importNotes = specs.importNotes
    ? specs.importNotes[language === 'ar' ? 'ar' : 'en'] || specs.importNotes.en || specs.importNotes.ar
    : null

  const priceRows = [
    { label: isImport ? tx('Item', 'القطعة') : tx('Price', 'السعر'), value: price.amountEgp },
    { label: tx('Shipping to Egypt', 'الشحن إلى مصر'), value: price.shippingEgp },
    { label: tx('Customs and fees', 'الجمارك والرسوم'), value: price.customsEgp },
    { label: tx('Installation', 'التركيب'), value: price.installEgp },
  ].filter((row) => row.value !== undefined)

  const specRows = [
    { label: tx('Fits', 'يناسب'), value: specs.fitsTrims.length === 0 ? tx('Play and Wild', 'Play و Wild') : specs.fitsTrims.map((trim) => (trim === 'play' ? 'Play' : 'Wild')).join(', ') },
    { label: tx('Material', 'الخامة'), value: specs.material },
    { label: tx('Colour / finish', 'اللون / التشطيب'), value: specs.color },
    { label: tx('Dimensions', 'الأبعاد'), value: specs.dimensions },
    { label: tx('Weight', 'الوزن'), value: specs.weightKg === undefined ? undefined : tx(`${specs.weightKg} kg`, `${specs.weightKg} كجم`) },
    { label: tx('Warranty', 'الضمان'), value: specs.warrantyMonths === undefined ? undefined : specs.warrantyMonths === 0 ? tx('None', 'لا يوجد') : tx(`${specs.warrantyMonths} months`, `${specs.warrantyMonths} شهر`) },
  ].filter((row) => row.value)

  return (
    <PageFrame
      eyebrow={`${t(CATEGORY_LABELS[part.category])}${part.subcategory ? ` · ${part.subcategory}` : ''}`}
      title={name}
      intro=""
      breadcrumbs={[...crumbs, { label: name }]}
    >
      <div className="part-detail">
        <div className="part-gallery">
          <div className="part-gallery-main">
            {image ? <img src={image.url} alt={image.alt ?? name} /> : <Package size={56} aria-hidden="true" />}
          </div>
          {part.images.length > 1 && (
            <div className="part-gallery-thumbs">
              {part.images.map((item, index) => (
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
            <span className={`badge part-source ${part.source}`}>{t(SOURCE_LABELS[part.source])}</span>
            <span className={`badge ${AVAILABILITY_TONE[part.availability]}`}>{t(AVAILABILITY_LABELS[part.availability])}</span>
            {part.ratingCount > 0 && <Rating value={part.ratingAvg} count={part.ratingCount} />}
          </div>

          <table className="part-price-table">
            <tbody>
              {priceRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td dir="ltr">{egp.format(row.value!)}</td>
                </tr>
              ))}
            </tbody>
            {priceRows.length > 1 && (
              <tfoot>
                <tr>
                  <th scope="row">{tx('Total on the car', 'التكلفة الكلية على السيارة')}</th>
                  <td dir="ltr">{egp.format(part.landedEgp)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {isImport && price.originalAmount !== undefined && price.originalCurrency && (
            <p className="muted-note">
              {tx('Seller price:', 'سعر البائع:')} <span dir="ltr">{formatOriginal(price.originalAmount, price.originalCurrency)}</span>
            </p>
          )}
          {lead && (
            <p className="muted-note">
              {isImport ? tx('Arrives in about', 'يصل خلال حوالي') : tx('Ready in about', 'جاهز خلال حوالي')} {lead}
            </p>
          )}
          <p className="muted-note part-checked">
            {tx('Price last checked', 'آخر تحقق من السعر')} {formatDate(part.priceCheckedAt, language)}
          </p>
        </div>
      </div>

      {description && (
        <section className="part-section">
          <p className="part-description" dir={sideDir(side)} lang={side}>
            {description}
          </p>
          {descriptionAlt && (
            <AltBlock>
              <p className="part-description">{descriptionAlt}</p>
            </AltBlock>
          )}
        </section>
      )}

      {part.suppliers.length > 0 && (
        <section className="part-section">
          <h2>{tx('Where to buy', 'أين تشتري')}</h2>
          <ul className="part-suppliers">
            {part.suppliers.map((supplier) => (
              <li key={`${supplier.name}-${supplier.url ?? supplier.phone ?? ''}`}>
                <div>
                  <strong>
                    <Store size={15} aria-hidden="true" /> {supplier.name}
                  </strong>
                  <small>
                    {supplier.kind === 'online' ? tx('Online store', 'متجر إلكتروني') : tx('Shop', 'محل')}
                    {supplier.city ? ` · ${supplier.city}` : ''}
                  </small>
                </div>
                <div className="part-supplier-actions">
                  {supplier.phone && (
                    <a className="part-action" href={`tel:${supplier.phone.replace(/[^\d+]/g, '')}`} dir="ltr">
                      <Phone size={14} aria-hidden="true" /> {supplier.phone}
                    </a>
                  )}
                  {supplier.whatsapp && (
                    <a className="part-action" href={whatsappLink(supplier.whatsapp)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                    </a>
                  )}
                  {supplier.url && (
                    <a className="part-action" href={supplier.url} target="_blank" rel="noopener noreferrer nofollow">
                      <ExternalLink size={14} aria-hidden="true" /> {tx('Open listing', 'افتح الصفحة')}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="muted-note">
            {tx(
              'Listed for convenience, not endorsed. Confirm the price and fit with the seller before paying.',
              'مدرجة للتسهيل وليست توصية. تأكد من السعر والمقاس مع البائع قبل الدفع.',
            )}
          </p>
        </section>
      )}

      {specRows.length > 0 && (
        <section className="part-section">
          <h2>{tx('Specifications', 'المواصفات')}</h2>
          <dl className="part-specs">
            {specRows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {importNotes && (
        <section className="part-section">
          <h2>{tx('Importing it', 'عن الاستيراد')}</h2>
          <p className="part-description">{importNotes}</p>
        </section>
      )}

      <PartReviews part={part} onRatingChanged={load} />

      <a className="inline-link" href="#/accessories">
        {tx('Back to accessories', 'ارجع إلى الإكسسوارات')}
      </a>
    </PageFrame>
  )
}

/** Approved owner reviews, and the form for owners who have not written one yet. */
function PartReviews({ part, onRatingChanged }: { part: ApiPart; onRatingChanged: () => void }) {
  const { tx, language } = useLanguage()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ApiPartReview[]>([])
  const [mine, setMine] = useState<ApiPartReview | null>(null)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isOwner = user?.ownership === 'owner'

  const load = useCallback(() => {
    api
      .listPartReviews(part.id)
      .then(({ reviews: list }) => setReviews(list))
      .catch(() => undefined)
    if (isOwner) {
      api
        .myPartReview(part.id)
        .then(({ reviews: list }) => setMine(list[0] ?? null))
        .catch(() => undefined)
    }
  }, [part.id, isOwner])

  useEffect(load, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (rating === 0) {
      setError(tx('Pick a star rating first.', 'اختر عدد النجوم أولا.'))
      return
    }

    setBusy(true)
    try {
      const { review } = await api.createPartReview({ partId: part.id, rating, body })
      setMine(review)
      setBody('')
      setRating(0)
      if (review.status === 'approved') {
        load()
        onRatingChanged()
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not send.', 'تعذر الإرسال.'))
    } finally {
      setBusy(false)
    }
  }

  async function withdraw() {
    if (!mine) return
    try {
      await api.deletePartReview(mine.id)
      const wasLive = mine.status === 'approved'
      setMine(null)
      load()
      if (wasLive) onRatingChanged()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not remove.', 'تعذر الحذف.'))
    }
  }

  return (
    <section className="comments part-reviews">
      <h2>
        <Star size={18} aria-hidden="true" />
        {tx('Owner reviews', 'مراجعات الملاك')}
        {reviews.length > 0 && <span className="comment-count">{reviews.length}</span>}
      </h2>

      {reviews.length === 0 && <p className="muted-note">{tx('No reviews yet.', 'لا توجد مراجعات بعد.')}</p>}

      <ol className="comment-list">
        {reviews.map((review) => (
          <li key={review.id}>
            <header>
              <strong>{review.authorName}</strong>
              <time dateTime={review.createdAt}>{formatDate(review.createdAt, language)}</time>
            </header>
            <Stars value={review.rating} size={13} />
            <p>{review.body}</p>
          </li>
        ))}
      </ol>

      {!user ? (
        <p className="muted-note">
          <a className="inline-link" href="#/signin">
            {tx('Sign in to review', 'سجل الدخول لتكتب مراجعة')}
          </a>
        </p>
      ) : !isOwner ? (
        <p className="muted-note">
          {tx('Only V27 owners can review accessories.', 'يمكن لملاك V27 فقط تقييم الإكسسوارات.')}{' '}
          <a className="inline-link" href="#/account/profile">
            {tx('Own one? Say so on your profile.', 'تملك واحدة؟ اذكر ذلك في ملفك الشخصي.')}
          </a>
        </p>
      ) : mine ? (
        <div className="review-banner part-my-review">
          <p>
            {mine.status === 'pending'
              ? tx('Your review is waiting for a moderator.', 'مراجعتك في انتظار المشرف.')
              : mine.status === 'approved'
                ? tx('Your review is published above.', 'مراجعتك منشورة أعلاه.')
                : tx('Your review was not accepted.', 'لم تُقبل مراجعتك.')}
            {mine.reviewNote ? ` ${mine.reviewNote}` : ''}
          </p>
          <button type="button" className="comment-remove" onClick={withdraw}>
            <Trash2 size={13} aria-hidden="true" /> {tx('Remove my review', 'احذف مراجعتي')}
          </button>
        </div>
      ) : (
        <form className="comment-form" onSubmit={submit}>
          <div className="part-star-picker" role="radiogroup" aria-label={tx('Your rating', 'تقييمك')}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={tx(`${value} stars`, `${value} نجوم`)}
                className={value <= rating ? 'filled' : undefined}
                onClick={() => setRating(value)}
              >
                <Star size={22} aria-hidden="true" />
              </button>
            ))}
          </div>
          <label>
            <span>{tx('Your experience with it', 'تجربتك معه')}</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={2} maxLength={2000} rows={3} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Post review', 'أرسل المراجعة')}
          </button>
        </form>
      )}
    </section>
  )
}
