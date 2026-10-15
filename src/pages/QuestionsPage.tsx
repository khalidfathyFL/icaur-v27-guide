import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BadgeCheck, MessagesSquare, Search, SearchX, Trash2, X } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { faq, faqTopics, getFeature, type FaqTopicId } from '../content'
import { PageFrame } from '../components/layout'
import { AskQuestion } from '../features/questions/AskQuestion'
import { FaqList } from '../features/questions/FaqList'
import { matchesFaq, matchesQuestion } from '../features/questions/matching'
import { QuestionList } from '../features/questions/QuestionList'
import { useLanguage } from '../i18n/languageContext'
import { api, apiConfigured, type ApiAnswer, type ApiQuestion } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'
import { guideHref, questionHref } from '../lib/links'
import { replaceRouteQuery } from '../lib/useHashRoute'

const PAGE_SIZE = 30

const isTopic = (value: string | null): value is FaqTopicId => faqTopics.some((topic) => topic.id === value)

/**
 * Two kinds of answer on one page: the site's own, written from the verified
 * content, and the community's, where owners ask and other owners answer.
 * The search box filters both, so a reader finds an answer before asking.
 */
export function QuestionsPage({
  topic: initialTopic,
  query: initialQuery,
  guide: initialGuide,
  ask,
}: {
  topic: string | null
  query: string
  guide: string | null
  ask: boolean
}) {
  const { t, tx, pair } = useLanguage()
  const [topic, setTopic] = useState<FaqTopicId | null>(isTopic(initialTopic) ? initialTopic : null)
  const [query, setQuery] = useState(initialQuery)
  const [guide, setGuide] = useState(initialGuide && getFeature(initialGuide) ? initialGuide : null)
  const [community, setCommunity] = useState<ApiQuestion[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadError, setLoadError] = useState<string | null>(null)

  const trimmed = query.trim()
  const guideFeature = guide ? getFeature(guide) : undefined

  useEffect(() => {
    replaceRouteQuery('/questions', { topic, q: trimmed || null, guide })
  }, [topic, trimmed, guide])

  // Arriving from "Ask other owners" lands on the form, not the top of the page.
  useEffect(() => {
    if (ask) document.getElementById('ask')?.scrollIntoView({ block: 'start' })
  }, [ask])

  useEffect(() => {
    if (!apiConfigured) return
    let cancelled = false
    api
      .listQuestions({ guide: guide ?? undefined, page, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return
        setCommunity((previous) => (page === 1 || !previous ? result.questions : [...previous, ...result.questions]))
        setTotal(result.total)
        setLoadError(null)
      })
      .catch((caught) => {
        if (!cancelled) setLoadError(errorMessage(caught, tx('Could not load the questions.', 'تعذر تحميل الأسئلة.')))
      })
    return () => {
      cancelled = true
    }
  }, [guide, page, tx])

  const chooseGuide = (next: string | null) => {
    setCommunity(null)
    setPage(1)
    setGuide(next)
  }

  const answers = useMemo(
    () => faq.filter((entry) => (!topic || entry.topic === topic) && matchesFaq(entry, trimmed)),
    [topic, trimmed],
  )
  const asked = useMemo(() => community?.filter((question) => matchesQuestion(question, trimmed)) ?? null, [community, trimmed])

  const returnTo = `/questions?ask=1${guide ? `&guide=${guide}` : ''}`

  return (
    <PageFrame
      eyebrow={tx('Q&A', 'أسئلة وأجوبة')}
      title={tx('Questions & answers', 'الأسئلة والأجوبة')}
      intro={tx(
        'Quick answers from the guide, and questions owners asked each other. Search first: someone may have asked already.',
        'إجابات سريعة من الدليل، وأسئلة طرحها الملاك على بعضهم. ابحث أولا: ربما سأل أحد قبلك.',
      )}
    >
      <div className="filter-bar">
        <label className="filter-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('Search questions, e.g. charging, warranty, شحن', 'ابحث في الأسئلة، مثال: شحن، ضمان، charging')}
            aria-label={tx('Search questions', 'ابحث في الأسئلة')}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={tx('Clear search', 'امسح البحث')}>
              <X size={16} />
            </button>
          )}
        </label>
      </div>

      <section className="qa-section">
        <h2>
          <BadgeCheck size={20} aria-hidden="true" />
          {tx('Answered by the guide', 'إجابات الدليل')}
        </h2>

        <div className="chip-row" role="group" aria-label={tx('Topics', 'المواضيع')}>
          <button
            type="button"
            className={topic === null ? 'chip selected' : 'chip'}
            aria-pressed={topic === null}
            onClick={() => setTopic(null)}
          >
            {tx('All', 'الكل')} <span>{faq.length}</span>
          </button>
          {faqTopics.map((item) => (
            <button
              key={item.id}
              type="button"
              className={topic === item.id ? 'chip selected' : 'chip'}
              aria-pressed={topic === item.id}
              onClick={() => setTopic(topic === item.id ? null : item.id)}
            >
              {pair(item.name)} <span>{faq.filter((entry) => entry.topic === item.id).length}</span>
            </button>
          ))}
        </div>

        {answers.length > 0 ? (
          <FaqList entries={answers} />
        ) : (
          <p className="muted-note">{tx('None of the guide’s answers match.', 'لا توجد إجابات من الدليل تطابق البحث.')}</p>
        )}
      </section>

      {apiConfigured && (
        <section className="qa-section">
          <h2>
            <MessagesSquare size={20} aria-hidden="true" />
            {tx('Asked by owners', 'أسئلة الملاك')}
          </h2>

          {guideFeature && (
            <div className="chip-row">
              <button type="button" className="chip selected" onClick={() => chooseGuide(null)}>
                {tx('About', 'عن')}: {t(guideFeature.name)} <X size={14} aria-label={tx('Show all', 'اعرض الكل')} />
              </button>
            </div>
          )}

          {loadError && <p className="form-error">{loadError}</p>}

          {asked === null ? (
            !loadError && <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>
          ) : asked.length > 0 ? (
            <>
              <QuestionList questions={asked} showGuide={!guide} />
              {community && community.length < total && !trimmed && (
                <button type="button" className="secondary-button" onClick={() => setPage((current) => current + 1)}>
                  {tx('Show more questions', 'اعرض أسئلة أكثر')}
                </button>
              )}
            </>
          ) : (
            <div className="empty-state">
              <SearchX size={30} aria-hidden="true" />
              <strong>
                {trimmed
                  ? tx('No owner question matches', 'لا يوجد سؤال يطابق البحث')
                  : tx('No questions here yet', 'لا توجد أسئلة هنا بعد')}
              </strong>
              <span>{tx('Be the first to ask: the form is just below.', 'كن أول من يسأل: النموذج بالأسفل.')}</span>
            </div>
          )}
        </section>
      )}

      {apiConfigured && (
        <section className="qa-section" id="ask">
          <h2>{tx('Ask a question', 'اطرح سؤالا')}</h2>
          <AskQuestion
            key={guide ?? ''}
            guide={guide}
            returnTo={returnTo}
            onAsked={(question) => {
              window.location.hash = questionHref(question.id)
            }}
          />
        </section>
      )}
    </PageFrame>
  )
}

/** One owner question, its answers, and a way to add one. */
export function QuestionPage({ id }: { id: string }) {
  const { t, tx, language } = useLanguage()
  const { user, can } = useAuth()
  const [question, setQuestion] = useState<ApiQuestion | null>(null)
  const [answers, setAnswers] = useState<ApiAnswer[]>([])
  const [notFound, setNotFound] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!apiConfigured) return
    api
      .readQuestion(id)
      .then((result) => {
        setQuestion(result.question)
        setAnswers(result.answers)
      })
      .catch(() => setNotFound(true))
  }, [id])

  useEffect(load, [load])

  const back = (
    <a className="inline-link" href="#/questions">
      {tx('Back to questions', 'ارجع إلى الأسئلة')}
    </a>
  )

  if (!apiConfigured || notFound) {
    return (
      <PageFrame eyebrow={tx('Q&A', 'أسئلة وأجوبة')} title={tx('Question not found', 'السؤال غير موجود')} intro="">
        {back}
      </PageFrame>
    )
  }

  if (!question) {
    return (
      <PageFrame eyebrow={tx('Q&A', 'أسئلة وأجوبة')} title={tx('Loading…', 'جارٍ التحميل…')} intro="">
        <span />
      </PageFrame>
    )
  }

  const moderator = can('comments.review')
  const mayChoose = question.mine || moderator
  const guide = question.guide ? getFeature(question.guide) : undefined

  async function run(action: () => Promise<unknown>, failure: string) {
    setError(null)
    try {
      await action()
      load()
    } catch (caught) {
      setError(errorMessage(caught, failure))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      const { answer } = await api.createAnswer({ questionId: id, body })
      setBody('')
      if (answer.status === 'approved') load()
      else setMessage(tx('Sent for review. It appears here once a moderator approves it.', 'تم الإرسال للمراجعة. ستظهر هنا بعد موافقة المشرف.'))
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')))
    } finally {
      setBusy(false)
    }
  }

  async function removeQuestion() {
    if (!window.confirm(tx('Delete your question for good?', 'حذف سؤالك نهائيا؟'))) return
    try {
      await api.deleteQuestion(id)
      window.location.hash = '#/questions'
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')))
    }
  }

  return (
    <PageFrame
      breadcrumbs={[{ label: tx('Questions & answers', 'الأسئلة والأجوبة'), href: '#/questions' }, { label: question.title }]}
      eyebrow={`${question.authorName} · ${formatDate(question.createdAt, language)}`}
      title={question.title}
      intro={
        <>
          {question.body && (
            <p className="question-body" dir="auto">
              {question.body}
            </p>
          )}
          {guide && (
            <p>
              {tx('About the guide', 'عن دليل')}:{' '}
              <a className="inline-link" href={guideHref(guide.slug)}>
                {t(guide.name)}
              </a>
            </p>
          )}
        </>
      }
    >
      {question.status === 'pending' && (
        <p className="review-banner">
          {tx(
            'This question is waiting for review, so only you and the moderators can see it.',
            'هذا السؤال في انتظار المراجعة، لذلك تراه أنت والمشرفون فقط.',
          )}
        </p>
      )}
      {question.status === 'rejected' && (
        <p className="review-banner">
          {tx('This question was not published.', 'لم يُنشر هذا السؤال.')}
          {question.reviewNote && ` ${question.reviewNote}`}
        </p>
      )}

      {question.status === 'approved' && (
        <section className="comments answers">
          <h2>
            <MessagesSquare size={18} />
            {tx('Answers', 'الإجابات')}
            {answers.length > 0 && <span className="comment-count">{answers.length}</span>}
          </h2>

          {answers.length === 0 && (
            <p className="muted-note">{tx('No answers yet. If you know, help another owner.', 'لا إجابات بعد. إن كنت تعرف، ساعد مالكا آخر.')}</p>
          )}

          <ol className="comment-list">
            {answers.map((answer) => {
              const accepted = answer.id === question.acceptedAnswerId
              return (
                <li key={answer.id} className={accepted ? 'accepted-answer' : undefined}>
                  <header>
                    <strong>{answer.authorName}</strong>
                    <time dateTime={answer.createdAt}>{formatDate(answer.createdAt, language)}</time>
                  </header>
                  {accepted && (
                    <p className="accepted-label">
                      <BadgeCheck size={15} aria-hidden="true" />
                      {tx('Solved it for the person who asked', 'حلّت المشكلة لصاحب السؤال')}
                    </p>
                  )}
                  <p dir="auto">{answer.body}</p>
                  <div className="answer-actions">
                    {mayChoose && (
                      <button
                        type="button"
                        className="comment-remove"
                        onClick={() =>
                          run(() => api.acceptAnswer(id, accepted ? null : answer.id), tx('Could not save.', 'تعذر الحفظ.'))
                        }
                      >
                        <BadgeCheck size={13} />{' '}
                        {accepted ? tx('Unmark', 'إلغاء الاعتماد') : tx('Mark as the answer', 'اعتمدها كإجابة')}
                      </button>
                    )}
                    {(answer.mine || moderator) && (
                      <button
                        type="button"
                        className="comment-remove"
                        onClick={() => run(() => api.deleteAnswer(answer.id), tx('Could not remove.', 'تعذر الحذف.'))}
                      >
                        <Trash2 size={13} /> {tx('Remove', 'حذف')}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          {user ? (
            <form className="comment-form" onSubmit={submit}>
              <label>
                <span>{tx('Your answer', 'إجابتك')}</span>
                <textarea
                  dir="auto"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                  minLength={2}
                  maxLength={4000}
                  rows={4}
                />
              </label>

              {message && <p className="form-success">{message}</p>}

              <button className="primary-action" type="submit" disabled={busy}>
                {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Post answer', 'أرسل الإجابة')}
              </button>
            </form>
          ) : (
            <p className="muted-note">
              <a className="inline-link" href={`#/signin?next=${encodeURIComponent(`/questions/${id}`)}`}>
                {tx('Sign in to answer', 'سجل الدخول للإجابة')}
              </a>
            </p>
          )}
        </section>
      )}

      {error && <p className="form-error">{error}</p>}

      <p className="question-footer">
        {back}
        {(question.mine || moderator) && (
          <button type="button" className="comment-remove" onClick={removeQuestion}>
            <Trash2 size={13} /> {tx('Delete question', 'حذف السؤال')}
          </button>
        )}
      </p>
    </PageFrame>
  )
}
