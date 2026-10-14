import { useState, type FormEvent } from 'react'
import { Store, UserPlus, X } from 'lucide-react'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { useShortText } from '../../i18n/languageContext'
import { api, type ApiMerchant } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

/**
 * Staff only: the accounts that run this business and may edit this listing
 * themselves. Each is an ordinary account that signed up on the site; linking
 * it here is what lets it in, and unlinking takes effect on its next request.
 */
export function MerchantAccounts({
  kind,
  listingId,
  initial,
}: {
  kind: 'insurers' | 'centers'
  listingId: string
  initial: ApiMerchant[]
}) {
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [merchants, setMerchants] = useState(initial)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const { merchant } = await api.addMerchant(kind, listingId, email.trim())
      setMerchants((list) => (list.some((item) => item.id === merchant.id) ? list : [...list, merchant]))
      setEmail('')
      toast(tx(`${merchant.name} can now edit this listing.`, `${merchant.name} يمكنه الآن تعديل هذه الصفحة.`))
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not add.', 'تعذرت الإضافة.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove(merchant: ApiMerchant) {
    const ok = await confirm({
      title: tx(`Remove ${merchant.name}?`, `إزالة ${merchant.name}؟`),
      message: tx('They will no longer be able to edit this listing.', 'لن يتمكن من تعديل هذه الصفحة بعد الآن.'),
      confirmLabel: tx('Remove access', 'إزالة الصلاحية'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.removeMerchant(kind, listingId, merchant.id)
      setMerchants((list) => list.filter((item) => item.id !== merchant.id))
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not remove.', 'تعذرت الإزالة.')), 'error')
    }
  }

  return (
    <section className="merchant-accounts">
      <h4>
        <Store size={16} aria-hidden="true" /> {tx('Merchant accounts', 'حسابات التاجر')}
      </h4>
      <p className="panel-muted">
        {tx(
          'People from this business who may edit this listing themselves: details, photos and their plans or packages. They see only this listing, cannot remove it, and every change they make is in the activity log.',
          'أشخاص من هذه الشركة يمكنهم تعديل هذه الصفحة بأنفسهم: البيانات والصور والخطط أو الباقات. يرون هذه الصفحة فقط، ولا يمكنهم حذفها، وكل تعديل يسجل في سجل النشاط.',
        )}
      </p>

      {merchants.length > 0 ? (
        <ul>
          {merchants.map((merchant) => (
            <li key={merchant.id}>
              <span>
                <strong>{merchant.name}</strong>
                <small dir="ltr">{merchant.email}</small>
              </span>
              <button
                type="button"
                className="panel-icon-button danger"
                onClick={() => remove(merchant)}
                aria-label={tx(`Remove ${merchant.name}`, `إزالة ${merchant.name}`)}
                title={tx('Remove access', 'إزالة الصلاحية')}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel-muted">{tx('Nobody yet. Only the site team can edit it.', 'لا أحد بعد. فريق الموقع فقط يمكنه التعديل.')}</p>
      )}

      {/* A separate form: it saves on its own, without saving the listing. */}
      <form className="merchant-add" onSubmit={add}>
        <input
          id={`merchant-email-${listingId}`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={tx('Their account email', 'بريد حسابه')}
          aria-label={tx('Their account email', 'بريد حسابه')}
          required
          dir="ltr"
        />
        <button type="submit" className="panel-button" disabled={busy || !email.trim()}>
          <UserPlus size={16} aria-hidden="true" /> {tx('Add', 'أضف')}
        </button>
      </form>
      <small className="panel-muted">
        {tx('They need an account on the site first: ask them to sign up, then add their email here.', 'يحتاجون حسابا على الموقع أولا: اطلب منهم التسجيل ثم أضف بريدهم هنا.')}
      </small>
    </section>
  )
}
