import type { Localized } from '../../content/types'
import type { Language } from '../../i18n/translator'
import type { ApiCenter, CenterPackage, CoverageArea, ProtectionService } from '../../lib/api'

/** Wording shared by the public protection pages and the admin screens. */

export const SERVICE_LABELS: Record<ProtectionService, Localized> = {
  ppf: { en: 'Paint protection film (PPF)', ar: 'فيلم حماية الطلاء (PPF)' },
  ceramic: { en: 'Ceramic coating', ar: 'النانو سيراميك' },
  tint: { en: 'Window tint', ar: 'تظليل الزجاج' },
  windshield: { en: 'Windshield film', ar: 'فيلم الزجاج الأمامي' },
  interior: { en: 'Interior protection', ar: 'حماية الداخلية' },
  underbody: { en: 'Underbody coating', ar: 'عزل أسفل السيارة' },
  'paint-correction': { en: 'Paint correction & polish', ar: 'تصحيح الطلاء والتلميع' },
  wrap: { en: 'Colour wrap', ar: 'تغليف بلون' },
}

export const SERVICES = Object.keys(SERVICE_LABELS) as ProtectionService[]

export const COVERAGE_LABELS: Record<CoverageArea, Localized> = {
  'full-body': { en: 'Full body', ar: 'السيارة كاملة' },
  'full-front': { en: 'Full front', ar: 'الواجهة كاملة' },
  'front-bumper': { en: 'Front bumper', ar: 'الصدام الأمامي' },
  hood: { en: 'Hood', ar: 'الكبوت' },
  fenders: { en: 'Front fenders', ar: 'الرفارف الأمامية' },
  mirrors: { en: 'Mirrors', ar: 'المرايات' },
  headlights: { en: 'Headlights', ar: 'الفوانيس' },
  'a-pillars': { en: 'A-pillars', ar: 'القوائم الأمامية' },
  roof: { en: 'Roof', ar: 'السقف' },
  doors: { en: 'Doors', ar: 'الأبواب' },
  'door-edges': { en: 'Door edges', ar: 'حواف الأبواب' },
  'door-cups': { en: 'Door handle cups', ar: 'تجاويف المقابض' },
  'rocker-panels': { en: 'Rocker panels', ar: 'الأجناب السفلية' },
  'rear-bumper': { en: 'Rear bumper', ar: 'الصدام الخلفي' },
  'trunk-ledge': { en: 'Trunk loading edge', ar: 'حافة الشنطة' },
  windows: { en: 'Side & rear windows', ar: 'الزجاج الجانبي والخلفي' },
  windshield: { en: 'Windshield', ar: 'الزجاج الأمامي' },
  sunroof: { en: 'Sunroof', ar: 'فتحة السقف' },
  'interior-screens': { en: 'Screens', ar: 'الشاشات' },
  'interior-trim': { en: 'Interior trim', ar: 'تجاليد الداخلية' },
  wheels: { en: 'Wheels', ar: 'الجنوط' },
  underbody: { en: 'Underbody', ar: 'أسفل السيارة' },
}

export const COVERAGE_AREAS = Object.keys(COVERAGE_LABELS) as CoverageArea[]

/** Typical makers, offered as suggestions; the field stays free text. */
export const BRAND_SUGGESTIONS = [
  'XPEL',
  '3M',
  'SunTek',
  'LLumar',
  'STEK',
  'Avery Dennison',
  'Hexis',
  'KDX',
  'Gyeon',
  'Gtechniq',
  'Ceramic Pro',
  'IGL',
  'Nasiol',
]

export const MATERIAL_SUGGESTIONS = ['TPU', 'TPH', 'PVC', 'Hybrid', 'Ceramic', 'Graphene', 'Nano-ceramic film', 'Carbon film']

export function centerName(center: Pick<ApiCenter, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return center.name[preferred] || center.name.en || center.name.ar
}

export function packageName(item: Pick<CenterPackage, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return item.name[preferred] || item.name.en || item.name.ar
}

/** "2–3 days", "Half a day", or a single figure. */
export function durationText(duration: CenterPackage['durationDays'], tx: (en: string, ar: string) => string): string | null {
  if (!duration) return null
  const show = (days: number) => (days === 0.5 ? tx('half a day', 'نصف يوم') : String(days))
  if (duration.min === duration.max) {
    return duration.min === 0.5 ? tx('Half a day', 'نصف يوم') : tx(`${duration.min} day${duration.min === 1 ? '' : 's'}`, `${duration.min} يوم`)
  }
  return tx(`${show(duration.min)}–${duration.max} days`, `${show(duration.min)}–${duration.max} يوم`)
}
