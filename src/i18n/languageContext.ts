import { createContext, useContext } from 'react'
import type { Language, Translator } from './translator'

export type LanguageContextValue = Translator & {
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside a LanguageProvider')
  return value
}

/**
 * Like `tx`, but always a single language. Compact chrome (nav links, menu
 * buttons) would not fit as "Guides / الأدلة" in bilingual mode.
 */
export function useShortText(): (en: string, ar: string) => string {
  const { t } = useLanguage()
  return (en, ar) => t({ en, ar })
}
