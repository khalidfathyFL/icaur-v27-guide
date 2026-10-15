import { CircleCheck, MessagesSquare } from 'lucide-react'
import { getFeature } from '../../content'
import { useLanguage } from '../../i18n/languageContext'
import type { ApiQuestion } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { questionHref } from '../../lib/links'

/** Owner questions as rows: the question, who asked, and whether it has an answer. */
export function QuestionList({ questions, showGuide = true }: { questions: ApiQuestion[]; showGuide?: boolean }) {
  const { t, tx, language } = useLanguage()

  return (
    <ol className="question-list">
      {questions.map((question) => {
        const guide = showGuide && question.guide ? getFeature(question.guide) : undefined
        const solved = Boolean(question.acceptedAnswerId)

        return (
          <li key={question.id}>
            <a href={questionHref(question.id)}>
              <strong dir="auto">{question.title}</strong>
              <span className="question-meta">
                {question.authorName} · {formatDate(question.createdAt, language)}
                {guide && <> · {t(guide.name)}</>}
              </span>
            </a>
            <span
              className={solved ? 'question-answers solved' : question.answerCount ? 'question-answers' : 'question-answers none'}
              title={solved ? tx('Has an accepted answer', 'لها إجابة معتمدة') : undefined}
            >
              {solved ? <CircleCheck size={15} aria-hidden="true" /> : <MessagesSquare size={15} aria-hidden="true" />}
              {question.answerCount === 0
                ? tx('No answers yet', 'لا إجابات بعد')
                : tx(
                    `${question.answerCount} ${question.answerCount === 1 ? 'answer' : 'answers'}`,
                    `${question.answerCount} ${question.answerCount === 1 ? 'إجابة' : 'إجابات'}`,
                  )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
