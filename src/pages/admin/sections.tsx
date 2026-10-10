import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { StatusPill } from '../../components/StatusPill'
import { useLanguage } from '../../i18n/languageContext'
import {
  ApiError,
  api,
  type ApiDealer,
  type ApiPost,
  type ApiPricing,
  type ApiSuggestion,
  type ApiUser,
  type ReviewStatus,
} from '../../lib/api'
import { TRIMS } from '../../vehicle/trimContext'
import type { Trim } from '../../content/types'

/** Shared approve/reject controls for both moderation queues. */
function ReviewActions({
  onDecide,
  busy,
}: {
  onDecide: (status: 'approved' | 'rejected', note: string) => void
  busy: boolean
}) {
  const { tx } = useLanguage()
  const [note, setNote] = useState('')

  return (
    <div className="review-actions">
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={tx('Note to the author (optional)', 'ملاحظة للكاتب (اختياري)')}
        maxLength={1000}
      />
      <button type="button" className="approve" disabled={busy} onClick={() => onDecide('approved', note)}>
        <Check size={16} /> {tx('Approve', 'قبول')}
      </button>
      <button type="button" className="reject" disabled={busy} onClick={() => onDecide('rejected', note)}>
        <X size={16} /> {tx('Reject', 'رفض')}
      </button>
    </div>
  )
}

function useQueueFilter() {
  const { tx } = useLanguage()
  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending')

  const control = (
    <label className="select-control queue-filter">
      <span>{tx('Show', 'عرض')}</span>
      <select value={status} onChange={(event) => setStatus(event.target.value as ReviewStatus | 'all')}>
        <option value="pending">{tx('Awaiting review', 'في انتظار المراجعة')}</option>
        <option value="approved">{tx('Published', 'منشور')}</option>
        <option value="rejected">{tx('Not accepted', 'غير مقبول')}</option>
        <option value="all">{tx('Everything', 'الكل')}</option>
      </select>
    </label>
  )

  return { status, control }
}

/* ---------- moderation ---------- */

export function PostQueue({ onChanged }: { onChanged: () => void }) {
  const { t, tx } = useLanguage()
  const { status, control } = useQueueFilter()
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listPosts({ status })
      .then(({ posts: list }) => setPosts(list))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : tx('Could not load.', 'تعذر التحميل.')),
      )
  }, [status, tx])

  useEffect(load, [load])

  async function decide(id: string, decision: 'approved' | 'rejected', note: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.reviewPost(id, { status: decision, note: note || undefined })
      load()
      onChanged()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      {control}
      {error && <p className="form-error">{error}</p>}
      {posts.length === 0 && <p className="muted-note">{tx('Nothing here.', 'لا يوجد شيء هنا.')}</p>}

      <div className="review-list">
        {posts.map((post) => (
          <article className="review-card" key={post.id}>
            <header>
              <div>
                <h3>{t(post.title)}</h3>
                <small>
                  {post.authorName} · {new Date(post.createdAt).toLocaleDateString()}
                </small>
              </div>
              <StatusPill status={post.status} />
            </header>

            <p className="review-excerpt">{t(post.excerpt)}</p>
            <a className="inline-link" href={`#/blog/${post.slug}`}>
              {tx('Read the full post', 'اقرأ المقال كاملا')}
            </a>

            {post.status === 'pending' && (
              <ReviewActions busy={busyId === post.id} onDecide={(d, note) => decide(post.id, d, note)} />
            )}
          </article>
        ))}
      </div>
    </>
  )
}

export function SuggestionQueue({ onChanged }: { onChanged: () => void }) {
  const { tx } = useLanguage()
  const { status, control } = useQueueFilter()
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listSuggestions({ queue: true, status })
      .then(({ suggestions: list }) => setSuggestions(list))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : tx('Could not load.', 'تعذر التحميل.')),
      )
  }, [status, tx])

  useEffect(load, [load])

  async function decide(id: string, decision: 'approved' | 'rejected', note: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.reviewSuggestion(id, { status: decision, note: note || undefined })
      load()
      onChanged()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      {control}
      {error && <p className="form-error">{error}</p>}
      {suggestions.length === 0 && <p className="muted-note">{tx('Nothing here.', 'لا يوجد شيء هنا.')}</p>}

      <div className="review-list">
        {suggestions.map((suggestion) => (
          <article className="review-card" key={suggestion.id}>
            <header>
              <div>
                <h3>
                  {suggestion.target.kind} · {suggestion.target.id}
                  {suggestion.target.field ? ` · ${suggestion.target.field}` : ''}
                </h3>
                <small>
                  {suggestion.authorName} · {new Date(suggestion.createdAt).toLocaleDateString()}
                </small>
              </div>
              <StatusPill status={suggestion.status} />
            </header>

            <div className="diff-grid">
              <div>
                <strong>{tx('Now', 'الآن')}</strong>
                <p>{suggestion.current || tx('(not given)', '(غير محدد)')}</p>
              </div>
              <div>
                <strong>{tx('Proposed', 'المقترح')}</strong>
                <p>{suggestion.proposed}</p>
              </div>
            </div>

            <p className="review-reason">
              <strong>{tx('Source', 'المصدر')}:</strong> {suggestion.reason}
            </p>

            {suggestion.status === 'pending' && (
              <ReviewActions
                busy={busyId === suggestion.id}
                onDecide={(d, note) => decide(suggestion.id, d, note)}
              />
            )}
          </article>
        ))}
      </div>
    </>
  )
}

/* ---------- catalogue ---------- */

export function DealerAdmin() {
  const { tx } = useLanguage()
  const [dealers, setDealers] = useState<ApiDealer[]>([])
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [listPrice, setListPrice] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.listDealers().then(({ dealers: list }) => setDealers(list)).catch(() => undefined)
  }, [])

  useEffect(load, [load])

  async function add(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.createDealer({ name, area, phone: phone || undefined, notes: notes || undefined, sellsAtListPrice: listPrice })
      setName('')
      setArea('')
      setPhone('')
      setNotes('')
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      await api.removeDealer(id)
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not remove.', 'تعذر الحذف.'))
    }
  }

  return (
    <>
      <form className="auth-form wide" onSubmit={add}>
        <label>
          <span>{tx('Dealer name', 'اسم الوكيل')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={160} />
        </label>
        <label>
          <span>{tx('Area', 'المنطقة')}</span>
          <input value={area} onChange={(e) => setArea(e.target.value)} required minLength={2} maxLength={160} />
        </label>
        <label>
          <span>{tx('Phone', 'الهاتف')}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={60} dir="ltr" />
        </label>
        <label>
          <span>{tx('Notes', 'ملاحظات')}</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={listPrice} onChange={(e) => setListPrice(e.target.checked)} />
          <span>{tx('Sells at official list price', 'يبيع بالسعر الرسمي')}</span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary-action" type="submit" disabled={busy}>
          <Plus size={18} /> {tx('Add dealer', 'أضف وكيلا')}
        </button>
      </form>

      <div className="review-list">
        {dealers.map((dealer) => (
          <div className="review-item" key={dealer.id}>
            <div>
              <strong>{dealer.name}</strong>
              <small>
                {dealer.area}
                {dealer.phone ? ` · ${dealer.phone}` : ''}
              </small>
              {dealer.notes && <p className="review-note">{dealer.notes}</p>}
            </div>
            <div className="dealer-meta">
              {dealer.sellsAtListPrice && <span className="badge ok">{tx('List price', 'السعر الرسمي')}</span>}
              <button type="button" className="icon-danger" onClick={() => remove(dealer.id)} aria-label={tx('Remove', 'حذف')}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function PricingAdmin() {
  const { tx } = useLanguage()
  const [pricing, setPricing] = useState<ApiPricing[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(() => {
    api.listPricing().then(({ pricing: list }) => setPricing(list)).catch(() => undefined)
  }, [])

  useEffect(load, [load])

  async function save(trim: Trim, priceEgp: number, note: string) {
    setError(null)
    setMessage(null)
    try {
      await api.savePricing({ trim, priceEgp, note: note || undefined })
      setMessage(tx('Saved.', 'تم الحفظ.'))
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    }
  }

  return (
    <>
      <p className="muted-note">
        {tx(
          'A price set here overrides the launch figure committed in the site content. Leave it empty to keep using the committed price.',
          'السعر المحدد هنا يحل محل سعر الإطلاق المحفوظ في محتوى الموقع. اتركه فارغا للاستمرار بالسعر المحفوظ.',
        )}
      </p>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      <div className="review-list">
        {TRIMS.map((option) => {
          const current = pricing.find((entry) => entry.trim === option.value)
          return (
            <PricingRow
              key={`${option.value}-${current?.updatedAt ?? 'unset'}`}
              trim={option.value}
              label={option.label}
              current={current}
              onSave={save}
            />
          )
        })}
      </div>
    </>
  )
}

function PricingRow({
  trim,
  label,
  current,
  onSave,
}: {
  trim: Trim
  label: string
  current?: ApiPricing
  onSave: (trim: Trim, priceEgp: number, note: string) => void
}) {
  const { tx } = useLanguage()
  const [price, setPrice] = useState(String(current?.priceEgp ?? ''))
  const [note, setNote] = useState(current?.note ?? '')

  return (
    <div className="review-item">
      <div>
        <strong>{label}</strong>
        {current && <small>{tx('Updated', 'آخر تحديث')} {new Date(current.updatedAt).toLocaleDateString()}</small>}
      </div>
      <div className="pricing-edit">
        <input
          type="number"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="EGP"
          min={1}
        />
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={tx('Note', 'ملاحظة')} maxLength={500} />
        <button type="button" onClick={() => onSave(trim, Number(price), note)} disabled={!price}>
          {tx('Save', 'حفظ')}
        </button>
      </div>
    </div>
  )
}

/* ---------- people ---------- */

export function UserAdmin({ currentUserId }: { currentUserId: string }) {
  const { tx } = useLanguage()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listUsers()
      .then(({ users: list }) => setUsers(list))
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Could not load.'))
  }, [])

  useEffect(load, [load])

  async function update(id: string, change: { role?: 'user' | 'admin'; status?: 'active' | 'blocked' }) {
    setError(null)
    try {
      await api.updateUser(id, change)
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    }
  }

  return (
    <>
      {error && <p className="form-error">{error}</p>}

      <div className="review-list">
        {users.map((user) => {
          const isSelf = user.id === currentUserId
          return (
            <div className="review-item" key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <small>
                  {user.email}
                  {user.country ? ` · ${user.country}` : ''}
                  {user.city ? ` · ${user.city}` : ''}
                  {user.phone ? ` · ${user.phone}` : ''}
                  {user.trim ? ` · ${user.trim === 'wild' ? 'Wild AWD' : 'Play RWD'}` : ''}
                </small>
              </div>
              <div className="dealer-meta">
                <span className={`badge ${user.role === 'admin' ? 'ok' : 'export'}`}>
                  {user.role === 'admin' ? tx('Admin', 'مشرف') : tx('Contributor', 'مساهم')}
                </span>
                {user.status === 'blocked' && <span className="badge no">{tx('Blocked', 'محظور')}</span>}

                {/* An admin cannot demote or block themselves; the API refuses it too. */}
                {!isSelf && (
                  <>
                    <button
                      type="button"
                      onClick={() => update(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
                    >
                      {user.role === 'admin' ? tx('Make contributor', 'اجعله مساهما') : tx('Make admin', 'اجعله مشرفا')}
                    </button>
                    <button
                      type="button"
                      onClick={() => update(user.id, { status: user.status === 'blocked' ? 'active' : 'blocked' })}
                    >
                      {user.status === 'blocked' ? tx('Unblock', 'رفع الحظر') : tx('Block', 'حظر')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
