import type { Localized, Trim, Verification } from './types'

/**
 * Egypt market facts from the GB Auto launch: official prices, warranty, and a
 * trim-by-trim equipment matrix.
 *
 * This is the only place on the site where "confirmed for Egypt" claims come
 * from, so every entry here traces back to Egypt launch coverage rather than to
 * China or another export market.
 */

export const EGYPT_SOURCE_IDS = [
  'gb-auto-icaur-egypt-launch',
  'alam-el-syarat-v27-egypt-equipment',
  'al-mal-news-v27-egypt-specs',
] as const

export const distributor = {
  name: 'GB Auto',
  role: {
    en: 'Exclusive iCAUR distributor in Egypt. The V27 is the brand’s first model for the Egyptian market.',
    ar: 'الوكيل الحصري لعلامة iCAUR في مصر، و V27 أول طراز للعلامة في السوق المصري.',
  },
} as const

export const warranty = [
  {
    id: 'vehicle',
    label: { en: 'Vehicle warranty', ar: 'ضمان السيارة' },
    value: { en: '6 years / 200,000 km', ar: '6 سنوات / 200,000 كم' },
  },
  {
    id: 'battery',
    label: { en: 'Battery warranty', ar: 'ضمان البطارية' },
    value: { en: '8 years / 200,000 km', ar: '8 سنوات / 200,000 كم' },
  },
] as const

export type TrimPricing = {
  trim: Trim
  label: string
  /** Official launch price in Egyptian pounds. */
  priceEgp: number
  drive: Localized
  power: string
  torque: string
  battery: string
  acceleration: string
  topSpeed: string
  /** AC charge time from 0-100%. */
  chargeTime: string
  wheels: string
  driveModes: string
  airbags: string
}

export const trimPricing: TrimPricing[] = [
  {
    trim: 'play',
    label: 'Play RWD',
    priceEgp: 1_900_000,
    drive: { en: 'Rear-wheel drive, single motor', ar: 'دفع خلفي بموتور واحد' },
    power: '248 hp',
    torque: '300 Nm',
    battery: '20.47 kWh',
    acceleration: '8.9 s',
    topSpeed: '170 km/h',
    chargeTime: '2.7 h',
    wheels: '19 in',
    driveModes: '5',
    airbags: '6',
  },
  {
    trim: 'wild',
    label: 'Wild AWD',
    priceEgp: 2_150_000,
    drive: { en: 'Intelligent all-wheel drive, dual motor', ar: 'دفع رباعي ذكي بموتورين' },
    power: '449 hp',
    torque: '505 Nm',
    battery: '34.31 kWh',
    acceleration: '5.9 s',
    topSpeed: '180 km/h',
    chargeTime: '3.5 h',
    wheels: '21 in',
    driveModes: '8',
    airbags: '7',
  },
]

export const priceFormatter = new Intl.NumberFormat('en-EG', {
  style: 'currency',
  currency: 'EGP',
  maximumFractionDigits: 0,
})

export type EquipmentAvailability = 'standard' | 'not-available' | 'verify'

export type EquipmentItem = {
  id: string
  name: Localized
  group: 'exterior' | 'interior' | 'safety' | 'technology'
  play: EquipmentAvailability
  wild: EquipmentAvailability
}

/** Equipment as announced for the Egyptian market at launch. */
export const equipment: EquipmentItem[] = [
  // Exterior
  { id: 'led-lights', group: 'exterior', name: { en: 'LED headlights, taillights and DRLs', ar: 'إضاءة LED أمامية وخلفية ونهارية' }, play: 'standard', wild: 'standard' },
  { id: 'auto-high-beam', group: 'exterior', name: { en: 'Automatic high beam', ar: 'تحكم تلقائي في الضوء العالي' }, play: 'standard', wild: 'standard' },
  { id: 'light-rain-sensor', group: 'exterior', name: { en: 'Automatic light and rain sensors', ar: 'حساس إضاءة وحساس مطر' }, play: 'standard', wild: 'standard' },
  { id: 'mirror-auto-fold', group: 'exterior', name: { en: 'Automatic mirror folding', ar: 'طي المرايات تلقائيا' }, play: 'standard', wild: 'standard' },
  { id: 'side-step', group: 'exterior', name: { en: 'Fixed side steps', ar: 'مراقي جانبية ثابتة' }, play: 'standard', wild: 'standard' },
  { id: 'privacy-glass', group: 'exterior', name: { en: 'Privacy rear glass', ar: 'زجاج خلفي معتم' }, play: 'standard', wild: 'standard' },
  { id: 'heated-mirrors', group: 'exterior', name: { en: 'Heated door mirrors', ar: 'مرايات مدفأة' }, play: 'not-available', wild: 'standard' },
  { id: 'panoramic-roof', group: 'exterior', name: { en: 'Dual panoramic sunroof', ar: 'سقف بانوراما مزدوج' }, play: 'not-available', wild: 'standard' },
  { id: 'power-tailgate', group: 'exterior', name: { en: 'Power tailgate with soft close', ar: 'باب خلفي كهربائي بخاصية الغلق الناعم' }, play: 'not-available', wild: 'standard' },

  // Interior
  { id: 'smart-key', group: 'interior', name: { en: 'Smart key with keyless entry', ar: 'مفتاح ذكي ودخول بدون مفتاح' }, play: 'standard', wild: 'standard' },
  { id: 'leather-seats', group: 'interior', name: { en: 'Leather upholstery', ar: 'فرش جلد' }, play: 'standard', wild: 'standard' },
  { id: 'ventilated-seats', group: 'interior', name: { en: 'Power front seats with ventilation', ar: 'مقاعد أمامية كهربائية مع تهوية' }, play: 'standard', wild: 'standard' },
  { id: 'dual-zone-ac', group: 'interior', name: { en: 'Dual-zone automatic climate control', ar: 'تكييف أوتوماتيك ثنائي المناطق' }, play: 'standard', wild: 'standard' },
  { id: 'rear-vents', group: 'interior', name: { en: 'Rear air vents', ar: 'فتحات تكييف خلفية' }, play: 'standard', wild: 'standard' },
  { id: 'acoustic-glass', group: 'interior', name: { en: 'Acoustic insulating glass', ar: 'زجاج عازل للصوت' }, play: 'standard', wild: 'standard' },
  { id: 'seat-memory', group: 'interior', name: { en: 'Driver seat memory and welcome function', ar: 'ذاكرة مقعد السائق ووضع الترحيب' }, play: 'not-available', wild: 'standard' },
  { id: 'ambient-lighting', group: 'interior', name: { en: 'Multi-colour ambient lighting', ar: 'إضاءة محيطة متعددة الألوان' }, play: 'not-available', wild: 'standard' },

  // Technology
  { id: 'cluster', group: 'technology', name: { en: '8.88-inch instrument cluster', ar: 'عداد رقمي 8.88 بوصة' }, play: 'standard', wild: 'standard' },
  { id: 'centre-screen', group: 'technology', name: { en: '15.4-inch centre touchscreen', ar: 'شاشة مركزية 15.4 بوصة' }, play: 'standard', wild: 'standard' },
  { id: 'phone-projection', group: 'technology', name: { en: 'Apple CarPlay and Android Auto', ar: 'أبل كاربلاي وأندرويد أوتو' }, play: 'standard', wild: 'standard' },
  { id: 'voice-control', group: 'technology', name: { en: 'Voice command control', ar: 'تحكم بالأوامر الصوتية' }, play: 'standard', wild: 'standard' },
  { id: 'wireless-charging', group: 'technology', name: { en: 'Wireless phone charging', ar: 'شحن لاسلكي للهاتف' }, play: 'standard', wild: 'standard' },
  { id: 'dash-camera', group: 'technology', name: { en: 'Front dash camera', ar: 'كاميرا أمامية مسجلة' }, play: 'standard', wild: 'standard' },
  { id: 'audio-play', group: 'technology', name: { en: 'Pioneer audio, 8 speakers', ar: 'نظام Pioneer بـ 8 سماعات' }, play: 'standard', wild: 'not-available' },
  { id: 'audio-wild', group: 'technology', name: { en: 'Pioneer audio, 14 speakers + subwoofer', ar: 'نظام Pioneer بـ 14 سماعة + سب ووفر' }, play: 'not-available', wild: 'standard' },

  // Safety and ADAS
  { id: 'airbags', group: 'safety', name: { en: 'Airbags (6 Play / 7 Wild)', ar: 'وسائد هوائية (6 في Play / 7 في Wild)' }, play: 'standard', wild: 'standard' },
  { id: 'abs-ebd-esp', group: 'safety', name: { en: 'ABS with EBD and ESP', ar: 'ABS مع EBD و ESP' }, play: 'standard', wild: 'standard' },
  { id: 'hhc-hdc-rsc', group: 'safety', name: { en: 'Hill hold, hill descent and roll stability control', ar: 'مساعد الوقوف على المنحدر، نزول المنحدرات، وثبات ضد الانقلاب' }, play: 'standard', wild: 'standard' },
  { id: 'epb-autohold', group: 'safety', name: { en: 'Electric parking brake with Auto Hold', ar: 'فرامل انتظار كهربائية مع Auto Hold' }, play: 'standard', wild: 'standard' },
  { id: 'camera-540', group: 'safety', name: { en: '540° surround camera', ar: 'كاميرا محيطية 540 درجة' }, play: 'standard', wild: 'standard' },
  { id: 'acc-tja', group: 'safety', name: { en: 'Adaptive cruise control with Traffic Jam Assist', ar: 'مثبت سرعة تكيفي مع مساعد الزحام' }, play: 'standard', wild: 'standard' },
  { id: 'aeb-fcw-rcw', group: 'safety', name: { en: 'AEB with forward and rear collision warning', ar: 'فرملة طوارئ تلقائية مع تحذير تصادم أمامي وخلفي' }, play: 'standard', wild: 'standard' },
  { id: 'lka-ldw', group: 'safety', name: { en: 'Lane keeping assist and lane departure warning', ar: 'مساعد الحفاظ على المسار وتحذير مغادرة الحارة' }, play: 'standard', wild: 'standard' },
  { id: 'bsd-rcta', group: 'safety', name: { en: 'Blind spot detection with rear cross-traffic alert and braking', ar: 'مراقبة النقطة العمياء مع تحذير وفرملة حركة المرور الخلفية' }, play: 'standard', wild: 'standard' },
  { id: 'tpms', group: 'safety', name: { en: 'Tire pressure monitoring', ar: 'مراقبة ضغط الإطارات' }, play: 'standard', wild: 'standard' },
  { id: 'parking-sensors', group: 'safety', name: { en: 'Parking sensors (4+4 Play / 6+6 Wild)', ar: 'حساسات ركن (4+4 في Play / 6+6 في Wild)' }, play: 'standard', wild: 'standard' },
  { id: 'auto-park', group: 'safety', name: { en: 'Automatic parking assist', ar: 'مساعد الركن الأوتوماتيكي' }, play: 'not-available', wild: 'standard' },
  { id: 'fatigue-monitor', group: 'safety', name: { en: 'Driver fatigue monitoring', ar: 'مراقبة إرهاق السائق' }, play: 'not-available', wild: 'standard' },
]

export const EQUIPMENT_GROUPS: { id: EquipmentItem['group']; name: Localized }[] = [
  { id: 'exterior', name: { en: 'Exterior', ar: 'الخارج' } },
  { id: 'interior', name: { en: 'Interior and comfort', ar: 'الداخل والراحة' } },
  { id: 'technology', name: { en: 'Screen and technology', ar: 'الشاشة والتقنية' } },
  { id: 'safety', name: { en: 'Safety and ADAS', ar: 'السلامة و ADAS' } },
]

/** Maps launch equipment to the verification vocabulary used across the site. */
export const equipmentVerification: Record<EquipmentAvailability, Verification> = {
  standard: 'confirmed-egypt',
  'not-available': 'not-available',
  verify: 'verify',
}

export const colours: Localized[] = [
  { en: 'White', ar: 'أبيض' },
  { en: 'Black', ar: 'أسود' },
  { en: 'Grey', ar: 'رمادي' },
  { en: 'Silver', ar: 'فضي' },
  { en: 'Green', ar: 'أخضر' },
  { en: 'Brown', ar: 'بني' },
]
