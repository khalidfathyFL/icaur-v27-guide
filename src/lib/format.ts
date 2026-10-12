import type { Language } from '../i18n/translator'

/**
 * Dates follow the language the reader chose rather than the browser's
 * locale, so an Arabic page does not show English month names.
 */
export function formatDate(value: string | undefined, language: Language, withTime = false): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  // Arabic month names, but the Western digits the rest of the panel uses.
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(date)
}
