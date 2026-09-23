// Comparison rows reflect the GB Auto Egypt launch equipment list.
import type { Comparison } from './types'
import { specs } from './dimensions'

export { specs }

export const comparison: Comparison[] = [
  { label: { en: 'Price (Egypt launch)', ar: 'السعر عند الإطلاق في مصر' }, play: 'EGP 1,900,000', wild: 'EGP 2,150,000' },
  { label: { en: 'Drive', ar: 'الدفع' }, play: 'RWD', wild: 'i-AWD' },
  { label: { en: 'Electric motors', ar: 'المواتير الكهربائية' }, play: '1', wild: '2' },
  { label: { en: 'Power', ar: 'القوة' }, play: '248 hp', wild: '449 hp' },
  { label: { en: 'Torque', ar: 'العزم' }, play: '300 Nm', wild: '505 Nm' },
  { label: { en: 'Battery', ar: 'البطارية' }, play: '20.47 kWh', wild: '34.31 kWh' },
  { label: { en: '0-100 km/h', ar: 'التسارع 0-100' }, play: '8.9 s', wild: '5.9 s' },
  { label: { en: 'Top speed', ar: 'السرعة القصوى' }, play: '170 km/h', wild: '180 km/h' },
  { label: { en: 'AC charge 0-100%', ar: 'شحن متردد 0-100%' }, play: '2.7 h', wild: '3.5 h' },
  { label: { en: 'Wheels', ar: 'الجنوط' }, play: '19 in', wild: '21 in' },
  { label: { en: 'Drive modes', ar: 'أوضاع القيادة' }, play: '5', wild: '8' },
  { label: { en: 'Airbags', ar: 'الوسائد الهوائية' }, play: '6', wild: '7' },
  { label: { en: 'Panoramic roof', ar: 'السقف البانوراما' }, play: 'Not available', wild: 'Dual panoramic' },
  { label: { en: 'Pioneer audio system', ar: 'نظام Pioneer الصوتي' }, play: '8 speakers', wild: '14 speakers + subwoofer' },
  { label: { en: 'Automatic parking', ar: 'الركن الأوتوماتيكي' }, play: 'Not available', wild: 'Standard' },
  { label: { en: 'Seat memory', ar: 'ذاكرة المقاعد' }, play: 'Not available', wild: 'Driver seat' },
  { label: { en: 'Ambient lighting', ar: 'الإضاءة المحيطة' }, play: 'Not available', wild: 'Multi-colour' },
  { label: { en: 'Power tailgate', ar: 'الباب الخلفي الكهربائي' }, play: 'Not available', wild: 'With soft close' },
  { label: { en: 'Heated mirrors', ar: 'المرايات المدفأة' }, play: 'Not available', wild: 'Standard' },
  { label: { en: 'Parking sensors', ar: 'حساسات الركن' }, play: '4 front + 4 rear', wild: '6 front + 6 rear' },
  { label: { en: 'Fatigue monitoring', ar: 'مراقبة إرهاق السائق' }, play: 'Not available', wild: 'Standard' },
]
