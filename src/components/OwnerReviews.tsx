import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Star, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { useLanguage } from '../i18n/languageContext'
import { ApiError, api, type ApiOwnerReview, type ReviewTarget } from '../lib/api'
import { formatDate } from '../lib/format'
import { Req } from './RequiredMark'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="part-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= Math.round(value) ? 'filled' : undefined} />
      ))}
    </span>
  )
}

export function Rating({ value, count }: { value: number; count: number }) {
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

/**
 * Approved owner reviews of one listing, and the form for owners who have not
 * written one yet. Accessories and protection centers both use it.
 */
export function OwnerReviews({
  kind,
  targetId,
  onRatingChanged,
}: {
  kind: ReviewTarget
  targetId: string
  /** Called when the average may have changed, so the page can refresh it. */
  onRatingChanged: () => void
}) {
  const { tx, language } = useLanguage()
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ApiOwnerReview[]>([])
  const [mine, setMine] = useState<ApiOwnerReview | null>(null)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isOwner = user?.ownership === 'owner'

  const load = useCallback(() => {
    api
      .listReviews(kind, targetId)
      .then(setReviews)
      .catch(() => undefined)
    if (isOwner) {
      api
        .myReview(kind, targetId)
        .then(setMine)
        .catch(() => undefined)
    }
  }, [kind, targetId, isOwner])

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
      const review = await api.createReview(kind, { targetId, rating, body })
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
      await api.deleteReview(kind, mine.id)
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
            {review.body && <p>{review.body}</p>}
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
          {tx('Only V27 owners can write reviews.', 'يمكن لملاك V27 فقط كتابة المراجعات.')}{' '}
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
          <span className="review-rating-label">
            {tx('Your rating', 'تقييمك')}
            <Req />
          </span>
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
            <span>{tx('Your experience (optional)', 'تجربتك (اختياري)')}</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={3} />
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
