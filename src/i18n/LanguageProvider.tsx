import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createTranslator,
  documentDirection,
  documentLanguage,
  isLanguage,
  type Language,
} from './translator'
import { LanguageContext, type LanguageContextValue } from './languageContext'
import { readStored, writeStored } from '../lib/storage'

const STORAGE_KEY = 'icaur-language'
const DEFAULT_LANGUAGE: Language = 'en'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = readStored(STORAGE_KEY)
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
  })

  useEffect(() => {
    writeStored(STORAGE_KEY, language)
    document.documentElement.lang = documentLanguage(language)
    document.documentElement.dir = documentDirection(language)
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({ ...createTranslator(language), setLanguage }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
