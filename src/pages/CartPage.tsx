import { useState, type FormEvent } from 'react'
import { Package, ShoppingBag, Trash2 } from 'lucide-react'
import { PageFrame } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useCart } from '../features/orders/cartContext'
import { cartEstimate, cartHasUnpriced, lineTotal } from '../features/orders/labels'
import { SOURCE_LABELS, egp, leadTimeText, partName, priceOrAsk } from '../features/parts/labels'
import { useLanguage } from '../i18n/languageContext'
import { ApiError, api, apiConfigured, type ApiCartLine } from '../lib/api'
import { ServiceUnavailable } from './AccountPage'
import { Req, RequiredLegend } from '../components/RequiredMark'

/**
 * The request list: what the user wants ordered, and how to reach them. It is
 * saved on their account as they edit it; sending it turns it into a request
 * the team works through.
 */
export function CartPage() {
  const { tx } = useLanguage()
  const { user, loading } = useAuth()
  const cart = useCart()

  if (!apiConfigured) return <ServiceUnavailable />

  const frame = (children: React.ReactNode) => (
    <PageFrame
      eyebrow={tx('Accessories', 'الإكسسوارات')}
      title={tx('My request list', 'قائمة طلبي')}
      intro={tx(
        'Accessories you want us to order for you. The list is saved on your account; send it when it is ready and we will call you to confirm the price.',
        'الإكسسوارات التي تريد أن نطلبها لك. القائمة محفوظة في حسابك؛ أرسلها عندما تكون جاهزة وسنتصل بك لتأكيد السعر.',
      )}
    >
      {children}
    </PageFrame>
  )

  if (loading) return frame(<p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>)

  if (!user) {
    return frame(
      <a className="primary-action" href="#/signin?next=%2Fcart">
        {tx('Sign in to see your list', 'سجل الدخول لرؤية قائمتك')}
      </a>,
    )
  }

  if (cart.lines === null) return frame(<p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>)

  if (cart.lines.length === 0) {
    return frame(
      <div className="request-empty">
        <ShoppingBag size={32} aria-hidden="true" />
        <p>{tx('Your list is empty.', 'قائمتك فارغة.')}</p>
        <a className="primary-action" href="#/accessories">
          {tx('Browse accessories', 'تصفح الإكسسوارات')}
        </a>
        <a className="inline-link" href="#/account/orders">
          {tx('See requests you already sent', 'اعرض الطلبات التي أرسلتها')}
        </a>
      </div>,
    )
  }

  return frame(
    <div className="request-layout">
      <ul className="request-lines">
        {cart.lines.map((line) => (
          <CartLine key={line.partId} line={line} />
        ))}
      </ul>
      <SendRequest lines={cart.lines} />
    </div>,
  )
}

function CartLine({ line }: { line: ApiCartLine }) {
  const { tx, t, language } = useLanguage()
  const cart = useCart()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState(line.note ?? '')
  const part = line.part

  async function change(patch: Partial<Pick<ApiCartLine, 'quantity' | 'fitting' | 'note'>>) {
    setError(null)
    try {
      await cart.put({ partId: line.partId, quantity: line.quantity, fitting: line.fitting, note: line.note, ...patch })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    }
  }

  async function remove() {
    setError(null)
    try {
      await cart.remove(line.partId)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not remove.', 'تعذر الحذف.'))
    }
  }

  if (!part) {
    return (
      <li className="request-line gone">
        <div className="request-line-body">
          <strong>{tx('This accessory is no longer listed.', 'هذا الإكسسوار لم يعد معروضا.')}</strong>
          <p className="muted-note">{tx('Remove it to send your request.', 'احذفه لتتمكن من إرسال طلبك.')}</p>
        </div>
        <button type="button" className="comment-remove" onClick={remove}>
          <Trash2 size={13} aria-hidden="true" /> {tx('Remove', 'حذف')}
        </button>
      </li>
    )
  }

  const lead = leadTimeText(part.leadTimeDays, tx)
  const unavailable = part.availability === 'unavailable'

  return (
    <li className={unavailable ? 'request-line gone' : 'request-line'}>
      <a className="request-line-image" href={`#/accessories/${part.slug}`}>
        {part.image ? <img src={part.image.url} alt="" loading="lazy" /> : <Package size={22} aria-hidden="true" />}
      </a>
      <div className="request-line-body">
        <a className="request-line-name" href={`#/accessories/${part.slug}`}>
          {partName(part, language)}
        </a>
        <small>
          {t(SOURCE_LABELS[part.source])}
          {lead ? ` · ${lead}` : ''}
          {unavailable ? ` · ${tx('no longer available', 'لم يعد متاحا')}` : ''}
        </small>

        <div className="request-row">
          <span className="stepper">
            <button type="button" onClick={() => change({ quantity: line.quantity - 1 })} disabled={cart.busy || line.quantity <= 1} aria-label={tx('One fewer', 'أقل')}>
              −
            </button>
            <output aria-live="polite" dir="ltr">{line.quantity}</output>
            <button type="button" onClick={() => change({ quantity: line.quantity + 1 })} disabled={cart.busy || line.quantity >= 20} aria-label={tx('One more', 'أكثر')}>
              +
            </button>
          </span>
          <label className="checkbox-row request-fitting">
            <input type="checkbox" checked={line.fitting} disabled={cart.busy} onChange={(event) => change({ fitting: event.target.checked })} />
            <span>
              {tx('Fit it for me', 'ركّبه لي')}
              {part.installEgp === undefined && <small> {tx('(price on request)', '(السعر عند الطلب)')}</small>}
            </span>
          </label>
        </div>

        <input
          className="request-line-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => note.trim() !== (line.note ?? '') && change({ note: note.trim() || undefined })}
          maxLength={300}
          placeholder={tx('Note: colour, size…', 'ملاحظة: اللون، المقاس…')}
          aria-label={tx('Note for this accessory', 'ملاحظة لهذا الإكسسوار')}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
      <div className="request-line-side">
        <strong dir="ltr">
          {priceOrAsk(lineTotal({ ...line, unitPriceEgp: part.unitPriceEgp, installEgp: part.installEgp }), tx)}
        </strong>
        <button type="button" className="comment-remove" onClick={remove} disabled={cart.busy}>
          <Trash2 size={13} aria-hidden="true" /> {tx('Remove', 'حذف')}
        </button>
      </div>
    </li>
  )
}

/** Only rendered for a signed-in user, so the contact fields start from their profile. */
function SendRequest({ lines }: { lines: ApiCartLine[] }) {
  const { tx } = useLanguage()
  const { user } = useAuth()
  const cart = useCart()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState(user?.city ?? '')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const blocked = lines.some((line) => !line.part || line.part.availability === 'unavailable')
  const unpriced = cartHasUnpriced(lines)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { order } = await api.createOrder({
        contact: {
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
        },
        note: note.trim() || undefined,
      })
      await cart.refresh()
      window.location.hash = `#/account/orders?id=${order.id}`
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not send.', 'تعذر الإرسال.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="request-send" onSubmit={submit}>
      <p className="request-estimate">
        <span>{tx('Estimated total', 'الإجمالي التقديري')}</span>
        <strong dir="ltr">{egp.format(cartEstimate(lines))}</strong>
      </p>
      <p className="muted-note">
        {unpriced
          ? tx('Items or fitting without a listed price are priced when we confirm. ', 'القطع أو التركيب بلا سعر مدرج تُسعّر عند التأكيد. ')
          : ''}
        {tx('Prices for imports can move; we confirm the final price before ordering.', 'أسعار المستورد قد تتغير؛ نؤكد السعر النهائي قبل الطلب.')}
      </p>

      <h2>{tx('How to reach you', 'كيف نتواصل معك')}</h2>
      <RequiredLegend />
      <label>
        <span>
          {tx('Name', 'الاسم')}
          <Req />
        </span>
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
      </label>
      <label>
        <span>
          {tx('Phone', 'الهاتف')}
          <Req />
        </span>
        <input value={phone} onChange={(event) => setPhone(event.target.value)} required maxLength={32} dir="ltr" inputMode="tel" autoComplete="tel" />
      </label>
      <label>
        <span>{tx('WhatsApp, if different', 'واتساب إن اختلف')}</span>
        <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={32} dir="ltr" inputMode="tel" />
      </label>
      <label>
        <span>{tx('City', 'المدينة')}</span>
        <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} autoComplete="address-level2" />
      </label>
      <label>
        <span>{tx('Delivery address (optional)', 'عنوان التسليم (اختياري)')}</span>
        <textarea value={address} onChange={(event) => setAddress(event.target.value)} maxLength={400} rows={2} autoComplete="street-address" />
      </label>
      <label>
        <span>{tx('Anything else? (optional)', 'أي شيء آخر؟ (اختياري)')}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1500}
          rows={3}
          placeholder={tx('Best time to call, questions…', 'أفضل وقت للاتصال، أسئلة…')}
        />
      </label>

      {blocked && (
        <p className="form-error">{tx('Remove the accessories that are no longer available first.', 'احذف الإكسسوارات غير المتاحة أولا.')}</p>
      )}
      {error && <p className="form-error">{error}</p>}

      <button className="primary-action" type="submit" disabled={busy || blocked || cart.busy}>
        <ShoppingBag size={17} aria-hidden="true" />
        {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send my request', 'أرسل طلبي')}
      </button>
      <p className="muted-note">
        {tx('Your phone and address are seen only by the people who handle orders.', 'هاتفك وعنوانك يراهما فقط المسؤولون عن الطلبات.')}
      </p>
    </form>
  )
}
