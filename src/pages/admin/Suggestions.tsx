import { useCallback, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { DetailList } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import { StatusPill } from '../../components/StatusPill'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiSuggestion } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { QueueEmpty, ReviewFooter, StatusFilter, type QueueStatus } from './moderation'
import { useOpenRecord } from './useOpenRecord'

const targetLabel = (suggestion: ApiSuggestion) =>
  [suggestion.target.id, suggestion.target.field].filter(Boolean).join(' · ')

export function Suggestions({ params, onChanged }: { params: URLSearchParams; onChanged: () => void }) {
  const { language } = useLanguage()
  const tx = useShortText()
  const record = useOpenRecord('/admin/suggestions', params)
  const [status, setStatus] = useState<QueueStatus>(record.openId ? 'all' : 'pending')
  const [suggestions, setSuggestions] = useState<ApiSuggestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listSuggestions({ queue: true, status })
      .then(({ suggestions: list }) => {
        setSuggestions(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [status, tx])

  useEffect(load, [load])

  const kindLabels: Record<ApiSuggestion['target']['kind'], string> = {
    feature: tx('Guide', 'دليل'),
    spec: tx('Specification', 'مواصفة'),
    equipment: tx('Trim equipment', 'تجهيزات الفئة'),
    dealer: tx('Dealer', 'وكيل'),
    other: tx('Other', 'أخرى'),
  }

  const selected = suggestions?.find((item) => item.id === record.openId) ?? null

  return (
    <>
      <DataTable
        rows={suggestions}
        rowKey={(item) => item.id}
        error={error}
        searchText={(item) => `${targetLabel(item)} ${item.proposed} ${item.authorName}`}
        searchPlaceholder={tx('Search page, text or author…', 'ابحث بالصفحة أو النص أو الكاتب…')}
        filters={
          <StatusFilter
            value={status}
            onChange={(next) => {
              setSuggestions(null)
              setStatus(next)
            }}
          />
        }
        onRowClick={(item) => record.open(item.id)}
        empty={<QueueEmpty status={status} />}
        columns={[
          {
            key: 'target',
            header: tx('About', 'عن'),
            width: 'minmax(0, 2fr)',
            render: (item) => (
              <span className="panel-cell-main">
                <strong>{targetLabel(item)}</strong>
                <small>
                  {kindLabels[item.target.kind]} · {item.authorName}
                </small>
              </span>
            ),
          },
          {
            key: 'proposed',
            header: tx('Proposed', 'المقترح'),
            width: 'minmax(0, 3fr)',
            render: (item) => <span className="panel-clamp">{item.proposed}</span>,
          },
          { key: 'status', header: tx('Status', 'الحالة'), width: '170px', render: (item) => <StatusPill status={item.status} /> },
          {
            key: 'date',
            header: tx('Sent', 'أرسل'),
            width: '130px',
            render: (item) => <span className="panel-muted">{formatDate(item.createdAt, language)}</span>,
          },
          {
            key: 'open',
            header: '',
            width: '110px',
            align: 'end',
            render: (item) => (
              <button type="button" className="panel-button small" onClick={() => record.open(item.id)}>
                {item.status === 'pending' ? tx('Review', 'راجع') : tx('Open', 'افتح')}
                <ChevronRight size={15} aria-hidden="true" className="flip-rtl" />
              </button>
            ),
          },
        ]}
      />

      {selected && (
        <SuggestionDrawer
          key={selected.id}
          suggestion={selected}
          kindLabel={kindLabels[selected.target.kind]}
          onClose={record.close}
          onChanged={() => {
            load()
            onChanged()
          }}
        />
      )}
    </>
  )
}

function SuggestionDrawer({
  suggestion,
  kindLabel,
  onClose,
  onChanged,
}: {
  suggestion: ApiSuggestion
  kindLabel: string
  onClose: () => void
  onChanged: () => void
}) {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function decide(decision: 'approved' | 'rejected', note: string) {
    setBusy(true)
    try {
      await api.reviewSuggestion(suggestion.id, { status: decision, note: note || undefined })
      toast(decision === 'approved' ? tx('Correction accepted.', 'تم قبول التصحيح.') : tx('Correction rejected.', 'تم رفض التصحيح.'))
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open
      busy={busy}
      title={targetLabel(suggestion)}
      subtitle={`${kindLabel} · ${suggestion.authorName} · ${formatDate(suggestion.createdAt, language)}`}
      onClose={onClose}
      footer={suggestion.status === 'pending' ? <ReviewFooter busy={busy} onDecide={decide} /> : undefined}
    >
      <DetailList
        rows={[
          { label: tx('Status', 'الحالة'), value: <StatusPill status={suggestion.status} /> },
          { label: tx('Review note', 'ملاحظة المراجعة'), value: suggestion.reviewNote },
        ]}
      />

      <div className="diff-grid">
        <div>
          <strong>{tx('Now', 'الآن')}</strong>
          <p>{suggestion.current || tx('(not given)', '(غير محدد)')}</p>
        </div>
        <div className="proposed">
          <strong>{tx('Proposed', 'المقترح')}</strong>
          <p>{suggestion.proposed}</p>
        </div>
      </div>

      <section className="panel-preview">
        <p className="panel-preview-label">{tx('Source', 'المصدر')}</p>
        <p>{suggestion.reason}</p>
      </section>
    </Drawer>
  )
}
