import type { Localized } from './types'

/**
 * Where owners are. The country list is short on purpose: it covers Egypt and
 * the markets the V27 is actually sold in, plus an escape hatch, rather than
 * every country in the world.
 */
export const COUNTRIES: Localized[] = [
  { en: 'Egypt', ar: 'مصر' },
  { en: 'Saudi Arabia', ar: 'السعودية' },
  { en: 'United Arab Emirates', ar: 'الإمارات' },
  { en: 'Kuwait', ar: 'الكويت' },
  { en: 'Qatar', ar: 'قطر' },
  { en: 'Bahrain', ar: 'البحرين' },
  { en: 'Oman', ar: 'عُمان' },
  { en: 'Jordan', ar: 'الأردن' },
  { en: 'Libya', ar: 'ليبيا' },
  { en: 'Sudan', ar: 'السودان' },
  { en: 'Other', ar: 'أخرى' },
]

/** The 27 Egyptian governorates, which is what "city" means for an owner here. */
export const EGYPT_GOVERNORATES: Localized[] = [
  { en: 'Cairo', ar: 'القاهرة' },
  { en: 'Giza', ar: 'الجيزة' },
  { en: 'Alexandria', ar: 'الإسكندرية' },
  { en: 'Qalyubia', ar: 'القليوبية' },
  { en: 'Sharqia', ar: 'الشرقية' },
  { en: 'Dakahlia', ar: 'الدقهلية' },
  { en: 'Beheira', ar: 'البحيرة' },
  { en: 'Gharbia', ar: 'الغربية' },
  { en: 'Monufia', ar: 'المنوفية' },
  { en: 'Kafr El Sheikh', ar: 'كفر الشيخ' },
  { en: 'Damietta', ar: 'دمياط' },
  { en: 'Port Said', ar: 'بورسعيد' },
  { en: 'Ismailia', ar: 'الإسماعيلية' },
  { en: 'Suez', ar: 'السويس' },
  { en: 'North Sinai', ar: 'شمال سيناء' },
  { en: 'South Sinai', ar: 'جنوب سيناء' },
  { en: 'Beni Suef', ar: 'بني سويف' },
  { en: 'Faiyum', ar: 'الفيوم' },
  { en: 'Minya', ar: 'المنيا' },
  { en: 'Asyut', ar: 'أسيوط' },
  { en: 'Sohag', ar: 'سوهاج' },
  { en: 'Qena', ar: 'قنا' },
  { en: 'Luxor', ar: 'الأقصر' },
  { en: 'Aswan', ar: 'أسوان' },
  { en: 'Red Sea', ar: 'البحر الأحمر' },
  { en: 'New Valley', ar: 'الوادي الجديد' },
  { en: 'Matrouh', ar: 'مطروح' },
]

/** Governorates only apply to Egypt; elsewhere the city is free text. */
export const EGYPT = 'Egypt'

/**
 * Mirrors the rule the API enforces, so the form can object before a round
 * trip. Keep this in step with `STRONG_PASSWORD` in `api/_lib/models.ts`.
 */
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,50}$/

export const PASSWORD_RULE: Localized = {
  en: 'Password needs 8+ characters with an uppercase letter, a lowercase letter, a number and a symbol.',
  ar: 'كلمة المرور تحتاج 8 أحرف على الأقل مع حرف كبير وحرف صغير ورقم ورمز.',
}
