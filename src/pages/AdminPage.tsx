import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { PageFrame, SectionHeading } from '../components/layout'
import { StatusPill } from '../components/StatusPill'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import {
  ApiError,
  api,
  apiConfigured,
  type ApiPost,
  type ApiSuggestion,
  type ReviewStatus,
} from '../lib/api'
import { ServiceUnavailable } from './AccountPage'

type Tab = 'posts' | 'suggestions'

export function AdminPage() {
  const { tx } = useLanguage()
  const { user, loading, isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('posts')

  if (!apiConfigured) return <ServiceUnavailable />

  if (loading) {
    return (
      <PageFrame eyebrow="Admin" title={tx('Loading…', 'جارٍ التحميل…')} intro="">
        <span />
      </PageFrame>
    )
  }

  // Server-side checks are what actually protect the data; this only keeps the
  // page tidy for someone who is not an admin.
  if (!user || !isAdmin) {
    return (
      <PageFrame
        eyebrow="Admin"
        title={tx('Admins Only', 'للمشرفين فقط')}
        intro={tx(
          'This page is for reviewing contributions. Sign in with an admin account to use it.',
          'هذه الصفحة لمراجعة المساهمات. سجل الدخول بحساب مشرف لاستخدامها.',
        )}
      >
        <a className="primary-action" href="#/signin">
          {tx('Sign in', 'تسجيل الدخول')}
        </a>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      eyebrow="Admin"
      title={tx('Review Queue', 'قائمة المراجعة')}
      intro={tx(
        'Approve or reject what contributors have sent. Approved posts appear on the site immediately; approved corrections are a note to update the content.',
        'وافق أو ارفض ما أرسله المساهمون. المقالات المقبولة تظهر على الموقع فورا، والتصحيحات المقبولة تذكير بتحديث المحتوى.',
      )}
    >
      <div className="trim-toggle admin-tabs" role="group">
        <button
          type="button"
          className={tab === 'posts' ? 'selected' : ''}
          onClick={() => setTab('posts')}
        >
          {tx('Posts', 'المقالات')}
        </button>
        <button
          type="button"
          className={tab === 'suggestions' ? 'selected' : ''}
          onClick={() => setTab('suggestions')}
        >
          {tx('Corrections', 'التصحيحات')}
        </button>
      </div>

      {tab === 'posts' ? <PostQueue /> : <SuggestionQueue />}
    </PageFrame>
  )
}

/** Shared review controls for both queues. */
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
  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending')
  const { tx } = useLanguage()

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

function PostQueue() {
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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <SectionHeading eyebrow={tx('Posts', 'المقالات')} title={tx('Contributor Posts', 'مقالات المساهمين')} compact />
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
              <ReviewActions busy={busyId === post.id} onDecide={(decision, note) => decide(post.id, decision, note)} />
            )}
          </article>
        ))}
      </div>
    </>
  )
}

function SuggestionQueue() {
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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <SectionHeading
        eyebrow={tx('Corrections', 'التصحيحات')}
        title={tx('Suggested Edits', 'التصحيحات المقترحة')}
        compact
      />
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
                onDecide={(decision, note) => decide(suggestion.id, decision, note)}
              />
            )}
          </article>
        ))}
      </div>
    </>
  )
}
