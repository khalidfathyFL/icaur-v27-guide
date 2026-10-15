import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/authContext'
import { featuresByCategory } from '../../content'
import { useLanguage } from '../../i18n/languageContext'
import { api, type ApiQuestion } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

/**
 * Asking the community. Signed-out readers get a way to sign in that brings
 * them back here, rather than a form that fails on submit.
 */
export function AskQuestion({
  guide: initialGuide,
  returnTo,
  onAsked,
}: {
  guide?: string | null
  /** Where sign-in should bring the reader back to. */
  returnTo: string
  /** Called with a question that is already public, e.g. a trusted owner's. */
  onAsked?: (question: ApiQuestion) => void
}) {
  const { t, tx } = useLanguage()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [guide, setGuide] = useState(initialGuide ?? '')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!user) {
    return (
      <p className="muted-note">
        <a className="inline-link" href={`#/signin?next=${encodeURIComponent(returnTo)}`}>
          {tx('Sign in to ask a question', 'سجل الدخول لتطرح سؤالا')}
        </a>
      </p>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      const { question } = await api.createQuestion({ title, body: body || undefined, guide: guide || undefined })
      setTitle('')
      setBody('')
      if (question.status === 'approved') onAsked?.(question)
      else
        setMessage(
          tx(
            'Sent for review. We will email you when it is published and when someone answers.',
            'تم الإرسال للمراجعة. سنراسلك عند نشره وعندما يجيب أحد.',
          ),
        )
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="comment-form ask-form" onSubmit={submit}>
      <label>
        <span>{tx('Your question', 'سؤالك')}</span>
        <input
          dir="auto"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={8}
          maxLength={200}
          placeholder={tx('e.g. Why does the engine start at 20% battery?', 'مثال: لماذا يعمل المحرك والبطارية 20%؟')}
        />
      </label>

      <label>
        <span>{tx('Details (optional)', 'تفاصيل (اختياري)')}</span>
        <textarea
          dir="auto"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          rows={4}
          placeholder={tx('Your trim, what you tried, what the screen says…', 'فئة سيارتك، وما جربته، وما تقوله الشاشة…')}
        />
      </label>

      <label>
        <span>{tx('About a guide (optional)', 'عن دليل (اختياري)')}</span>
        <select value={guide} onChange={(event) => setGuide(event.target.value)}>
          <option value="">{tx('Not about one guide', 'ليس عن دليل محدد')}</option>
          {featuresByCategory().map(({ category, features }) => (
            <optgroup key={category.id} label={t(category.name)}>
              {features.map((feature) => (
                <option key={feature.slug} value={feature.slug}>
                  {t(feature.name)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <p className="muted-note ask-hint">
        {tx(
          'Other owners answer. A moderator checks each question before it appears.',
          'يجيب ملاك آخرون. يراجع المشرف كل سؤال قبل ظهوره.',
        )}
      </p>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      <button className="primary-action" type="submit" disabled={busy}>
        {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Ask the community', 'اسأل المجتمع')}
      </button>
    </form>
  )
}
