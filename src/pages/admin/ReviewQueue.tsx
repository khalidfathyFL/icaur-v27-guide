import { useCallback, useEffect, useState } from 'react'
import { Check, ExternalLink, Star, Trash2, X } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { DetailList } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { StatusPill } from '../../components/StatusPill'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiOwnerReview, type ReviewTarget } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { QueueEmpty, ReviewFooter, StatusFilter, type QueueStatus } from './moderation'
import { useOpenRecord } from './useOpenRecord'

/** Where each kind of review points, and what its listing is called. */
const KINDS: Record<ReviewTarget, { section: string; page: string; noun: { en: string; ar: string } }> = {
  part: { section: '/admin/part-reviews', page: '#/accessories/', noun: { en: 'accessory', ar: 'الإكسسوار' } },
  center: { section: '/admin/center-reviews', page: '#/protection/', noun: { en: 'center', ar: 'المركز' } },
  insurer: { section: '/admin/insurer-reviews', page: '#/insurance/', noun: { en: 'insurer', ar: 'شركة التأمين' } },
}

/** Owner reviews of one kind of listing, worked by the same moderators as comments. */
export function ReviewQueue({
  kind,
  params,
  onChanged,
}: {
  kind: ReviewTarget
  params: URLSearchParams
  onChanged: () => void
}) {
  const config = KINDS[kind]
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const record = useOpenRecord(config.section, params)
  const [status, setStatus] = useState<QueueStatus>(record.openId ? 'all' : 'pending')
  const [reviews, setReviews] = useState<ApiOwnerReview[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .reviewQueue(kind, status)
      .then((list) => {
        setReviews(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [kind, status, tx])

  useEffect(load, [load])

  async function decide(review: ApiOwnerReview, decision: 'approved' | 'rejected', note = '') {
    setBusyId(review.id)
    try {
      await api.decideReview(kind, review.id, { status: decision, note: note || undefined })
      toast(decision === 'approved' ? tx('Review published.', 'تم نشر المراجعة.') : tx('Review rejected.', 'تم رفض المراجعة.'))
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(review: ApiOwnerReview) {
    const ok = await confirm({
      title: tx('Delete this review?', 'حذف هذه المراجعة؟'),
      message: tx('It is removed for good, not just hidden.', 'سيُحذف نهائيا وليس مجرد إخفاء.'),
      confirmLabel: tx('Delete', 'حذف'),
      tone: 'danger',
    })
    if (!ok) return

    setBusyId(review.id)
    try {
      await api.deleteReview(kind, review.id)
      toast(tx('Review deleted.', 'تم حذف المراجعة.'))
      if (record.openId === review.id) record.close()
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const selected = reviews?.find((review) => review.id === record.openId) ?? null

  return (
    <>
      <DataTable
        rows={reviews}
        rowKey={(review) => review.id}
        error={error}
        searchText={(review) => `${review.body} ${review.authorName} ${review.targetName}`}
        searchPlaceholder={tx(`Search review, author or ${config.noun.en}…`, `ابحث في المراجعة أو الكاتب أو ${config.noun.ar}…`)}
        filters={
          <StatusFilter
            value={status}
            onChange={(next) => {
              setReviews(null)
              setStatus(next)
            }}
          />
        }
        onRowClick={(review) => record.open(review.id)}
        empty={<QueueEmpty status={status} />}
        columns={[
          {
            key: 'review',
            header: tx('Review', 'المراجعة'),
            width: 'minmax(0, 3fr)',
            render: (review) => (
              <span className="panel-cell-main">
                <span className="panel-clamp">
                  <Stars rating={review.rating} /> {review.body}
                </span>
                <small>
                  {review.authorName} · {tx('on', 'على')} {review.targetName}
                </small>
              </span>
            ),
          },
          { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (review) => <StatusPill status={review.status} /> },
          {
            key: 'date',
            header: tx('Posted', 'التاريخ'),
            width: '130px',
            render: (review) => <span className="panel-muted">{formatDate(review.createdAt, language)}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '140px',
            align: 'end',
            render: (review) => (
              <span className="panel-row-actions">
                {review.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="panel-icon-button success"
                      disabled={busyId === review.id}
                      onClick={() => decide(review, 'approved')}
                      aria-label={tx('Approve', 'قبول')}
                      title={tx('Approve', 'قبول')}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="panel-icon-button danger"
                      disabled={busyId === review.id}
                      onClick={() => decide(review, 'rejected')}
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
                  disabled={busyId === review.id}
                  onClick={() => remove(review)}
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
          title={tx('Owner review', 'مراجعة مالك')}
          subtitle={`${selected.authorName} · ${formatDate(selected.createdAt, language, true)}`}
          onClose={record.close}
          footer={
            <>
              {selected.status === 'pending' && (
                <ReviewFooter busy={busyId === selected.id} onDecide={(decision, note) => decide(selected, decision, note)} />
              )}
              <div className="panel-drawer-actions spread">
                <a className="panel-button ghost" href={`${config.page}${selected.targetSlug}`}>
                  <ExternalLink size={15} aria-hidden="true" /> {tx(`Open the ${config.noun.en}`, `افتح ${config.noun.ar}`)}
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
              { label: tx('On', 'على'), value: selected.targetName },
              { label: tx('Rating', 'التقييم'), value: <Stars rating={selected.rating} /> },
              { label: tx('Review note', 'ملاحظة المراجعة'), value: selected.reviewNote },
            ]}
          />
          <section className="panel-preview">
            <p className="panel-preview-label">{tx('Review', 'المراجعة')}</p>
            <p className="panel-prewrap">{selected.body}</p>
          </section>
        </Drawer>
      )}
    </>
  )
}

function Stars({ rating }: { rating: number }) {
  const tx = useShortText()
  return (
    <span className="part-stars" role="img" aria-label={tx(`${rating} of 5 stars`, `${rating} من 5 نجوم`)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} size={13} aria-hidden="true" className={value <= rating ? 'filled' : undefined} />
      ))}
    </span>
  )
}
