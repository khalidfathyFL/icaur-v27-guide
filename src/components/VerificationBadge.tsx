import type { Verification } from '../content/types'
import { useLanguage } from '../i18n/languageContext'

const LABELS: Record<Verification, { en: string; ar: string }> = {
  'confirmed-egypt': { en: 'Confirmed Egypt', ar: 'مؤكد مصر' },
  'confirmed-export': { en: 'Confirmed Export', ar: 'مؤكد تصدير' },
  likely: { en: 'Likely', ar: 'مرجح' },
  verify: { en: 'Needs Verification', ar: 'يحتاج تحقق' },
  'not-available': { en: 'Not Available', ar: 'غير متاح' },
}

/** Short forms for dense surfaces such as the screen simulator. */
const SHORT: Record<Verification, string> = {
  'confirmed-egypt': 'Egypt',
  'confirmed-export': 'Export',
  likely: 'Likely',
  verify: 'Verify',
  'not-available': 'N/A',
}

const MODIFIERS: Record<Verification, string> = {
  'confirmed-egypt': 'ok',
  'confirmed-export': 'export',
  likely: 'likely',
  verify: 'verify',
  'not-available': 'no',
}

export function VerificationBadge({
  status,
  compact = false,
}: {
  status: Verification
  compact?: boolean
}) {
  const { tx } = useLanguage()
  const label = LABELS[status]

  return (
    <span className={`badge ${MODIFIERS[status]}`} title={label.en}>
      {compact ? SHORT[status] : tx(label.en, label.ar)}
    </span>
  )
}

export function StatusRow({
  label,
  status,
  selected,
}: {
  label: string
  status: Verification
  selected?: boolean
}) {
  return (
    <div className={selected ? 'status-row selected' : 'status-row'}>
      <span>{label}</span>
      <VerificationBadge status={status} />
    </div>
  )
}
