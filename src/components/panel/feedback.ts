import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  /** `danger` for anything that deletes, blocks or cannot be undone. */
  tone?: 'danger' | 'primary'
}

export type FeedbackContextValue = {
  toast: (message: string, tone?: ToastTone) => void
  /** Resolves true when the person confirms, false when they cancel or dismiss. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null)

function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error('Panel feedback must be used inside a FeedbackProvider')
  return value
}

export const useToast = () => useFeedback().toast
export const useConfirm = () => useFeedback().confirm
