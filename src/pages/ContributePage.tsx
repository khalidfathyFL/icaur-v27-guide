import { useEffect, useState, type FormEvent } from 'react'
import { FileEdit, PenLine } from 'lucide-react'
import { PageFrame, SectionHeading } from '../components/layout'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { features } from '../content'
import {
  ApiError,
  api,
  apiConfigured,
  type ApiPost,
  type ApiSuggestion,
  type SuggestionTarget,
} from '../lib/api'
import { ServiceUnavailable } from './AccountPage'
import { StatusPill } from '../components/StatusPill'

export function ContributePage() {
  const { tx } = useLanguage()
  const { user, loading } = useAuth()

  if (!apiConfigured) return <ServiceUnavailable />

  if (loading) {
    return (
      <PageFrame eyebrow={tx('Contribute', 'ساهم')} title={tx('Loading…', 'جارٍ التحميل…')} intro="">
        <span />
      </PageFrame>
    )
  }

  if (!user) {
    return (
      <PageFrame
        eyebrow={tx('Contribute', 'ساهم')}
        title={tx('Sign In To Contribute', 'سجل الدخول للمساهمة')}
        intro={tx(
          'Create an account to write posts and suggest corrections to the guides.',
          'أنشئ حسابا لكتابة المقالات واقتراح تصحيحات للأدلة.',
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
      eyebrow={tx('Contribute', 'ساهم')}
      title={tx('Write a Post or Suggest a Correction', 'اكتب مقالا أو اقترح تصحيحا')}
      intro={tx(
        'An admin reviews everything before it appears on the site. You will see the status of each item below.',
        'يراجع المشرف كل شيء قبل ظهوره على الموقع. ستجد حالة كل عنصر بالأسفل.',
      )}
    >
      <PostComposer />
      <SuggestionComposer />
      <MyContributions />
    </PageFrame>
  )
}

function PostComposer() {
  const { tx } = useLanguage()
  const [titleEn, setTitleEn] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [bodyAr, setBodyAr] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      await api.createPost({
        title: { en: titleEn, ar: titleAr },
        body: { en: bodyEn, ar: bodyAr },
        excerpt: { en: bodyEn.slice(0, 200), ar: bodyAr.slice(0, 200) },
      })
      setMessage(tx('Sent for review. Thank you.', 'تم الإرسال للمراجعة. شكرا لك.'))
      setTitleEn('')
      setTitleAr('')
      setBodyEn('')
      setBodyAr('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not send.', 'تعذر الإرسال.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="contribute-block">
      <SectionHeading
        eyebrow={tx('Post', 'مقال')}
        title={tx('Write a Post', 'اكتب مقالا')}
        compact
      />
      <form className="auth-form wide" onSubmit={onSubmit}>
        <label>
          <span>{tx('Title (English)', 'العنوان (إنجليزي)')}</span>
          <input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} required maxLength={200} />
        </label>

        <label>
          <span>{tx('Title (Arabic)', 'العنوان (عربي)')}</span>
          <input value={titleAr} onChange={(event) => setTitleAr(event.target.value)} maxLength={200} dir="rtl" />
        </label>

        <label>
          <span>{tx('Post (English)', 'المقال (إنجليزي)')}</span>
          <textarea
            value={bodyEn}
            onChange={(event) => setBodyEn(event.target.value)}
            required
            rows={7}
            maxLength={20000}
          />
        </label>

        <label>
          <span>{tx('Post (Arabic)', 'المقال (عربي)')}</span>
          <textarea
            value={bodyAr}
            onChange={(event) => setBodyAr(event.target.value)}
            rows={7}
            maxLength={20000}
            dir="rtl"
          />
          <small>
            {tx(
              'Write whichever language you are comfortable in. An admin can fill in the other side.',
              'اكتب باللغة التي تريحك، ويمكن للمشرف إكمال اللغة الأخرى.',
            )}
          </small>
        </label>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <button className="primary-action" type="submit" disabled={busy}>
          <PenLine size={18} />
          {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send for review', 'أرسل للمراجعة')}
        </button>
      </form>
    </section>
  )
}

function SuggestionComposer() {
  const { t, tx } = useLanguage()
  const [kind, setKind] = useState<SuggestionTarget['kind']>('feature')
  const [targetId, setTargetId] = useState(features[0]?.slug ?? '')
  const [field, setField] = useState('')
  const [current, setCurrent] = useState('')
  const [proposed, setProposed] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      await api.createSuggestion({
        target: { kind, id: targetId, field: field || undefined },
        current,
        proposed,
        reason,
      })
      setMessage(tx('Sent for review. Thank you.', 'تم الإرسال للمراجعة. شكرا لك.'))
      setCurrent('')
      setProposed('')
      setReason('')
      setField('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not send.', 'تعذر الإرسال.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="contribute-block">
      <SectionHeading
        eyebrow={tx('Correction', 'تصحيح')}
        title={tx('Suggest a Correction', 'اقترح تصحيحا')}
        compact
      />
      <form className="auth-form wide" onSubmit={onSubmit}>
        <label>
          <span>{tx('What is this about?', 'عن ماذا هذا التصحيح؟')}</span>
          <select
            value={kind}
            onChange={(event) => {
              const next = event.target.value as SuggestionTarget['kind']
              setKind(next)
              setTargetId(next === 'feature' ? (features[0]?.slug ?? '') : '')
            }}
          >
            <option value="feature">{tx('A guide', 'دليل')}</option>
            <option value="spec">{tx('A specification', 'مواصفة')}</option>
            <option value="equipment">{tx('Trim equipment', 'تجهيزات الفئة')}</option>
            <option value="dealer">{tx('A dealer', 'وكيل')}</option>
            <option value="other">{tx('Something else', 'شيء آخر')}</option>
          </select>
        </label>

        <label>
          <span>{tx('Which one?', 'أي واحد؟')}</span>
          {kind === 'feature' ? (
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              {features.map((feature) => (
                <option key={feature.slug} value={feature.slug}>
                  {t(feature.name)}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              required
              maxLength={200}
              placeholder={tx('e.g. Ground clearance', 'مثال: الخلوص الأرضي')}
            />
          )}
        </label>

        <label>
          <span>{tx('Field (optional)', 'الحقل (اختياري)')}</span>
          <input
            value={field}
            onChange={(event) => setField(event.target.value)}
            maxLength={200}
            placeholder={tx('e.g. Safety notes', 'مثال: ملاحظات السلامة')}
          />
        </label>

        <label>
          <span>{tx('What the site says now', 'ما يقوله الموقع الآن')}</span>
          <textarea value={current} onChange={(event) => setCurrent(event.target.value)} rows={3} maxLength={4000} />
        </label>

        <label>
          <span>{tx('What it should say', 'ما يجب أن يقوله')}</span>
          <textarea
            value={proposed}
            onChange={(event) => setProposed(event.target.value)}
            required
            rows={3}
            maxLength={4000}
          />
        </label>

        <label>
          <span>{tx('How do you know?', 'ما مصدر معلوماتك؟')}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={3}
            maxLength={2000}
            placeholder={tx(
              'Owner manual page, dealer confirmation, your own car…',
              'صفحة من دليل المالك، تأكيد الوكيل، سيارتك نفسها…',
            )}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}

        <button className="primary-action" type="submit" disabled={busy}>
          <FileEdit size={18} />
          {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send for review', 'أرسل للمراجعة')}
        </button>
      </form>
    </section>
  )
}

function MyContributions() {
  const { t, tx } = useLanguage()
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([])

  useEffect(() => {
    let cancelled = false

    Promise.all([api.listPosts({ mine: true }), api.listSuggestions()])
      .then(([postResult, suggestionResult]) => {
        if (cancelled) return
        setPosts(postResult.posts)
        setSuggestions(suggestionResult.suggestions)
      })
      .catch(() => {
        /* the composers above report their own errors */
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (posts.length === 0 && suggestions.length === 0) return null

  return (
    <section className="contribute-block">
      <SectionHeading
        eyebrow={tx('Status', 'الحالة')}
        title={tx('Your Contributions', 'مساهماتك')}
        compact
      />

      <div className="review-list">
        {posts.map((post) => (
          <div className="review-item" key={post.id}>
            <div>
              <strong>{t(post.title)}</strong>
              <small>{tx('Post', 'مقال')} · {new Date(post.createdAt).toLocaleDateString()}</small>
              {post.reviewNote && <p className="review-note">{post.reviewNote}</p>}
            </div>
            <StatusPill status={post.status} />
          </div>
        ))}

        {suggestions.map((suggestion) => (
          <div className="review-item" key={suggestion.id}>
            <div>
              <strong>{suggestion.target.id}</strong>
              <small>
                {tx('Correction', 'تصحيح')} · {new Date(suggestion.createdAt).toLocaleDateString()}
              </small>
              {suggestion.reviewNote && <p className="review-note">{suggestion.reviewNote}</p>}
            </div>
            <StatusPill status={suggestion.status} />
          </div>
        ))}
      </div>
    </section>
  )
}
