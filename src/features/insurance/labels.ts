import type { Localized } from '../../content/types'
import type { Language } from '../../i18n/translator'
import type { ApiInsurer, InsuranceCover, InsurancePlan } from '../../lib/api'

/** Wording shared by the public insurance pages and the admin screen. */

export const COVER_LABELS: Record<InsuranceCover, Localized> = {
  'own-damage': { en: 'Accident damage to your car', ar: 'أضرار الحوادث لسيارتك' },
  'total-loss': { en: 'Total loss', ar: 'الهلاك الكلي' },
  theft: { en: 'Theft', ar: 'السرقة' },
  fire: { en: 'Fire', ar: 'الحريق' },
  'third-party': { en: 'Damage to others (third party)', ar: 'أضرار الغير (الطرف الثالث)' },
  'natural-disasters': { en: 'Floods & natural disasters', ar: 'السيول والكوارث الطبيعية' },
  riots: { en: 'Riots & strikes', ar: 'الشغب والإضرابات' },
  glass: { en: 'Glass & windshield', ar: 'الزجاج والزجاج الأمامي' },
  battery: { en: 'High-voltage battery', ar: 'بطارية الجهد العالي' },
  'personal-accident': { en: 'Driver & passenger injury', ar: 'إصابة السائق والركاب' },
  roadside: { en: 'Roadside assistance', ar: 'المساعدة على الطريق' },
  towing: { en: 'Towing', ar: 'الونش' },
  'replacement-car': { en: 'Replacement car', ar: 'سيارة بديلة' },
  abroad: { en: 'Cover outside Egypt', ar: 'التغطية خارج مصر' },
}

export const COVERS = Object.keys(COVER_LABELS) as InsuranceCover[]

export function insurerName(insurer: Pick<ApiInsurer, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return insurer.name[preferred] || insurer.name.en || insurer.name.ar
}

export function planName(plan: Pick<InsurancePlan, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return plan.name[preferred] || plan.name.en || plan.name.ar
}

/** The written side the reader wants, else the other; null when neither is written. */
export function either(value: Localized | undefined, language: Language): string | null {
  if (!value) return null
  const preferred = language === 'ar' ? 'ar' : 'en'
  return value[preferred] || value.en || value.ar || null
}

/**
 * The yearly premium for a car of this value: the rate applied to the price,
 * but never below the plan's minimum. Null when the plan has no rate.
 */
export function yearlyPremium(plan: Pick<InsurancePlan, 'ratePct' | 'minPremiumEgp'>, carPriceEgp: number): number | null {
  if (plan.ratePct === undefined || carPriceEgp <= 0) return null
  const premium = Math.round((carPriceEgp * plan.ratePct) / 100)
  return Math.max(premium, plan.minPremiumEgp ?? 0)
}

/** "2.25%", without trailing zeros. */
export const pct = (value: number) => `${Number(value.toFixed(2))}%`
