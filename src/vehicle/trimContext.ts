import { createContext, useContext } from 'react'
import type { Trim } from '../content/types'

export const TRIMS: { value: Trim; label: string }[] = [
  { value: 'play', label: 'Play RWD' },
  { value: 'wild', label: 'Wild AWD' },
]

export const trimLabel = (trim: Trim) => TRIMS.find((item) => item.value === trim)?.label ?? trim

export type TrimContextValue = {
  trim: Trim
  setTrim: (trim: Trim) => void
}

export const TrimContext = createContext<TrimContextValue | null>(null)

export function useTrim(): TrimContextValue {
  const value = useContext(TrimContext)
  if (!value) throw new Error('useTrim must be used inside a TrimProvider')
  return value
}
