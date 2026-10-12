import type { ReactNode } from 'react'
import { CarFront, LockKeyhole } from 'lucide-react'
import { useShortText } from '../../i18n/languageContext'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

/**
 * What a panel route shows before there is a panel to show: still checking
 * the session, signed out, no access, or a build without the API.
 */
export function PanelGate({
  title,
  text,
  actions,
  loading = false,
}: {
  title: string
  text?: string
  actions?: ReactNode
  loading?: boolean
}) {
  const tx = useShortText()
  useDocumentTitle(title)

  return (
    <div className="panel-gate">
      <div className="panel-gate-card" aria-busy={loading}>
        <a className="panel-gate-brand" href="#/">
          <span className="panel-brand-mark">
            <CarFront size={18} aria-hidden="true" />
          </span>
          <strong>iCAUR V27</strong>
        </a>
        {loading ? (
          <span className="panel-spinner" aria-label={tx('Loading…', 'جارٍ التحميل…')} />
        ) : (
          <span className="panel-gate-icon">
            <LockKeyhole size={24} aria-hidden="true" />
          </span>
        )}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
        {actions && <div className="panel-gate-actions">{actions}</div>}
      </div>
    </div>
  )
}
