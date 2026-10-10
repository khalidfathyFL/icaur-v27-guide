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

/** What each status promises the reader, shown in the legend. */
const MEANINGS: Record<Verification, { en: string; ar: string }> = {
  'confirmed-egypt': {
    en: 'Checked against Egypt-market cars or official Egypt documents.',
    ar: 'تم التحقق منها على سيارات السوق المصري أو من وثائق مصر الرسمية.',
  },
  'confirmed-export': {
    en: 'Confirmed on another export market, not yet for Egypt.',
    ar: 'مؤكدة في سوق تصدير آخر، ولم تتأكد لمصر بعد.',
  },
  likely: {
    en: 'Strong evidence it applies, waiting for official confirmation.',
    ar: 'أدلة قوية على توفرها، في انتظار تأكيد رسمي.',
  },
  verify: {
    en: 'Missing or conflicting evidence. Check on your own car.',
    ar: 'أدلة ناقصة أو متعارضة. تحقق منها على سيارتك.',
  },
  'not-available': {
    en: 'Not offered on this trim or market.',
    ar: 'غير متوفرة في هذه الفئة أو هذا السوق.',
  },
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

  const meaning = MEANINGS[status]

  return (
    <span className={`badge ${MODIFIERS[status]}`} title={`${label.en}: ${meaning.en}`}>
      {compact ? SHORT[status] : tx(label.en, label.ar)}
    </span>
  )
}

/** Explains every badge once, so readers know how much to trust what they see. */
export function VerificationLegend() {
  const { tx } = useLanguage()
  const statuses = Object.keys(LABELS) as Verification[]

  return (
    <dl className="legend">
      {statuses.map((status) => (
        <div key={status}>
          <dt>
            <VerificationBadge status={status} />
          </dt>
          <dd>{tx(MEANINGS[status].en, MEANINGS[status].ar)}</dd>
        </div>
      ))}
    </dl>
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
