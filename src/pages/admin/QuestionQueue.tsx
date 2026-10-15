import { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { DetailList } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { StatusPill } from '../../components/StatusPill'
import { getFeature } from '../../content'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiAnswer, type ApiQuestion, type ReviewStatus } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { QueueEmpty, ReviewFooter, StatusFilter, type QueueStatus } from './moderation'
import { useOpenRecord } from './useOpenRecord'

/**
 * Community questions and their answers, one queue each. Both are plain text
 * like comments and worked by the same moderators, so the two screens share
 * everything but their wording and which calls they make.
 */

type Kind = 'question' | 'answer'

/** What both kinds have in common, as the queue needs it. */
type Row = {
  id: string
  text: string
  /** The question, for an answer; its details, for a question. */
  context: string
  questionId: string
  guide?: string
  authorName: string
  status: ReviewStatus
  reviewNote?: string
  createdAt: string
}

const fromQuestion = (question: ApiQuestion): Row => ({
  id: question.id,
  text: question.title,
  context: question.body,
  questionId: question.id,
  guide: question.guide,
  authorName: question.authorName,
  status: question.status,
  reviewNote: question.reviewNote,
  createdAt: question.createdAt,
})

const fromAnswer = (answer: ApiAnswer): Row => ({
  id: answer.id,
  text: answer.body,
  context: answer.questionTitle,
  questionId: answer.questionId,
  authorName: answer.authorName,
  status: answer.status,
  reviewNote: answer.reviewNote,
  createdAt: answer.createdAt,
})

const CALLS = {
  question: {
    list: (status: QueueStatus) => api.questionQueue(status).then(({ questions }) => questions.map(fromQuestion)),
    review: api.reviewQuestion,
    remove: api.deleteQuestion,
  },
  answer: {
    list: (status: QueueStatus) => api.answerQueue(status).then(({ answers }) => answers.map(fromAnswer)),
    review: api.reviewAnswer,
    remove: api.deleteAnswer,
  },
}

export function QuestionQueue({ kind, params, onChanged }: { kind: Kind; params: URLSearchParams; onChanged: () => void }) {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const record = useOpenRecord(kind === 'question' ? '/admin/questions' : '/admin/answers', params)
  const [status, setStatus] = useState<QueueStatus>(record.openId ? 'all' : 'pending')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const calls = CALLS[kind]
  const noun = kind === 'question' ? tx('Question', 'السؤال') : tx('Answer', 'الإجابة')

  const load = useCallback(() => {
    calls
      .list(status)
      .then((list) => {
        setRows(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [calls, status, tx])

  useEffect(load, [load])

  async function decide(row: Row, decision: 'approved' | 'rejected', note = '') {
    setBusyId(row.id)
    try {
      await calls.review(row.id, { status: decision, note: note || undefined })
      toast(
        decision === 'approved'
          ? kind === 'question'
            ? tx('Question published.', 'تم نشر السؤال.')
            : tx('Answer published.', 'تم نشر الإجابة.')
          : kind === 'question'
            ? tx('Question rejected.', 'تم رفض السؤال.')
            : tx('Answer rejected.', 'تم رفض الإجابة.'),
      )
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(row: Row) {
    const ok = await confirm({
      title: kind === 'question' ? tx('Delete this question?', 'حذف هذا السؤال؟') : tx('Delete this answer?', 'حذف هذه الإجابة؟'),
      message:
        kind === 'question'
          ? tx('It is removed for good, with every answer to it.', 'سيُحذف نهائيا مع كل إجاباته.')
          : tx('It is removed for good, not just hidden.', 'ستُحذف نهائيا وليس مجرد إخفاء.'),
      confirmLabel: tx('Delete', 'حذف'),
      tone: 'danger',
    })
    if (!ok) return

    setBusyId(row.id)
    try {
      await calls.remove(row.id)
      toast(kind === 'question' ? tx('Question deleted.', 'تم حذف السؤال.') : tx('Answer deleted.', 'تم حذف الإجابة.'))
      if (record.openId === row.id) record.close()
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const selected = rows?.find((row) => row.id === record.openId) ?? null
  const selectedGuide = selected?.guide ? getFeature(selected.guide) : undefined

  return (
    <>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        error={error}
        searchText={(row) => `${row.text} ${row.context} ${row.authorName}`}
        searchPlaceholder={
          kind === 'question'
            ? tx('Search question or author…', 'ابحث في السؤال أو الكاتب…')
            : tx('Search answer, author or question…', 'ابحث في الإجابة أو الكاتب أو السؤال…')
        }
        filters={
          <StatusFilter
            value={status}
            onChange={(next) => {
              setRows(null)
              setStatus(next)
            }}
          />
        }
        onRowClick={(row) => record.open(row.id)}
        empty={<QueueEmpty status={status} />}
        columns={[
          {
            key: 'text',
            header: noun,
            width: 'minmax(0, 3fr)',
            render: (row) => (
              <span className="panel-cell-main">
                <span className="panel-clamp" dir="auto">
                  {row.text}
                </span>
                <small>
                  {row.authorName}
                  {kind === 'answer' && ` · ${tx('on', 'على')} ${row.context}`}
                </small>
              </span>
            ),
          },
          { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (row) => <StatusPill status={row.status} /> },
          {
            key: 'date',
            header: tx('Posted', 'التاريخ'),
            width: '130px',
            render: (row) => <span className="panel-muted">{formatDate(row.createdAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '140px',
            align: 'end',
            render: (row) => (
              <span className="panel-row-actions">
                {row.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="panel-icon-button success"
                      disabled={busyId === row.id}
                      onClick={() => decide(row, 'approved')}
                      aria-label={tx('Approve', 'قبول')}
                      title={tx('Approve', 'قبول')}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="panel-icon-button danger"
                      disabled={busyId === row.id}
                      onClick={() => decide(row, 'rejected')}
                      aria-label={tx('Reject', 'رفض')}
                      title={tx('Reject', 'رفض')}
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="panel-icon-button danger"
                  disabled={busyId === row.id}
                  onClick={() => remove(row)}
                  aria-label={tx('Delete', 'حذف')}
                  title={tx('Delete', 'حذف')}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            ),
          },
        ]}
      />

      {selected && (
        <Drawer
          key={selected.id}
          open
          busy={busyId === selected.id}
          title={noun}
          subtitle={`${selected.authorName} · ${formatDate(selected.createdAt, language, true)}`}
          onClose={record.close}
          footer={
            <>
              {selected.status === 'pending' && (
                <ReviewFooter busy={busyId === selected.id} onDecide={(decision, note) => decide(selected, decision, note)} />
              )}
              <div className="panel-drawer-actions spread">
                <a className="panel-button ghost" href={`#/questions/${selected.questionId}`}>
                  <ExternalLink size={15} aria-hidden="true" /> {tx('Open the question', 'افتح السؤال')}
                </a>
                <button type="button" className="panel-button danger-soft" onClick={() => remove(selected)}>
                  <Trash2 size={15} aria-hidden="true" /> {tx('Delete', 'حذف')}
                </button>
              </div>
            </>
          }
        >
          <DetailList
            rows={[
              { label: tx('Status', 'الحالة'), value: <StatusPill status={selected.status} /> },
              kind === 'answer'
                ? { label: tx('Answers', 'إجابة على'), value: selected.context }
                : { label: tx('Guide', 'الدليل'), value: selectedGuide ? t(selectedGuide.name) : undefined },
              { label: tx('Review note', 'ملاحظة المراجعة'), value: selected.reviewNote },
            ]}
          />
          <section className="panel-preview">
            <p className="panel-preview-label">{noun}</p>
            <p className="panel-prewrap" dir="auto">
              {selected.text}
            </p>
            {kind === 'question' && selected.context && (
              <>
                <p className="panel-preview-label">{tx('Details', 'التفاصيل')}</p>
                <p className="panel-prewrap" dir="auto">
                  {selected.context}
                </p>
              </>
            )}
          </section>
        </Drawer>
      )}
    </>
  )
}
