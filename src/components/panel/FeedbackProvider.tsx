import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useShortText } from '../../i18n/languageContext'
import {
  FeedbackContext,
  type ConfirmOptions,
  type FeedbackContextValue,
  type ToastTone,
} from './feedback'

type Toast = { id: number; message: string; tone: ToastTone }

const TOAST_ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const TOAST_LIFETIME_MS = 4500

/**
 * Toasts and the confirm dialog for the panel. Both live in one provider so a
 * page asks for them with a hook instead of carrying its own banner state.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = ++nextId.current
      setToasts((current) => [...current.slice(-3), { id, message, tone }])
      window.setTimeout(() => dismiss(id), TOAST_LIFETIME_MS)
    },
    [dismiss],
  )

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const value = useMemo<FeedbackContextValue>(() => ({ toast, confirm }), [toast, confirm])

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="panel-toasts" role="status" aria-live="polite">
        {toasts.map((item) => {
          const Icon = TOAST_ICONS[item.tone]
          return (
            <div className={`panel-toast ${item.tone}`} key={item.id}>
              <Icon size={18} aria-hidden="true" />
              <span>{item.message}</span>
              <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>

      {pending && (
        <ConfirmDialog
          options={pending}
          onClose={(ok) => {
            pending.resolve(ok)
            setPending(null)
          }}
        />
      )}
    </FeedbackContext.Provider>
  )
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const tx = useShortText()
  const ref = useRef<HTMLDialogElement>(null)
  const tone = options.tone ?? 'primary'

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="panel-confirm"
      aria-labelledby="panel-confirm-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose(false)
      }}
    >
      <span className={`panel-confirm-icon ${tone}`} aria-hidden="true">
        <AlertTriangle size={22} />
      </span>
      <h2 id="panel-confirm-title">{options.title}</h2>
      {options.message && <p>{options.message}</p>}
      <div className="panel-confirm-actions">
        <button type="button" className="panel-button" onClick={() => onClose(false)}>
          {tx('Cancel', 'إلغاء')}
        </button>
        <button
          type="button"
          className={`panel-button ${tone === 'danger' ? 'danger' : 'primary'}`}
          onClick={() => onClose(true)}
          autoFocus
        >
          {options.confirmLabel ?? tx('Confirm', 'تأكيد')}
        </button>
      </div>
    </dialog>
  )
}
