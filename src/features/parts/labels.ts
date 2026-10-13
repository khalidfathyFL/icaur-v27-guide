import type { Localized } from '../../content/types'
import type { Language } from '../../i18n/translator'
import type { ApiPart, PartAvailability, PartCategory, PartSource } from '../../lib/api'
import { priceFormatter } from '../../content/egypt'

/** Wording shared by the public catalog and the admin screens. */

export const CATEGORY_LABELS: Record<PartCategory, Localized> = {
  protection: { en: 'Protection', ar: 'الحماية' },
  exterior: { en: 'Exterior', ar: 'الخارجية' },
  interior: { en: 'Interior', ar: 'الداخلية' },
  electronics: { en: 'Electronics', ar: 'الإلكترونيات' },
  lighting: { en: 'Lighting', ar: 'الإضاءة' },
  'cargo-roof': { en: 'Roof & cargo', ar: 'السقف والحمولة' },
  offroad: { en: 'Off-road', ar: 'الطرق الوعرة' },
  maintenance: { en: 'Maintenance', ar: 'الصيانة' },
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as PartCategory[]

/** Typical types, offered as suggestions; the field stays free text. */
export const SUBCATEGORY_SUGGESTIONS = [
  'PPF',
  'Ceramic coating',
  'Window film',
  'Skid plate',
  'Mud flaps',
  'Door edge guards',
  'Bumper guard',
  'Underbody coating',
  'Floor mats',
  'Trunk liner',
  'Seat covers',
  'Screen protector',
  'Side steps',
  'Roof rack',
  'Dash cam',
  'LED bulbs',
]

export const SOURCE_LABELS: Record<PartSource, Localized> = {
  local: { en: 'Local · Egypt', ar: 'محلي · مصر' },
  china: { en: 'Import · China', ar: 'استيراد · الصين' },
}

export const AVAILABILITY_LABELS: Record<PartAvailability, Localized> = {
  in_stock: { en: 'In stock', ar: 'متوفر' },
  on_order: { en: 'On order', ar: 'بالطلب' },
  unavailable: { en: 'Unavailable', ar: 'غير متوفر' },
}

/** Badge tone for the existing `.badge` styles. */
export const AVAILABILITY_TONE: Record<PartAvailability, 'ok' | 'verify' | 'no'> = {
  in_stock: 'ok',
  on_order: 'verify',
  unavailable: 'no',
}

/** The reader's language when the part has it, otherwise whichever was written. */
export function partSide(part: { name: Localized }, language: Language): 'en' | 'ar' {
  const preferred = language === 'ar' ? 'ar' : 'en'
  if (part.name[preferred]) return preferred
  return preferred === 'en' ? 'ar' : 'en'
}

export function partName(part: Pick<ApiPart, 'name'>, language: Language): string {
  return part.name[partSide(part, language)] || part.name.en || part.name.ar
}

/** The same pound formatting the Egypt page uses. */
export { priceFormatter as egp } from '../../content/egypt'

/** A price, or "Price on request" when there is none yet. */
export function priceOrAsk(value: number | null | undefined, tx: (en: string, ar: string) => string): string {
  return value === null || value === undefined ? tx('Price on request', 'السعر عند الطلب') : priceFormatter.format(value)
}

export function formatOriginal(amount: number, currency: 'CNY' | 'USD'): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

/** "7–14 days", or a single figure when both ends match. */
export function leadTimeText(lead: ApiPart['leadTimeDays'], tx: (en: string, ar: string) => string): string | null {
  if (!lead) return null
  const range = lead.min === lead.max ? `${lead.min}` : `${lead.min}–${lead.max}`
  return tx(`${range} days`, `${range} يوم`)
}

/** WhatsApp links want digits only, in international form. Egyptian 01… numbers get +20. */
export function whatsappLink(number: string): string {
  let digits = number.replace(/[^\d]/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `20${digits.slice(1)}`
  return `https://wa.me/${digits}`
}
