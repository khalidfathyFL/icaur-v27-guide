import type { Localized, LocalizedList } from '../content/types'

/**
 * `both` renders English as the primary voice with Arabic underneath, which is
 * how the showroom and service teams actually read the site together.
 */
export type Language = 'both' | 'en' | 'ar'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'both', label: 'English + عربي' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

export const isLanguage = (value: unknown): value is Language =>
  value === 'both' || value === 'en' || value === 'ar'

export type Translator = {
  language: Language
  /** True when both languages are shown together. */
  isBilingual: boolean
  /** Primary rendering of a bilingual string. */
  t: (value: Localized) => string
  /** Secondary rendering, non-null only in bilingual mode. */
  alt: (value: Localized) => string | null
  /** Primary rendering of a bilingual list. */
  list: (value: LocalizedList) => string[]
  /** Secondary rendering of a bilingual list, non-null only in bilingual mode. */
  altList: (value: LocalizedList) => string[] | null
  /**
   * Inline pair for interface chrome that is not part of the content model
   * (button labels, section headings, aria labels).
   */
  tx: (en: string, ar: string) => string
  /** Joins a primary and secondary label into one inline string, e.g. a category chip. */
  pair: (value: Localized) => string
}

export function createTranslator(language: Language): Translator {
  const primary = language === 'ar' ? 'ar' : 'en'
  const isBilingual = language === 'both'

  return {
    language,
    isBilingual,
    t: (value) => value[primary],
    alt: (value) => (isBilingual ? value.ar : null),
    list: (value) => value[primary],
    altList: (value) => (isBilingual ? value.ar : null),
    tx: (en, ar) => (language === 'en' ? en : language === 'ar' ? ar : `${en} / ${ar}`),
    pair: (value) => (isBilingual ? `${value.en} / ${value.ar}` : value[primary]),
  }
}

/** Document-level direction. Arabic-only flips the whole page; bilingual keeps an LTR frame. */
export const documentDirection = (language: Language) => (language === 'en' ? 'ltr' : 'rtl')

export const documentLanguage = (language: Language) => (language === 'ar' ? 'ar' : 'en')
