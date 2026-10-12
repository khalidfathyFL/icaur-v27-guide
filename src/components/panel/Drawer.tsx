import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useShortText } from '../../i18n/languageContext'

/**
 * A slide-over from the inline end, used for reviewing and editing one record
 * while the list behind it keeps its filters and page. Built on a modal
 * <dialog>, so focus stays inside it and Escape closes it for free.
 */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  footer,
  busy = false,
  size = 'md',
  children,
}: {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  footer?: ReactNode
  /** While true the drawer refuses to close, so a save is never abandoned half way. */
  busy?: boolean
  size?: 'md' | 'lg'
  children: ReactNode
}) {
  const tx = useShortText()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      className={`panel-drawer ${size}`}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      // A click that lands on the dialog element itself is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div className="panel-drawer-inner">
        <header className="panel-drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="panel-icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label={tx('Close', 'إغلاق')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="panel-drawer-body">{children}</div>

        {footer && <footer className="panel-drawer-foot">{footer}</footer>}
      </div>
    </dialog>
  )
}
