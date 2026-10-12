import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { EmptyState, FilterSelect } from '../../components/panel/blocks'
import { useShortText } from '../../i18n/languageContext'
import type { ReviewStatus } from '../../lib/api'

/** Pieces shared by the three moderation queues: posts, corrections, comments. */

export type QueueStatus = ReviewStatus | 'all'

export function StatusFilter({ value, onChange }: { value: QueueStatus; onChange: (value: QueueStatus) => void }) {
  const tx = useShortText()
  return (
    <FilterSelect<QueueStatus>
      label={tx('Show', 'عرض')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'pending', label: tx('Awaiting review', 'في انتظار المراجعة') },
        { value: 'approved', label: tx('Published', 'منشور') },
        { value: 'rejected', label: tx('Not accepted', 'غير مقبول') },
        { value: 'all', label: tx('Everything', 'الكل') },
      ]}
    />
  )
}

/** Empty queue message, worded for the status being filtered on. */
export function QueueEmpty({ status }: { status: QueueStatus }) {
  const tx = useShortText()

  const [title, detail] = {
    pending: [tx('All caught up', 'لا يوجد ما يحتاج مراجعة'), tx('Nothing is waiting for review.', 'لا توجد عناصر في انتظار المراجعة.')],
    approved: [tx('Nothing published yet', 'لا يوجد منشور بعد'), tx('Approved items will show up here.', 'ستظهر العناصر المقبولة هنا.')],
    rejected: [tx('Nothing turned down', 'لا يوجد مرفوض'), tx('Rejected items will show up here.', 'ستظهر العناصر المرفوضة هنا.')],
    all: [tx('Nothing here yet', 'لا يوجد شيء بعد'), tx('Submissions will show up here.', 'ستظهر المشاركات هنا.')],
  }[status]

  return <EmptyState title={title} text={detail} />
}

/** Approve or reject, with an optional note the author will see. */
export function ReviewFooter({
  onDecide,
  busy,
}: {
  onDecide: (status: 'approved' | 'rejected', note: string) => void
  busy: boolean
}) {
  const tx = useShortText()
  const [note, setNote] = useState('')

  return (
    <div className="panel-review">
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={tx('Note to the author (optional)', 'ملاحظة للكاتب (اختياري)')}
        maxLength={1000}
        aria-label={tx('Note to the author', 'ملاحظة للكاتب')}
      />
      <div>
        <button type="button" className="panel-button danger-soft" disabled={busy} onClick={() => onDecide('rejected', note)}>
          <X size={16} aria-hidden="true" /> {tx('Reject', 'رفض')}
        </button>
        <button type="button" className="panel-button success" disabled={busy} onClick={() => onDecide('approved', note)}>
          <Check size={16} aria-hidden="true" /> {tx('Approve', 'قبول')}
        </button>
      </div>
    </div>
  )
}
