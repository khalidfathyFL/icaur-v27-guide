import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { ApiError, api, type ApiComment } from '../lib/api'

/** The thread under a published post. */
export function Comments({ postId }: { postId: string }) {
  const { tx } = useLanguage()
  const { user } = useAuth()
  const [comments, setComments] = useState<ApiComment[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api
      .listComments(postId)
      .then(({ comments: list }) => setComments(list))
      .catch(() => undefined)
  }, [postId])

  useEffect(load, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      const { comment } = await api.createComment({ postId, body })
      setBody('')
      // Someone excused from review sees their comment straight away; everyone
      // else is told it is waiting rather than left wondering where it went.
      if (comment.status === 'approved') load()
      else setMessage(tx('Sent for review.', 'تم الإرسال للمراجعة.'))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not send.', 'تعذر الإرسال.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteComment(id)
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not remove.', 'تعذر الحذف.'))
    }
  }

  return (
    <section className="comments">
      <h2>
        <MessageSquare size={18} />
        {tx('Comments', 'التعليقات')}
        {comments.length > 0 && <span className="comment-count">{comments.length}</span>}
      </h2>

      {comments.length === 0 && (
        <p className="muted-note">{tx('No comments yet.', 'لا توجد تعليقات بعد.')}</p>
      )}

      <ol className="comment-list">
        {comments.map((comment) => (
          <li key={comment.id}>
            <header>
              <strong>{comment.authorName}</strong>
              <time dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </time>
            </header>
            <p>{comment.body}</p>
            {user?.name === comment.authorName && (
              <button type="button" className="comment-remove" onClick={() => remove(comment.id)}>
                <Trash2 size={13} /> {tx('Remove', 'حذف')}
              </button>
            )}
          </li>
        ))}
      </ol>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <label>
            <span>{tx('Add a comment', 'أضف تعليقا')}</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              minLength={2}
              maxLength={2000}
              rows={3}
            />
          </label>

          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Post comment', 'أرسل التعليق')}
          </button>
        </form>
      ) : (
        <p className="muted-note">
          <a className="inline-link" href="#/signin">
            {tx('Sign in to comment', 'سجل الدخول للتعليق')}
          </a>
        </p>
      )}
    </section>
  )
}
