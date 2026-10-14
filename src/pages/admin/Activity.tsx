import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Avatar, EmptyState, FilterSelect, PageHeader } from '../../components/panel/blocks'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiAuditEntry } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { ACTION_LABELS, SENSITIVE_ACTIONS } from './auditLabels'

/**
 * The activity log.
 *
 * Read-only: there is no control here to edit or remove an entry, because the
 * API has no endpoint for it. A log an admin can rewrite proves nothing.
 */

type KindFilter =
  | 'all'
  | 'sensitive'
  | 'post'
  | 'comment'
  | 'suggestion'
  | 'dealer'
  | 'pricing'
  | 'part'
  | 'center'
  | 'insurer'
  | 'order'
  | 'email'
  | 'user'

/** Readable names for the keys an entry's details use. */
const CHANGE_LABELS: Record<string, { en: string; ar: string }> = {
  fields: { en: 'Changed', ar: 'تغيّر' },
  plansAdded: { en: 'Plans added', ar: 'خطط أضيفت' },
  plansRemoved: { en: 'Plans removed', ar: 'خطط حذفت' },
  plansEdited: { en: 'Plans edited', ar: 'خطط عدلت' },
  packagesAdded: { en: 'Packages added', ar: 'باقات أضيفت' },
  packagesRemoved: { en: 'Packages removed', ar: 'باقات حذفت' },
  packagesEdited: { en: 'Packages edited', ar: 'باقات عدلت' },
  merchant: { en: 'Merchant', ar: 'التاجر' },
  byMerchant: { en: 'By the merchant', ar: 'بواسطة التاجر' },
  recipients: { en: 'Recipients', ar: 'المستلمون' },
  subject: { en: 'Subject', ar: 'الموضوع' },
}

export function Activity() {
  const { t, language } = useLanguage()
  const tx = useShortText()
  const [entries, setEntries] = useState<ApiAuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<KindFilter>('all')

  useEffect(() => {
    let cancelled = false
    api
      .audit()
      .then(({ entries: list }) => {
        if (!cancelled) setEntries(list)
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.')))
      })
    return () => {
      cancelled = true
    }
  }, [tx])

  const filtered =
    entries?.filter((entry) =>
      kind === 'all' ? true : kind === 'sensitive' ? SENSITIVE_ACTIONS.has(entry.action) : entry.action.startsWith(`${kind}.`),
    ) ?? null

  const describe = (entry: ApiAuditEntry) => {
    const label = ACTION_LABELS[entry.action]
    return label ? t(label) : entry.action
  }

  return (
    <>
      <PageHeader
        description={tx(
          'Entries cannot be edited or deleted, including by an admin.',
          'لا يمكن تعديل أو حذف السجلات، ولا حتى من المشرف.',
        )}
      />
      <DataTable
        rows={filtered}
        rowKey={(entry) => entry.id}
        error={error}
        searchText={(entry) => `${entry.actorName} ${describe(entry)} ${entry.target?.label ?? ''} ${entry.note ?? ''}`}
        searchPlaceholder={tx('Search person or item…', 'ابحث بالشخص أو العنصر…')}
        filters={
          <FilterSelect<KindFilter>
            label={tx('Kind', 'النوع')}
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: tx('Everything', 'الكل') },
              { value: 'sensitive', label: tx('Access & prices only', 'الصلاحيات والأسعار فقط') },
              { value: 'post', label: tx('Posts', 'المقالات') },
              { value: 'comment', label: tx('Comments', 'التعليقات') },
              { value: 'suggestion', label: tx('Corrections', 'التصحيحات') },
              { value: 'dealer', label: tx('Dealers', 'الوكلاء') },
              { value: 'pricing', label: tx('Prices', 'الأسعار') },
              { value: 'part', label: tx('Accessories', 'الإكسسوارات') },
              { value: 'center', label: tx('Protection centers', 'مراكز الحماية') },
              { value: 'insurer', label: tx('Insurance', 'التأمين') },
              { value: 'order', label: tx('Orders', 'الطلبات') },
              { value: 'email', label: tx('Emails', 'البريد') },
              { value: 'user', label: tx('Accounts', 'الحسابات') },
            ]}
          />
        }
        empty={<EmptyState icon={History} title={tx('Nothing has happened yet', 'لم يحدث شيء بعد')} />}
        pageSize={20}
        columns={[
          {
            key: 'who',
            header: tx('Who', 'من'),
            width: 'minmax(0, 1.3fr)',
            render: (entry) => (
              <span className="panel-cell-person">
                <Avatar name={entry.actorName} size="sm" />
                <span className="panel-cell-main">
                  <strong>{entry.actorName}</strong>
                  <small>{entry.actorRole === 'admin' ? tx('Admin', 'مشرف') : tx('Contributor', 'مساهم')}</small>
                </span>
              </span>
            ),
          },
          {
            key: 'what',
            header: tx('What', 'ماذا'),
            width: 'minmax(0, 2.2fr)',
            render: (entry) => (
              <span className="panel-cell-main">
                <span className={SENSITIVE_ACTIONS.has(entry.action) ? 'panel-audit sensitive' : 'panel-audit'}>{describe(entry)}</span>
                {entry.target?.label && <small>{entry.target.label}</small>}
              </span>
            ),
          },
          {
            key: 'details',
            header: tx('Details', 'التفاصيل'),
            width: 'minmax(0, 2fr)',
            render: (entry) => (
              <span className="panel-cell-main">
                {entry.changes && Object.keys(entry.changes).length > 0 && (
                  <small className="panel-clamp">
                    {Object.entries(entry.changes)
                      .map(([key, value]) => {
                        const label = CHANGE_LABELS[key] ? t(CHANGE_LABELS[key]) : key
                        if (value === true) return label
                        return `${label}: ${Array.isArray(value) ? value.join(', ') : String(value)}`
                      })
                      .join(' · ')}
                  </small>
                )}
                {entry.note && <small className="panel-clamp">“{entry.note}”</small>}
                {!entry.note && !(entry.changes && Object.keys(entry.changes).length > 0) && <small>—</small>}
              </span>
            ),
          },
          {
            key: 'when',
            header: tx('When', 'متى'),
            width: '170px',
            render: (entry) => (
              <time className="panel-muted" dateTime={entry.at}>
                {formatDate(entry.at, language, true)}
              </time>
            ),
          },
        ]}
      />
    </>
  )
}
