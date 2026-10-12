import { useState, type FormEvent } from 'react'
import { Check, ShoppingBag } from 'lucide-react'
import { useAuth } from '../../auth/authContext'
import { useLanguage } from '../../i18n/languageContext'
import { ApiError, type ApiPart } from '../../lib/api'
import { egp } from '../parts/labels'
import { useCart } from './cartContext'

const MAX_QUANTITY = 20

/**
 * On an accessory's page: put it on the request list with how many, whether
 * it should be fitted, and a note. Shown as an edit of the line when the
 * accessory is already on the list.
 */
export function AddToRequest({ part }: { part: ApiPart }) {
  const line = useCart().lineFor(part.id)
  // The list loads after the page; keying on the saved line restarts the form
  // with what is saved once it arrives, and after each save.
  const key = line ? `${line.quantity}|${line.fitting}|${line.note ?? ''}` : 'new'
  return <RequestForm key={key} part={part} />
}

function RequestForm({ part }: { part: ApiPart }) {
  const { tx } = useLanguage()
  const { user } = useAuth()
  const cart = useCart()
  const line = cart.lineFor(part.id)
  const [quantity, setQuantity] = useState(line?.quantity ?? 1)
  const [fitting, setFitting] = useState(line?.fitting ?? false)
  const [note, setNote] = useState(line?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  if (part.availability === 'unavailable') {
    return <p className="muted-note request-box">{tx('Not available to request right now.', 'غير متاح للطلب حاليا.')}</p>
  }

  if (!user) {
    return (
      <div className="request-box">
        <a className="primary-action" href={`#/signin?next=${encodeURIComponent(`/accessories/${part.slug}`)}`}>
          <ShoppingBag size={17} aria-hidden="true" /> {tx('Sign in to request it', 'سجل الدخول لتطلبه')}
        </a>
        <p className="muted-note">{tx('We order it and deliver or fit it for you.', 'نطلبه لك ونسلمه أو نركبه.')}</p>
      </div>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await cart.put({ partId: part.id, quantity, fitting, note: note.trim() || undefined })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not add it.', 'تعذرت الإضافة.'))
    }
  }

  const unit = part.price.amountEgp + (part.price.shippingEgp ?? 0) + (part.price.customsEgp ?? 0)
  const install = fitting ? (part.price.installEgp ?? 0) : 0

  return (
    <form className="request-box" onSubmit={submit}>
      <h2>{tx('Request it', 'اطلبه')}</h2>
      <p className="muted-note">
        {tx(
          'We order it for you and agree the final price by phone. Nothing is paid on the site.',
          'نطلبه لك ونتفق على السعر النهائي بالهاتف. لا يتم الدفع على الموقع.',
        )}
      </p>

      <div className="request-row">
        <label className="request-quantity">
          <span>{tx('Quantity', 'الكمية')}</span>
          <span className="stepper">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label={tx('One fewer', 'أقل')} disabled={quantity <= 1}>
              −
            </button>
            <input
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              onChange={(event) => setQuantity(Math.min(MAX_QUANTITY, Math.max(1, Math.round(Number(event.target.value) || 1))))}
              dir="ltr"
            />
            <button type="button" onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))} aria-label={tx('One more', 'أكثر')} disabled={quantity >= MAX_QUANTITY}>
              +
            </button>
          </span>
        </label>

        <label className="checkbox-row request-fitting">
          <input type="checkbox" checked={fitting} onChange={(event) => setFitting(event.target.checked)} />
          <span>
            {tx('Fit it for me', 'ركّبه لي')}
            {part.price.installEgp !== undefined ? (
              <small dir="ltr"> +{egp.format(part.price.installEgp)}</small>
            ) : (
              <small> {tx('(price on request)', '(السعر عند الطلب)')}</small>
            )}
          </span>
        </label>
      </div>

      <label className="request-note">
        <span>{tx('Note (optional)', 'ملاحظة (اختياري)')}</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          placeholder={tx('Colour, size, for the Wild…', 'اللون، المقاس، لفئة Wild…')}
        />
      </label>

      <p className="request-estimate">
        <span>{tx('Estimate', 'التقدير')}</span>
        <strong dir="ltr">{egp.format(unit * quantity + install)}</strong>
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="request-actions">
        <button className="primary-action" type="submit" disabled={cart.busy}>
          <ShoppingBag size={17} aria-hidden="true" />
          {line ? tx('Update my request', 'حدّث طلبي') : tx('Add to my request', 'أضف إلى طلبي')}
        </button>
        {line && (
          <a className="inline-link" href="#/cart">
            <Check size={15} aria-hidden="true" /> {tx('On your request list · view it', 'في قائمة طلبك · اعرضها')}
          </a>
        )}
      </div>
    </form>
  )
}
