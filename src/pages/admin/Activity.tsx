import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/languageContext'
import { ApiError, api, type ApiAuditEntry } from '../../lib/api'

/**
 * The activity log.
 *
 * Read-only: there is no control here to edit or remove an entry, because the
 * API has no endpoint for it. A log an admin can rewrite proves nothing.
 */

const ACTION_LABELS: Record<string, { en: string; ar: string }> = {
  'post.created': { en: 'wrote a post', ar: 'كتب مقالا' },
  'post.updated': { en: 'edited a post', ar: 'عدّل مقالا' },
  'post.approved': { en: 'approved a post', ar: 'وافق على مقال' },
  'post.rejected': { en: 'rejected a post', ar: 'رفض مقالا' },
  'post.deleted': { en: 'deleted a post', ar: 'حذف مقالا' },
  'suggestion.created': { en: 'suggested a correction', ar: 'اقترح تصحيحا' },
  'suggestion.approved': { en: 'approved a correction', ar: 'وافق على تصحيح' },
  'suggestion.rejected': { en: 'rejected a correction', ar: 'رفض تصحيحا' },
  'dealer.created': { en: 'added a dealer', ar: 'أضاف وكيلا' },
  'dealer.updated': { en: 'edited a dealer', ar: 'عدّل وكيلا' },
  'dealer.removed': { en: 'removed a dealer', ar: 'أزال وكيلا' },
  'pricing.updated': { en: 'changed a price', ar: 'غيّر سعرا' },
  'user.registered': { en: 'created an account', ar: 'أنشأ حسابا' },
  'user.role_changed': { en: 'changed a role', ar: 'غيّر صلاحية' },
  'user.status_changed': { en: 'blocked or unblocked an account', ar: 'حظر أو رفع حظر حساب' },
  'user.password_changed': { en: 'changed their password', ar: 'غيّر كلمة المرور' },
  'user.profile_updated': { en: 'updated their profile', ar: 'حدّث ملفه الشخصي' },
}

/** Actions that change who can do what deserve to stand out. */
const SENSITIVE = new Set(['user.role_changed', 'user.status_changed', 'pricing.updated'])

export function Activity() {
  const { t, tx } = useLanguage()
  const [entries, setEntries] = useState<ApiAuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .audit()
      .then(({ entries: list }) => {
        if (!cancelled) setEntries(list)
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof ApiError ? caught.message : 'Could not load.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="form-error">{error}</p>
  if (!entries) return <p className="muted-note">{tx('Loading…', 'جارٍ التحميل…')}</p>

  if (entries.length === 0) {
    return <p className="muted-note">{tx('Nothing has happened yet.', 'لم يحدث شيء بعد.')}</p>
  }

  return (
    <>
      <p className="muted-note">
        {tx(
          'Every change, newest first. Entries cannot be edited or deleted, including by an admin.',
          'كل تغيير، الأحدث أولا. لا يمكن تعديل أو حذف السجلات، ولا حتى من المشرف.',
        )}
      </p>

      <ol className="audit-list">
        {entries.map((entry) => {
          const label = ACTION_LABELS[entry.action]
          return (
            <li key={entry.id} className={SENSITIVE.has(entry.action) ? 'audit-entry sensitive' : 'audit-entry'}>
              <div className="audit-main">
                <strong>{entry.actorName}</strong>
                <span>{label ? t(label) : entry.action}</span>
                {entry.target?.label && <em>{entry.target.label}</em>}
              </div>

              {entry.changes && Object.keys(entry.changes).length > 0 && (
                <p className="audit-changes">
                  {Object.entries(entry.changes)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                    .join(' · ')}
                </p>
              )}

              {entry.note && <p className="audit-note">“{entry.note}”</p>}

              <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
            </li>
          )
        })}
      </ol>
    </>
  )
}
