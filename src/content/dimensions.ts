import type { Spec } from './types'

/**
 * Core dimensions and powertrain figures.
 *
 * Where an Egypt launch figure and an export-market figure disagree, the Egypt
 * figure is used and the difference is called out in the note.
 */
export const specs: Spec[] = [
  {
    id: 'length',
    label: { en: 'Length', ar: 'الطول' },
    value: { en: '5,045 mm', ar: '5,045 mm' },
    note: {
      en: 'Confirmed by Egypt launch coverage and export-market sources.',
      ar: 'مؤكد من تغطية الإطلاق في مصر ومن مصادر التصدير.',
    },
  },
  {
    id: 'width',
    label: { en: 'Width', ar: 'العرض' },
    value: { en: '1,976 mm', ar: '1,976 mm' },
    note: {
      en: 'Confirmed by Egypt launch coverage and export-market sources.',
      ar: 'مؤكد من تغطية الإطلاق في مصر ومن مصادر التصدير.',
    },
  },
  {
    id: 'height',
    label: { en: 'Height', ar: 'الارتفاع' },
    value: { en: '1,894 mm', ar: '1,894 mm' },
    note: {
      en: 'Confirmed by Egypt launch coverage and export-market sources.',
      ar: 'مؤكد من تغطية الإطلاق في مصر ومن مصادر التصدير.',
    },
  },
  {
    id: 'wheelbase',
    label: { en: 'Wheelbase', ar: 'قاعدة العجلات' },
    value: { en: '2,900 mm', ar: '2,900 mm' },
    note: {
      en: 'Same wheelbase on Play and Wild.',
      ar: 'قاعدة العجلات واحدة في Play و Wild.',
    },
  },
  {
    id: 'ground-clearance',
    label: { en: 'Ground clearance', ar: 'الخلوص الأرضي' },
    value: { en: '210 mm', ar: '210 mm' },
    note: {
      en: 'Egypt launch figure. An official export-market page lists 224 mm, so confirm against the delivered vehicle.',
      ar: 'رقم إطلاق مصر. صفحة تصدير رسمية تذكر 224 مم، لذلك يفضل التأكد من السيارة المستلمة.',
    },
  },
  {
    id: 'approach-angle',
    label: { en: 'Approach angle', ar: 'زاوية الاقتراب' },
    value: { en: '24°', ar: '24°' },
    note: {
      en: 'From the official iCAUR Saudi specification table.',
      ar: 'من جدول مواصفات iCAUR السعودية الرسمي.',
    },
  },
  {
    id: 'departure-angle',
    label: { en: 'Departure angle', ar: 'زاوية المغادرة' },
    value: { en: '23°', ar: '23°' },
    note: {
      en: 'From the official iCAUR Saudi specification table.',
      ar: 'من جدول مواصفات iCAUR السعودية الرسمي.',
    },
  },
  {
    id: 'cargo-capacity',
    label: { en: 'Cargo capacity', ar: 'سعة الشنطة' },
    value: { en: '715 L', ar: '715 L' },
    note: {
      en: 'Confirmed in Egypt launch coverage.',
      ar: 'مؤكد في تغطية الإطلاق في مصر.',
    },
  },
  {
    id: 'cargo-capacity-folded',
    label: { en: 'Cargo capacity, seats folded', ar: 'سعة الشنطة مع طي المقاعد' },
    value: { en: '1,818 L', ar: '1,818 L' },
    note: {
      en: 'Confirmed in Egypt launch coverage.',
      ar: 'مؤكد في تغطية الإطلاق في مصر.',
    },
  },
  {
    id: 'kerb-weight',
    label: { en: 'Kerb weight', ar: 'الوزن' },
    value: { en: '2,100 kg (Play) / 2,355 kg (Wild)', ar: '2,100 kg (Play) / 2,355 kg (Wild)' },
    note: {
      en: 'Play figure from an Egypt dealer listing; Wild AWD figure from the export specification table.',
      ar: 'رقم Play من صفحة وكيل في مصر، ورقم Wild AWD من جدول مواصفات التصدير.',
    },
  },
  {
    id: 'play-battery',
    label: { en: 'Play battery', ar: 'بطارية Play' },
    value: { en: '20.47 kWh LFP', ar: '20.47 kWh LFP' },
    note: {
      en: 'Confirmed for the Egypt Play trim at launch.',
      ar: 'مؤكد لفئة Play في مصر عند الإطلاق.',
    },
  },
  {
    id: 'wild-battery',
    label: { en: 'Wild battery', ar: 'بطارية Wild' },
    value: { en: '34.31 kWh LFP', ar: '34.31 kWh LFP' },
    note: {
      en: 'Confirmed for the Egypt Wild trim at launch.',
      ar: 'مؤكد لفئة Wild في مصر عند الإطلاق.',
    },
  },
  {
    id: 'battery-type',
    label: { en: 'Battery type', ar: 'نوع البطارية' },
    value: { en: 'LFP (Lithium Iron Phosphate)', ar: 'LFP (ليثيوم فوسفات الحديد)' },
    note: {
      en: 'Confirmed in Egypt launch coverage.',
      ar: 'مؤكد في تغطية الإطلاق في مصر.',
    },
  },
  {
    id: 'range-extender',
    label: { en: 'Range extender', ar: 'محرك المدى الممتد' },
    value: { en: '1.5 L turbo petrol generator', ar: 'محرك بنزين 1.5 لتر تيربو كمولد' },
    note: {
      en: 'The petrol engine generates electricity and does not drive the wheels directly.',
      ar: 'محرك البنزين يولد الكهرباء ولا يحرك العجلات مباشرة.',
    },
  },
  {
    id: 'play-ev-range',
    label: { en: 'Play EV range', ar: 'المدى الكهربائي Play' },
    value: { en: 'Up to 95 km NEDC', ar: 'حتى 95 كم NEDC' },
    note: {
      en: 'NEDC figure, not a promise of real-world Egypt range.',
      ar: 'رقم NEDC وليس وعدا بمدى فعلي في مصر.',
    },
  },
  {
    id: 'wild-ev-range',
    label: { en: 'Wild EV range', ar: 'المدى الكهربائي Wild' },
    value: { en: 'Up to 150 km NEDC', ar: 'حتى 150 كم NEDC' },
    note: {
      en: 'Varies with temperature and driving style.',
      ar: 'يتغير حسب الحرارة وأسلوب القيادة.',
    },
  },
  {
    id: 'total-range',
    label: { en: 'Total range', ar: 'المدى الكلي' },
    value: { en: '~1,000 km NEDC', ar: '~1,000 كم NEDC' },
    note: {
      en: 'Egypt launch figure for battery plus fuel. An export table lists 860 km on the stricter WLTC cycle.',
      ar: 'رقم إطلاق مصر للبطارية مع الوقود. جدول تصدير يذكر 860 كم على دورة WLTC الأدق.',
    },
  },
  {
    id: 'fuel-tank',
    label: { en: 'Fuel tank', ar: 'خزان الوقود' },
    value: { en: '60 L', ar: '60 L' },
    note: {
      en: 'Confirmed in Egypt launch coverage.',
      ar: 'مؤكد في تغطية الإطلاق في مصر.',
    },
  },
  {
    id: 'ac-charging',
    label: { en: 'AC charging', ar: 'الشحن المتردد' },
    value: { en: '6.6 kW', ar: '6.6 kW' },
    note: {
      en: '0-100% takes about 2.7 h on Play and 3.5 h on Wild.',
      ar: 'الشحن من 0 إلى 100% يستغرق نحو 2.7 ساعة في Play و 3.5 ساعة في Wild.',
    },
  },
  {
    id: 'dc-charging',
    label: { en: 'DC fast charging', ar: 'الشحن السريع' },
    value: { en: '40 kW (Play) / 60 kW (Wild)', ar: '40 kW (Play) / 60 kW (Wild)' },
    note: {
      en: 'Export specification values; 20-80% is quoted at about 30 minutes.',
      ar: 'قيم من مواصفات التصدير، والشحن من 20 إلى 80% يذكر بنحو 30 دقيقة.',
    },
  },
  {
    id: 'v2l',
    label: { en: 'V2L external power', ar: 'التغذية الخارجية V2L' },
    value: { en: 'Up to 6 kW', ar: 'حتى 6 kW' },
    note: {
      en: 'External discharge output from the official iCAUR Saudi table; confirm the Egypt adapter before use.',
      ar: 'قدرة تفريغ خارجية من جدول iCAUR السعودية؛ تأكد من المحول المتاح في مصر قبل الاستخدام.',
    },
  },
  {
    id: 'towing-capacity',
    label: { en: 'Towing capacity (Wild)', ar: 'قدرة السحب (Wild)' },
    value: { en: '1,600 kg braked', ar: '1,600 kg مع فرامل' },
    note: {
      en: 'AWD export-market value. Verify against Egypt documentation before towing.',
      ar: 'قيمة تصدير لفئة الدفع الرباعي. تحتاج تأكيد من وثائق مصر قبل السحب.',
    },
  },
]
