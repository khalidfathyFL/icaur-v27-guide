import { createContext, useContext } from 'react'
import type { ApiCartLine, CartItemInput } from '../../lib/api'

export type CartContextValue = {
  /** `null` until loaded, and for anyone signed out. */
  lines: ApiCartLine[] | null
  /** Total units, for the header badge. */
  count: number
  busy: boolean
  /** The line for an accessory, if it is in the list. */
  lineFor: (partId: string) => ApiCartLine | undefined
  /** Adds the accessory, or updates its line if it is already there. */
  put: (item: CartItemInput) => Promise<void>
  remove: (partId: string) => Promise<void>
  /** Re-reads the list, e.g. after sending it as a request. */
  refresh: () => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside a CartProvider')
  return value
}
