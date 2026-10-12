import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../auth/authContext'
import { api, apiConfigured, type ApiCartLine, type CartItemInput } from '../../lib/api'
import { CartContext, type CartContextValue } from './cartContext'

/** A loaded list remembers whose it is, so switching accounts never shows or saves the wrong one. */
type Loaded = { userId: string; items: ApiCartLine[] }

const toInput = (line: ApiCartLine): CartItemInput => ({
  partId: line.partId,
  quantity: line.quantity,
  note: line.note,
  fitting: line.fitting,
})

/**
 * The signed-in user's request list. The server holds it; this keeps the
 * latest copy so the header badge and the accessory pages agree without each
 * asking for it.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [busy, setBusy] = useState(false)
  // Saves run one after another, so a fast second click is not overwritten by the first reply.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const latest = useRef<Loaded | null>(null)

  const lines = userId && loaded?.userId === userId ? loaded.items : null

  const store = useCallback((next: Loaded) => {
    latest.current = next
    setLoaded(next)
  }, [])

  const refresh = useCallback(async () => {
    if (!apiConfigured || !userId) return
    const { cart } = await api.getCart()
    store({ userId, items: cart.items })
  }, [userId, store])

  useEffect(() => {
    if (!apiConfigured || !userId) return

    let cancelled = false
    api
      .getCart()
      .then(({ cart }) => {
        // A reply that lands after a sign-out or account switch is dropped.
        if (cancelled) return
        latest.current = { userId, items: cart.items }
        setLoaded(latest.current)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [userId])

  const save = useCallback(
    (change: (items: CartItemInput[]) => CartItemInput[]) => {
      const run = queue.current.then(async () => {
        if (!userId) throw new Error('Sign in to continue.')
        setBusy(true)
        try {
          const current = latest.current?.userId === userId ? latest.current.items.map(toInput) : []
          const { cart } = await api.saveCart(change(current))
          store({ userId, items: cart.items })
        } finally {
          setBusy(false)
        }
      })
      // A failed save must not block the next one; the caller still sees the error.
      queue.current = run.catch(() => undefined)
      return run
    },
    [userId, store],
  )

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: (lines ?? []).reduce((sum, line) => sum + line.quantity, 0),
      busy,
      lineFor: (partId) => lines?.find((line) => line.partId === partId),
      put: (item) =>
        save((items) =>
          items.some((line) => line.partId === item.partId)
            ? items.map((line) => (line.partId === item.partId ? item : line))
            : [...items, item],
        ),
      remove: (partId) => save((items) => items.filter((line) => line.partId !== partId)),
      refresh,
    }),
    [lines, busy, save, refresh],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
