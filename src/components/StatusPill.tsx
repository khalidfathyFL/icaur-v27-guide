import { useLanguage } from '../i18n/languageContext'
import type { ReviewStatus } from '../lib/api'

const LABELS: Record<ReviewStatus, { en: string; ar: string }> = {
  pending: { en: 'Awaiting review', ar: 'في انتظار المراجعة' },
  approved: { en: 'Published', ar: 'منشور' },
  rejected: { en: 'Not accepted', ar: 'غير مقبول' },
}

const MODIFIERS: Record<ReviewStatus, string> = {
  pending: 'verify',
  approved: 'ok',
  rejected: 'no',
}

export function StatusPill({ status }: { status: ReviewStatus }) {
  const { tx } = useLanguage()
  const label = LABELS[status]

  return <span className={`badge ${MODIFIERS[status]}`}>{tx(label.en, label.ar)}</span>
}
