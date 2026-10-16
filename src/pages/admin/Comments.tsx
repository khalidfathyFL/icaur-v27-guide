import { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { DetailList } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { StatusPill } from '../../components/StatusPill'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiComment } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { QueueEmpty, ReviewFooter, StatusFilter, type QueueStatus } from './moderation'
import { useOpenRecord } from './useOpenRecord'

export function Comments({ params, onChanged }: { params: URLSearchParams; onChanged: () => void }) {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const record = useOpenRecord('/admin/comments', params)
  const [status, setStatus] = useState<QueueStatus>(record.openId ? 'all' : 'pending')
  const [comments, setComments] = useState<ApiComment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .commentQueue(status)
      .then(({ comments: list }) => {
        setComments(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [status, tx])

  useEffect(load, [load])

  async function decide(comment: ApiComment, decision: 'approved' | 'rejected', note = '') {
    setBusyId(comment.id)
    try {
      await api.reviewComment(comment.id, { status: decision, note: note || undefined })
      toast(decision === 'approved' ? tx('Comment published.', 'تم نشر التعليق.') : tx('Comment rejected.', 'تم رفض التعليق.'))
      // A decision made from the drawer closes it, like every other drawer.
      if (record.openId === comment.id) record.close()
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(comment: ApiComment) {
    const ok = await confirm({
      title: tx('Delete this comment?', 'حذف هذا التعليق؟'),
      message: tx('It is removed for good, not just hidden.', 'سيُحذف نهائيا وليس مجرد إخفاء.'),
      confirmLabel: tx('Delete', 'حذف'),
      tone: 'danger',
    })
    if (!ok) return

    setBusyId(comment.id)
    try {
      await api.deleteComment(comment.id)
      toast(tx('Comment deleted.', 'تم حذف التعليق.'))
      if (record.openId === comment.id) record.close()
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const selected = comments?.find((comment) => comment.id === record.openId) ?? null

  return (
    <>
      <DataTable
        rows={comments}
        rowKey={(comment) => comment.id}
        error={error}
        searchText={(comment) => `${comment.body} ${comment.authorName} ${comment.postTitle ?? ''}`}
        searchPlaceholder={tx('Search comment, author or post…', 'ابحث في التعليق أو الكاتب أو المقال…')}
        filters={
          <StatusFilter
            value={status}
            onChange={(next) => {
              setComments(null)
              setStatus(next)
            }}
          />
        }
        onRowClick={(comment) => record.open(comment.id)}
        empty={<QueueEmpty status={status} />}
        columns={[
          {
            key: 'comment',
            header: tx('Comment', 'التعليق'),
            width: 'minmax(0, 3fr)',
            render: (comment) => (
              <span className="panel-cell-main">
                <span className="panel-clamp">{comment.body}</span>
                <small>
                  {comment.authorName}
                  {comment.postTitle ? ` · ${tx('on', 'على')} ${comment.postTitle}` : ''}
                </small>
              </span>
            ),
          },
          { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (comment) => <StatusPill status={comment.status} /> },
          {
            key: 'date',
            header: tx('Posted', 'التاريخ'),
            width: '130px',
            render: (comment) => <span className="panel-muted">{formatDate(comment.createdAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '140px',
            align: 'end',
            render: (comment) => (
              <span className="panel-row-actions">
                {comment.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="panel-icon-button success"
                      disabled={busyId === comment.id}
                      onClick={() => decide(comment, 'approved')}
                      aria-label={tx('Approve', 'قبول')}
                      title={tx('Approve', 'قبول')}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="panel-icon-button danger"
                      disabled={busyId === comment.id}
                      onClick={() => decide(comment, 'rejected')}
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
                  disabled={busyId === comment.id}
                  onClick={() => remove(comment)}
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
          title={tx('Comment', 'تعليق')}
          subtitle={`${selected.authorName} · ${formatDate(selected.createdAt, language, true)}`}
          onClose={record.close}
          footer={
            <>
              {selected.status === 'pending' && (
                <ReviewFooter busy={busyId === selected.id} onDecide={(decision, note) => decide(selected, decision, note)} />
              )}
              <div className="panel-drawer-actions spread">
                <a className="panel-button ghost" href={`#/blog/${selected.postId}`}>
                  <ExternalLink size={15} aria-hidden="true" /> {tx('Open the post', 'افتح المقال')}
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
              { label: tx('On', 'على'), value: selected.postTitle },
              { label: tx('Review note', 'ملاحظة المراجعة'), value: selected.reviewNote },
            ]}
          />
          <section className="panel-preview">
            <p className="panel-preview-label">{tx('Comment', 'التعليق')}</p>
            <p className="panel-prewrap">{selected.body}</p>
          </section>
        </Drawer>
      )}
    </>
  )
}
