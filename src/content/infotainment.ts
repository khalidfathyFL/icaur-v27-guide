import type { Localized, Verification } from './types'

/**
 * The V27 centre-screen ("head unit display") model behind the simulator.
 *
 * Layout, menu names, order and option wording follow the official iCAUR V27
 * User Manual (S5DREEVLHDOM26EN01, March 2026, section 5-7 "Head Unit Display").
 * Where the manual and the Egypt "iCAUR V27 Infotainment Settings" owner's guide
 * (Version 2, 18 September 2026) disagree on wording, the manual wins. Settings the
 * Egypt guide documents but the manual does not list are kept, because Egypt cars
 * have them.
 *
 * Explanations, Egypt tips and warnings are our own bilingual text. Nothing here is
 * copied from either document's illustrations.
 */

export type ControlSpec =
  /** An on/off switch. */
  | { kind: 'toggle'; defaultOn: boolean }
  /** A segmented list where exactly one option is active. */
  | { kind: 'choice'; options: string[]; defaultIndex: number }
  /** A momentary command with no persistent state. */
  | { kind: 'action'; actions: string[] }
  /** A progress bar the car lets you drag. */
  | { kind: 'slider'; min: number; max: number; step: number; defaultValue: number; unit?: string }

export type InfotainmentControl = {
  id: string
  /** Label as printed on the vehicle screen. */
  label: string
  /** Sub-heading this control sits under on the car's page, e.g. "WINDOWS". */
  section?: string
  /** What the setting actually changes, in both site languages. */
  description: Localized
  /** The guide's Egypt-specific recommendation for this setting. */
  egyptTip?: Localized
  /** A safety warning attached to this setting. */
  warning?: Localized
  status: Verification
  control: ControlSpec
}

export type MenuIcon =
  | 'car'
  | 'wheel'
  | 'radar'
  | 'lightbulb'
  | 'energy'
  | 'mic'
  | 'display'
  | 'volume'
  | 'wifi'
  | 'service'
  | 'info'

export type InfotainmentMenu = {
  id: string
  icon: MenuIcon
  /** Position in the car's own left-hand settings list. */
  index: number
  name: Localized
  subtitle: Localized
  controls: InfotainmentControl[]
}

const toggle = (defaultOn = false): ControlSpec => ({ kind: 'toggle', defaultOn })
const choice = (options: string[], defaultIndex = 0): ControlSpec => ({
  kind: 'choice',
  options,
  defaultIndex,
})
const action = (...actions: string[]): ControlSpec => ({ kind: 'action', actions })
const slider = (defaultValue: number, min = 0, max = 100, step = 1, unit?: string): ControlSpec => ({
  kind: 'slider',
  min,
  max,
  step,
  defaultValue,
  unit,
})

/** In the Egypt owner's guide, so confirmed on Egypt cars. */
const EGYPT: Verification = 'confirmed-egypt'
/** Only in the export owner's manual; not yet seen on an Egypt car. */
const EXPORT: Verification = 'confirmed-export'

export const infotainmentMenus: InfotainmentMenu[] = [
  {
    id: 'body-control',
    icon: 'car',
    index: 1,
    name: { en: 'Body control', ar: 'التحكم في الهيكل' },
    subtitle: {
      en: 'Windows, mirrors, wipers, the custom button, locking, driving profiles and seats',
      ar: 'النوافذ، المرايات، المساحات، الزر المخصص، القفل، ملفات القيادة، والمقاعد',
    },
    controls: [
      {
        id: 'all-open',
        label: 'Windows',
        section: 'WINDOWS',
        description: {
          en: 'One-touch control of all four windows. Ventilate opens them a small amount rather than fully, the quickest way to flush hot air out of a car that has been standing in the sun.',
          ar: 'تحكم بلمسة واحدة في النوافذ الأربع. وضع التهوية يفتحها قليلا بدل الفتح الكامل، وهو أسرع طريقة لطرد الهواء الساخن من سيارة واقفة في الشمس.',
        },
        status: EGYPT,
        control: action('All open', 'Ventilate', 'All close'),
      },
      {
        id: 'rain-close',
        label: 'Auto window close on rainy days',
        section: 'WINDOWS',
        description: {
          en: 'The rain sensor closes any open windows by itself when it detects rain. An automatic car wash will trigger it too, which is usually a good thing.',
          ar: 'حساس المطر يغلق أي نافذة مفتوحة تلقائيا عند اكتشاف المطر. مغسلة السيارات الأوتوماتيكية تشغله أيضا، وهو أمر مفيد عادة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'passenger-lock',
        label: 'Passenger window lock',
        section: 'WINDOWS',
        description: {
          en: 'Disables the window switches in the other doors so only the driver can operate the windows. The setting most parents turn on first.',
          ar: 'يوقف مفاتيح النوافذ في باقي الأبواب بحيث يتحكم السائق وحده في النوافذ. أول إعداد يفعّله معظم الآباء.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'lock-window',
        label: 'Auto lock control',
        section: 'WINDOWS',
        description: {
          en: 'Decides what the windows do when you lock the car. The first option shuts everything; the second leaves them slightly open so the cabin does not turn into an oven while parked.',
          ar: 'يحدد ما تفعله النوافذ عند قفل السيارة. الخيار الأول يغلقها بالكامل، والثاني يتركها مفتوحة قليلا حتى لا تتحول الكابينة إلى فرن أثناء الوقوف.',
        },
        status: EGYPT,
        control: choice(['Auto close windows when locked', 'Lock car and lower windows for ventilation'], 0),
      },
      {
        id: 'mirror-fold',
        label: 'Rearview mirror fold',
        section: 'EXTERIOR REARVIEW MIRROR',
        description: {
          en: 'Folds or unfolds the mirrors immediately. Useful in tight garages and narrow side streets.',
          ar: 'يطوي أو يفرد المرايات فورا. مفيد في الجراجات الضيقة والشوارع الجانبية الصغيرة.',
        },
        status: EGYPT,
        control: action('Fold', 'Unfold'),
      },
      {
        id: 'mirror-adjust',
        label: 'Adjust the external rearview mirrors',
        section: 'EXTERIOR REARVIEW MIRROR',
        description: {
          en: 'Opens the on-screen controls for aiming each mirror.',
          ar: 'يفتح أدوات ضبط اتجاه كل مراية على الشاشة.',
        },
        status: EGYPT,
        control: action('Left mirror', 'Right mirror'),
      },
      {
        id: 'mirror-auto-fold',
        label: 'Auto fold when lock',
        section: 'EXTERIOR REARVIEW MIRROR',
        description: {
          en: 'The mirrors fold in automatically whenever you lock the car, and unfold when you unlock it.',
          ar: 'تنطوي المرايات تلقائيا عند قفل السيارة وتنفرد عند فتحها.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'reverse-tilt',
        label: 'Exterior rearview mirrors tilt down when reversing',
        section: 'EXTERIOR REARVIEW MIRROR',
        description: {
          en: 'The mirror glass dips as you select reverse so you can see the kerb and your rear wheel.',
          ar: 'ينخفض زجاج المراية عند اختيار الرجوع للخلف حتى ترى الرصيف والعجلة الخلفية.',
        },
        egyptTip: {
          en: 'Saves a lot of scraped alloys on high Cairo kerbs.',
          ar: 'يوفر عليك خدوش كثيرة في الجنوط بسبب أرصفة القاهرة المرتفعة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'wiper-sensitivity',
        label: 'Automatic wiper sensitivity',
        section: 'WIPERS',
        description: {
          en: 'How eagerly the rain sensor triggers the wipers when the stalk is set to automatic. Higher settings wipe more often for the same amount of water.',
          ar: 'مدى سرعة استجابة حساس المطر لتشغيل المساحات عند ضبط الذراع على الوضع التلقائي. المستويات الأعلى تمسح أكثر لنفس كمية المياه.',
        },
        egyptTip: {
          en: 'Keep this on Low. Dust settling on the windscreen can trip a sensitive rain sensor, and dry wiping on a dusty screen scratches the glass and ruins the blades.',
          ar: 'اتركه على Low. الأتربة المتراكمة على الزجاج قد تشغل الحساس الحساس، والمسح الجاف على زجاج مترب يخدش الزجاج ويتلف ريش المساحات.',
        },
        status: EGYPT,
        control: choice(['Low', 'Medium', 'High', 'Maximum'], 0),
      },
      {
        id: 'rear-wiper',
        label: 'Rear wiper',
        section: 'WIPERS',
        description: {
          en: 'Switches the rear wiper on or off from the screen.',
          ar: 'يشغل مساحة الزجاج الخلفي أو يوقفها من الشاشة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'rear-wash',
        label: 'Rear wash',
        section: 'WIPERS',
        description: {
          en: 'Sprays washer fluid on the rear glass and wipes it.',
          ar: 'يرش سائل التنظيف على الزجاج الخلفي ويمسحه.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'custom-short',
        label: 'Display custom buttons - Short press',
        section: 'DISPLAY CUSTOM BUTTONS',
        description: {
          en: 'The physical custom button below the screen has two jobs: a short press and a roll. This picks what the short press does.',
          ar: 'الزر المخصص الفعلي أسفل الشاشة له وظيفتان: الضغطة القصيرة والتدوير. هنا تختار وظيفة الضغطة القصيرة.',
        },
        status: EGYPT,
        control: choice(['Passenger window disabled', 'One-touch photo capture', 'Auto parking'], 0),
      },
      {
        id: 'custom-roll',
        label: 'Display custom buttons - Scroll',
        section: 'DISPLAY CUSTOM BUTTONS',
        description: {
          en: 'Rolling the same button adjusts the screen brightness.',
          ar: 'تدوير نفس الزر يضبط إضاءة الشاشة.',
        },
        status: EXPORT,
        control: choice(['Adjust display brightness'], 0),
      },
      {
        id: 'steering-custom',
        label: 'Steering Wheel Customization',
        section: 'DISPLAY CUSTOM BUTTONS',
        description: {
          en: 'Chooses which function the customisable steering wheel button triggers. Listed in the Egypt guide but not in the owner’s manual.',
          ar: 'يحدد الوظيفة التي يشغلها زر الدركسيون القابل للتخصيص. موجود في دليل مصر وغير مذكور في دليل المالك.',
        },
        status: EGYPT,
        control: choice(['Voice', 'Media', 'A/C'], 0),
      },
      {
        id: 'key-fob-custom',
        label: 'Key Fob Button Customization',
        section: 'DISPLAY CUSTOM BUTTONS',
        description: {
          en: 'Sets what the extra button on your remote does. A/C On starts the air conditioning remotely so the cabin is cool before you reach the car. Listed in the Egypt guide but not in the owner’s manual.',
          ar: 'يحدد وظيفة الزر الإضافي في الريموت. خيار A/C On يشغل التكييف عن بعد حتى تبرد الكابينة قبل أن تصل للسيارة. موجود في دليل مصر وغير مذكور في دليل المالك.',
        },
        egyptTip: {
          en: 'Easily the most valuable setting on this page in an Egyptian summer.',
          ar: 'بلا منازع أهم إعداد في هذه الصفحة في صيف مصر.',
        },
        status: EGYPT,
        control: choice(['Find My Car', 'A/C On'], 1),
      },
      {
        id: 'door-lock',
        label: 'Door Lock',
        section: 'VEHICLE LOCK',
        description: {
          en: 'Locks (On) or unlocks (Off) the doors from the screen. The padlock above the car on the home screen does the same.',
          ar: 'يقفل الأبواب (On) أو يفتحها (Off) من الشاشة. القفل فوق السيارة في الشاشة الرئيسية يفعل نفس الشيء.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'unlock-approach',
        label: 'Auto unlock when near the car',
        section: 'VEHICLE LOCK',
        description: {
          en: 'The car unlocks by itself when it senses the smart key nearby. Convenient with full hands; turn it off if you would rather the car stayed locked until you press something.',
          ar: 'تفتح السيارة نفسها عند استشعار المفتاح الذكي قريبا. مريح ويداك مشغولتان، وأوقفه إذا كنت تفضل أن تبقى مقفلة حتى تضغط بنفسك.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'lock-walk-away',
        label: 'Auto lock when leaving',
        section: 'VEHICLE LOCK',
        description: {
          en: 'The car locks itself once the key has moved a certain distance away. It only works with every door, the tailgate and the bonnet fully shut and the key outside the car.',
          ar: 'تقفل السيارة نفسها بمجرد ابتعاد المفتاح مسافة معينة. يعمل فقط مع إغلاق كل الأبواب والباب الخلفي والكبوت بالكامل ووجود المفتاح خارج السيارة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'lock-driving',
        label: 'Auto lock when driving',
        section: 'VEHICLE LOCK',
        description: {
          en: 'Locks all doors automatically once you pass 15 km/h.',
          ar: 'يقفل كل الأبواب تلقائيا بمجرد تجاوز سرعة 15 كم/س.',
        },
        egyptTip: {
          en: 'Worth leaving on in city traffic.',
          ar: 'يفضل تركه مفعلا في زحام المدينة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'unlock-parking',
        label: 'Auto unlock when parking',
        section: 'VEHICLE LOCK',
        description: {
          en: 'Unlocks the doors when you shift into P and unbuckle your seatbelt.',
          ar: 'يفتح الأبواب عند نقل ناقل الحركة إلى P وفك حزام الأمان.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'key-reminder',
        label: 'Key left behind reminder',
        section: 'VEHICLE LOCK',
        description: {
          en: 'Warns you to take your phone and key with you before leaving the vehicle.',
          ar: 'ينبهك لأخذ هاتفك ومفتاحك قبل مغادرة السيارة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'driving-habit',
        label: 'Driving profile',
        section: 'DRIVING PROFILE',
        description: {
          en: 'Stored driver profiles that remember habits such as steering wheel and seat position, so the car can hold different preferences for different people in the household.',
          ar: 'ملفات سائق محفوظة تتذكر عادات مثل وضع الدركسيون والمقعد، حتى تحتفظ السيارة بتفضيلات مختلفة لأفراد البيت.',
        },
        status: EGYPT,
        control: choice(['Seat 1', 'Seat 2', 'Seat 3'], 0),
      },
      {
        id: 'seat-adjust',
        label: 'Seats',
        section: 'SEAT',
        description: {
          en: 'On-screen arrows for the seat you select. Driver seat: backrest forward and back, whole seat up and down, whole seat forward and back. Passenger seat: backrest forward and back, whole seat forward and back.',
          ar: 'أسهم على الشاشة للمقعد المختار. مقعد السائق: الظهر للأمام والخلف، المقعد كله لأعلى ولأسفل، والمقعد كله للأمام والخلف. مقعد الراكب: الظهر للأمام والخلف، والمقعد كله للأمام والخلف.',
        },
        status: EGYPT,
        control: action('Driver seat', 'Passenger seat'),
      },
      {
        id: 'easy-entry',
        label: 'Easy Entry/Exit',
        section: 'SEAT',
        description: {
          en: 'The driver’s seat slides back when you switch the car off to give you room to get out, then returns to your position when you return. The manual puts this under Welcome mode as "Easy access".',
          ar: 'يتراجع مقعد السائق للخلف عند إطفاء السيارة ليعطيك مساحة للنزول، ثم يعود لوضعك عند العودة. دليل المالك يضعه تحت وضع الترحيب باسم "Easy access".',
        },
        status: EGYPT,
        control: toggle(true),
      },
    ],
  },
  {
    id: 'driving-setting',
    icon: 'wheel',
    index: 2,
    name: { en: 'Driving setting', ar: 'إعدادات القيادة' },
    subtitle: {
      en: 'Braking behaviour, stability systems and driver monitoring',
      ar: 'سلوك الفرملة، أنظمة الثبات، ومراقبة السائق',
    },
    controls: [
      {
        id: 'hill-descent',
        label: 'Hill descent control',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'On a steep descent the car holds a low, steady speed by itself so you can keep both feet off the pedals and concentrate on steering. For off-road and steep unpaved slopes, not for normal roads.',
          ar: 'على المنحدرات الحادة تحافظ السيارة على سرعة منخفضة ثابتة بنفسها حتى ترفع قدميك عن الدواسات وتركز في التوجيه. مخصص للطرق الوعرة والمنحدرات غير الممهدة وليس للطرق العادية.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'autohold',
        label: 'Auto hold',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'When you come to a stop the brakes stay applied after you lift your foot off the pedal, and release when you press the accelerator again.',
          ar: 'عند التوقف تبقى الفرامل مضغوطة بعد رفع قدمك عن الدواسة، وتتحرر عند الضغط على دواسة البنزين مرة أخرى.',
        },
        egyptTip: {
          en: 'Removes the strain of stop-and-go traffic.',
          ar: 'يخفف إرهاق القيادة في الزحام المتقطع.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'brake-hold',
        label: 'Brake Hold',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'A separate brake-holding switch the manual lists next to Auto hold. Check on the car how it behaves differently before relying on it.',
          ar: 'مفتاح منفصل لتثبيت الفرامل يذكره دليل المالك بجوار Auto hold. تأكد من السيارة كيف يختلف سلوكه قبل الاعتماد عليه.',
        },
        status: EXPORT,
        control: toggle(false),
      },
      {
        id: 'parking-brake',
        label: 'Parking brake',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'Applies (On) and releases (Off) the electronic parking brake. It appears greyed out while the vehicle is moving.',
          ar: 'يشغل (On) ويحرر (Off) فرامل الانتظار الكهربائية. يظهر معطلا أثناء تحرك السيارة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'esc',
        label: 'Electronic stability control',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'Detects a skid and brakes individual wheels to keep the car pointing where you steered. Leave it on.',
          ar: 'يكتشف الانزلاق ويفرمل عجلات بعينها ليبقي السيارة في اتجاه التوجيه. اتركه مفعلا.',
        },
        egyptTip: {
          en: 'The only common reason to switch it off is to rock the car free when bogged down in deep sand.',
          ar: 'السبب الوحيد الشائع لإيقافه هو تحرير السيارة عند الغرز في الرمال العميقة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'brake-cleaning',
        label: 'Brake disc rust removal',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'Because regenerative braking does most of the slowing, the ordinary discs are used lightly and can develop surface rust or a squeal. This temporarily holds back regeneration so the friction brakes wipe the discs clean, then switches itself off when finished.',
          ar: 'لأن الفرملة الاسترجاعية تقوم بمعظم الإبطاء، تستخدم الأقراص العادية بشكل خفيف وقد يظهر عليها صدأ سطحي أو صرير. هذا الخيار يقلل الاسترجاع مؤقتا حتى تنظف الفرامل الاحتكاكية الأقراص، ثم يتوقف من تلقاء نفسه.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'regen',
        label: 'Regenerative Braking',
        section: 'DRIVING SCENE ASSIST',
        description: {
          en: 'When you lift off the accelerator the electric motor slows the car and turns that momentum back into charge. It is what gives an EV its distinctive one-pedal feel. Listed in the Egypt guide but not on this page of the owner’s manual.',
          ar: 'عند رفع قدمك عن دواسة البنزين يبطئ الموتور الكهربائي السيارة ويحول هذه الحركة إلى شحن. هذا ما يعطي إحساس القيادة بدواسة واحدة. موجود في دليل مصر وغير مذكور في هذه الصفحة من دليل المالك.',
        },
        status: EGYPT,
        control: choice(['Low', 'Standard', 'High'], 1),
      },
      {
        id: 'fatigue',
        label: 'Fatigue monitoring',
        section: 'DRIVING SAFETY MONITORING',
        description: {
          en: 'Uses the driver-facing camera to watch for signs of drowsiness, such as eyes closing or the head dropping, and warns you to rest.',
          ar: 'يستخدم الكاميرا الموجهة للسائق لمراقبة علامات النعاس مثل إغلاق العينين أو سقوط الرأس، وينبهك للراحة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'distraction',
        label: 'Distraction monitoring',
        section: 'DRIVING SAFETY MONITORING',
        description: {
          en: 'Warns you when your eyes have been off the road for too long, typically looking down at a phone.',
          ar: 'ينبهك عندما تبتعد عيناك عن الطريق لفترة طويلة، غالبا عند النظر إلى الهاتف.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'monitoring-sensitivity',
        label: 'Monitoring sensitivity setting',
        section: 'DRIVING SAFETY MONITORING',
        description: {
          en: 'How quickly fatigue and distraction monitoring decide you need a warning. High warns sooner.',
          ar: 'مدى سرعة قرار مراقبة الإرهاق والتشتت بأنك تحتاج تنبيها. المستوى العالي ينبه أسرع.',
        },
        status: EXPORT,
        control: choice(['Low', 'High'], 1),
      },
      {
        id: 'speed-warning',
        label: 'Speed Warning',
        section: 'DRIVING SAFETY MONITORING',
        description: {
          en: 'Sounds an alert when you exceed the speed you set with the - and + buttons. Listed in the Egypt guide but not on this page of the owner’s manual.',
          ar: 'يصدر تنبيها عند تجاوز السرعة التي تضبطها بزري - و +. موجود في دليل مصر وغير مذكور في هذه الصفحة من دليل المالك.',
        },
        egyptTip: {
          en: 'The guide suggests On at 120 km/h, which matches the motorway limit and the radar cameras.',
          ar: 'ينصح الدليل بتفعيله عند 120 كم/س، وهو حد الطرق السريعة وسرعة كاميرات الرادار.',
        },
        status: EGYPT,
        control: choice(['Off', 'Low', 'High'], 2),
      },
    ],
  },
  {
    id: 'adas',
    icon: 'radar',
    index: 3,
    name: { en: 'ADAS', ar: 'أنظمة ADAS' },
    subtitle: {
      en: 'Cruise control and the active safety systems that can intervene in your steering and braking',
      ar: 'مثبت السرعة وأنظمة السلامة الفعالة التي يمكنها التدخل في التوجيه والفرملة',
    },
    controls: [
      {
        id: 'cruise-mode',
        label: 'Cruise mode switch',
        description: {
          en: 'Adaptive cruise control holds your set speed but also keeps a gap to the vehicle ahead, slowing and accelerating for you. Constant speed cruise control is the traditional kind: it holds the speed you set and nothing more, so you brake yourself.',
          ar: 'مثبت السرعة التكيفي يحافظ على سرعتك المضبوطة ويحافظ أيضا على مسافة من السيارة أمامك، فيبطئ ويسرع نيابة عنك. المثبت الثابت هو النوع التقليدي: يحافظ على السرعة فقط وتتولى أنت الفرملة.',
        },
        status: EGYPT,
        control: choice(['Adaptive cruise control', 'Constant speed cruise control'], 0),
      },
      {
        id: 'leading-vehicle',
        label: 'Forward vehicle start reminder',
        section: 'INTELLIGENT DRIVING ASSISTANCE',
        description: {
          en: 'When you are stopped in traffic and the car in front pulls away without you noticing, the system prompts you to move. A small feature that saves a lot of horn from behind.',
          ar: 'عندما تكون متوقفا في الزحام وتتحرك السيارة أمامك دون أن تنتبه، ينبهك النظام للتحرك. ميزة صغيرة توفر عليك كثيرا من الكلاكس من الخلف.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'fcw',
        label: 'Forward collision warning assist',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Warns you when you are closing on the vehicle ahead too quickly, and prepares the brakes.',
          ar: 'ينبهك عند الاقتراب من السيارة أمامك بسرعة كبيرة، ويجهز الفرامل.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'fcw-sensitivity',
        label: 'Front collision warning sensitivity',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'How soon the warning arrives. Early gives you more notice but triggers more often; Late only speaks up when the situation is genuinely close.',
          ar: 'متى يصل التحذير. الخيار المبكر يعطيك وقتا أطول لكنه يعمل كثيرا، والمتأخر لا ينبه إلا عندما يكون الموقف قريبا فعلا.',
        },
        egyptTip: {
          en: 'The guide recommends Late, so it stays useful instead of crying wolf in close traffic.',
          ar: 'ينصح الدليل بالخيار المتأخر حتى يظل مفيدا بدل التنبيه المستمر في الزحام القريب.',
        },
        status: EGYPT,
        control: choice(['Early', 'Moderate', 'Late'], 2),
      },
      {
        id: 'elk',
        label: 'Emergency lane keeping',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Steers the car back into its lane, but only when drifting out would cause a collision: with an oncoming vehicle, a vehicle alongside you, or off the edge of the road. It stays out of the way the rest of the time.',
          ar: 'يعيد السيارة إلى مسارها، لكن فقط عندما يؤدي الانحراف إلى اصطدام: بسيارة قادمة، أو سيارة بجوارك، أو الخروج عن حافة الطريق. وفيما عدا ذلك لا يتدخل.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'rctb',
        label: 'Rear cross-traffic braking',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Brakes automatically while you are reversing if it detects a vehicle crossing behind you. Valuable when backing out of a parking space with poor visibility.',
          ar: 'يفرمل تلقائيا أثناء الرجوع للخلف إذا اكتشف سيارة تعبر خلفك. مفيد عند الخروج من مكان ركن ضعيف الرؤية.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'ldw',
        label: 'Lane departure warning',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Alerts you when you cross a lane line without signalling. The third option adds a gentle steering correction to nudge you back. Close switches it off.',
          ar: 'ينبهك عند عبور خط الحارة دون إشارة. الخيار الثالث يضيف تصحيحا خفيفا في التوجيه لإعادتك للمسار. خيار Close يوقفه.',
        },
        egyptTip: {
          en: 'On most Egyptian roads the lane markings are faint, repainted at odd angles, or simply ignored, so the system warns and tugs at the wheel constantly with no real lane to keep you in. Close is the practical setting here; turn it back on abroad where the markings can be trusted.',
          ar: 'في معظم الطرق المصرية تكون علامات الحارات باهتة أو معاد رسمها بزوايا غريبة أو متجاهلة تماما، فيظل النظام ينبه ويشد الدركسيون بلا حارة حقيقية. خيار Close هو العملي هنا، وأعده للعمل في الخارج حيث يمكن الوثوق بالعلامات.',
        },
        status: EGYPT,
        control: choice(['Close', 'Warning only', 'Early warning and deviation'], 0),
      },
    ],
  },
  {
    id: 'lighting',
    icon: 'lightbulb',
    index: 4,
    name: { en: 'Lighting settings', ar: 'إعدادات الإضاءة' },
    subtitle: {
      en: 'Two tabs: Interior lights and Exterior lights',
      ar: 'تبويبان: الإضاءة الداخلية والإضاءة الخارجية',
    },
    controls: [
      {
        id: 'ambient-mode',
        label: 'Ambient lighting',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'How the ambient lighting chooses its colour. Theme follows a preset scheme, Music rhythm pulses in time with whatever is playing, and Custom lets you pick the colour yourself.',
          ar: 'كيف تختار الإضاءة المحيطة لونها. الثيم يتبع نمطا جاهزا، وإيقاع الموسيقى ينبض مع ما يعمل حاليا، والمخصص يتيح لك اختيار اللون بنفسك.',
        },
        status: EGYPT,
        control: choice(['On', 'Theme', 'Music rhythm', 'Custom'], 0),
      },
      {
        id: 'ambient-brightness',
        label: 'Ambient light brightness',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'Drag the bar to set the intensity of the ambient lights. Worth lowering at night so the reflections in the windscreen do not distract you.',
          ar: 'اسحب الشريط لضبط شدة الإضاءة المحيطة. يفضل خفضها ليلا حتى لا تشتتك الانعكاسات على الزجاج الأمامي.',
        },
        status: EGYPT,
        control: slider(60, 0, 100, 5, '%'),
      },
      {
        id: 'ambient-colour',
        label: 'Ambient lights',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'Slide along the colour bar to set the cabin colour, or pick one of the preset colours stored under My favorites.',
          ar: 'اسحب على شريط الألوان لضبط لون الكابينة، أو اختر أحد الألوان الجاهزة المحفوظة في المفضلة.',
        },
        status: EGYPT,
        control: action('Colour bar', 'My favorites'),
      },
      {
        id: 'ambient-effect',
        label: 'Ambient Light Effect',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'Always On holds a steady colour; Breathing fades slowly in and out. Listed in the Egypt guide but not in the owner’s manual.',
          ar: 'الوضع الدائم يثبت اللون، ووضع التنفس يخفت ويسطع ببطء. موجود في دليل مصر وغير مذكور في دليل المالك.',
        },
        status: EGYPT,
        control: choice(['Always On', 'Breathing'], 0),
      },
      {
        id: 'ambient-zones',
        label: 'Roof light',
        section: 'AMBIENT LIGHT CONTROL',
        description: {
          en: 'Includes or excludes the roof lighting from the ambient colour scheme.',
          ar: 'يضم إضاءة السقف إلى نظام ألوان الإضاءة المحيطة أو يستبعدها منه.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'dome',
        label: 'Auto dome light',
        section: 'SCENE LIGHTING EFFECTS',
        description: {
          en: 'The interior light comes on by itself when you unlock the car or open a door, and fades out once you are moving.',
          ar: 'تضيء الإضاءة الداخلية تلقائيا عند فتح السيارة أو فتح باب، وتخفت بعد التحرك.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'ambient-alert',
        label: 'Ambient light alert',
        section: 'SCENE LIGHTING EFFECTS',
        description: {
          en: 'The ambient strips flash to reinforce a safety warning, for example when a vehicle is in your blind spot as you signal. A warning you catch in your peripheral vision rather than one you have to look for.',
          ar: 'تومض شرائط الإضاءة لتأكيد تحذير السلامة، مثل وجود سيارة في النقطة العمياء أثناء إعطاء الإشارة. تحذير تلتقطه بطرف عينك بدل البحث عنه.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'welcome',
        label: 'Welcome ambient light',
        section: 'SCENE LIGHTING EFFECTS',
        description: {
          en: 'A short lighting sequence that plays as you unlock and approach the car.',
          ar: 'تسلسل إضاءة قصير يعمل عند فتح السيارة والاقتراب منها.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'headlamp',
        label: 'Headlamp',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'The headlight switch on the screen. Auto lets the light sensor turn the low beams on at dusk and in tunnels.',
          ar: 'مفتاح المصابيح على الشاشة. الوضع Auto يترك حساس الضوء يشغل الإضاءة المنخفضة عند الغروب وفي الأنفاق.',
        },
        status: EXPORT,
        control: choice(['Close', 'Low beam', 'Position lights', 'Auto', 'Rear fog lamp'], 3),
      },
      {
        id: 'auto-high-beam',
        label: 'Auto high beam',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'The front camera switches between high and low beam for you, dipping for oncoming traffic and cars ahead.',
          ar: 'الكاميرا الأمامية تبدل بين الإضاءة العالية والمنخفضة نيابة عنك، وتخفض الضوء للسيارات القادمة والتي أمامك.',
        },
        status: EXPORT,
        control: toggle(false),
      },
      {
        id: 'beam-distance',
        label: 'Headlight beam distance',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'Headlight leveling. Lower the beam (Near) when the boot is heavily loaded or you are towing, so the raised nose does not dazzle oncoming drivers.',
          ar: 'ضبط ارتفاع المصابيح. اخفض الشعاع (Near) عند تحميل الشنطة بثقل أو السحب، حتى لا تبهر مقدمة السيارة المرتفعة السائقين القادمين.',
        },
        status: EXPORT,
        control: choice(['Near', 'Medium', 'Very far', 'Farthest'], 0),
      },
      {
        id: 'find-car',
        label: 'Find my car',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'Flashes the exterior lights for the chosen length of time so you can spot the car. Genuinely handy in a large mall garage.',
          ar: 'تومض الأضواء الخارجية للمدة المختارة حتى تجد سيارتك. مفيد فعلا في جراج مول كبير.',
        },
        status: EGYPT,
        control: choice(['Close', '15 s', '30 s', '60 s', '120 s'], 2),
      },
      {
        id: 'follow-me',
        label: 'Follow me home lights',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'The headlights stay on for the selected time after you lock the car, lighting your way to the door. Useful on an unlit driveway or in a compound.',
          ar: 'تبقى المصابيح الأمامية مضاءة للمدة المختارة بعد قفل السيارة لتنير طريقك إلى الباب. مفيد في ممر غير مضاء أو داخل كمبوند.',
        },
        status: EGYPT,
        control: choice(['Close', '15 s', '30 s', '60 s', '120 s'], 1),
      },
      {
        id: 'turn-signal',
        label: 'Turn signal flash count',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'How many times the indicator flashes when you tap the stalk lightly without holding it, the lane-change signal. Higher numbers give other drivers longer to notice you.',
          ar: 'عدد ومضات الإشارة عند لمس الذراع لمسة خفيفة دون تثبيته، أي إشارة تغيير الحارة. الأرقام الأعلى تعطي السائقين الآخرين وقتا أطول لملاحظتك.',
        },
        status: EGYPT,
        control: choice(['3', '5', '7'], 0),
      },
      {
        id: 'breathing-indicator',
        label: 'Breathing indicator for charging/discharging',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'A slow pulsing light shows that the car is charging or supplying power, so you can tell from a distance.',
          ar: 'إضاءة تنبض ببطء توضح أن السيارة تشحن أو تمد كهرباء، حتى تعرف ذلك من بعيد.',
        },
        status: EXPORT,
        control: toggle(true),
      },
    ],
  },
  {
    id: 'energy',
    icon: 'energy',
    index: 5,
    name: { en: 'Energy management', ar: 'إدارة الطاقة' },
    subtitle: {
      en: 'The most important section in the car: charging, energy mode and discharging',
      ar: 'أهم قسم في السيارة: الشحن، وضع الطاقة، والتفريغ',
    },
    controls: [
      {
        id: 'charge-limit',
        label: 'Charging limit',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Sets how full the battery will charge, anywhere from 50% to 100%.',
          ar: 'يحدد مدى امتلاء البطارية عند الشحن، من 50% حتى 100%.',
        },
        egyptTip: {
          en: 'The V27 uses an LFP battery, which is happy being charged to 100%. A full charge about once a month actually helps the car read the remaining charge accurately, so you do not need to baby it at 80%.',
          ar: 'تستخدم V27 بطارية LFP التي لا تتأثر بالشحن حتى 100%. الشحن الكامل مرة شهريا يساعد السيارة على قراءة الشحن المتبقي بدقة، فلا داعي للتوقف عند 80%.',
        },
        status: EGYPT,
        control: slider(100, 50, 100, 5, '%'),
      },
      {
        id: 'fuel-cap',
        label: 'Fuel cap unlock',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Releases the fuel filler door for the petrol that feeds the range extender. The fuel-pump icon on the home screen does the same.',
          ar: 'يفتح غطاء خزان الوقود الذي يغذي محرك المدى الممتد. أيقونة الوقود في الشاشة الرئيسية تفعل نفس الشيء.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'range-display',
        label: 'Driving range display',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Which test standard the car uses to estimate range. NEDC produces a larger, more optimistic number. WLTC is the newer and more realistic standard and will usually be closer to what you actually achieve.',
          ar: 'المعيار الذي تستخدمه السيارة لتقدير المدى. NEDC يعطي رقما أكبر وأكثر تفاؤلا، و WLTC هو المعيار الأحدث والأقرب للواقع وعادة ما يكون أقرب لما تحققه فعلا.',
        },
        egyptTip: {
          en: 'The guide recommends WLTC: a realistic range figure you can plan around.',
          ar: 'ينصح الدليل بـ WLTC لأنه رقم واقعي يمكنك التخطيط على أساسه.',
        },
        status: EGYPT,
        control: choice(['NEDC', 'WLTC'], 1),
      },
      {
        id: 'slow-current',
        label: 'Slow charging current limit',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Caps the current the car will draw when AC charging. Turn it on when the supply cannot cope with full current; charging gets slower but gentler on the wiring.',
          ar: 'يحد من التيار الذي تسحبه السيارة عند الشحن المتردد. فعّله عندما لا يتحمل مصدر الكهرباء التيار الكامل، فيصبح الشحن أبطأ لكن أرفق بالتوصيلات.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'slow-current-value',
        label: 'Slow charging current',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'The maximum AC charging current when the limit is on. The car never draws more than the value you choose.',
          ar: 'أقصى تيار للشحن المتردد عند تفعيل الحد. السيارة لا تسحب أبدا أكثر من القيمة التي تختارها.',
        },
        egyptTip: {
          en: 'On an ordinary household socket, 8A or 10A is the safe choice. Leave 16A and 32A for a properly installed wallbox.',
          ar: 'على بريزة منزلية عادية، 8A أو 10A هو الاختيار الآمن. اترك 16A و 32A لشاحن حائط مركب بشكل صحيح.',
        },
        status: EXPORT,
        control: choice(['8A', '10A', '16A', '32A'], 2),
      },
      {
        id: 'scheduled-charging',
        label: 'Scheduled charging',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Sets a window during which the car will charge, so you can plug in when you arrive home but only draw power during off-peak hours.',
          ar: 'يحدد فترة زمنية تشحن فيها السيارة، حتى توصل الكابل عند وصولك للمنزل لكن تسحب الكهرباء في ساعات انخفاض الاستهلاك فقط.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'scheduled-repeat',
        label: 'Scheduled charging - repeat',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Whether the charging window applies once or every day.',
          ar: 'هل تنطبق فترة الشحن مرة واحدة أم كل يوم.',
        },
        status: EXPORT,
        control: choice(['One-time', 'Every day'], 1),
      },
      {
        id: 'scheduled-continue',
        label: "Charging continues if the limit isn't reached",
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'If the window ends before the battery reaches your charging limit, the car keeps charging until it does.',
          ar: 'إذا انتهت الفترة قبل وصول البطارية لحد الشحن، تستمر السيارة في الشحن حتى تصل إليه.',
        },
        status: EXPORT,
        control: toggle(false),
      },
      {
        id: 'stationary-charge',
        label: 'In place engine charging',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Runs the petrol range extender while the car is parked so it can recharge the battery without a charging point. Useful where there is nowhere to plug in.',
          ar: 'يشغل محرك المدى الممتد والسيارة متوقفة لشحن البطارية دون نقطة شحن. مفيد حيث لا يوجد مكان للتوصيل.',
        },
        warning: {
          en: 'Never use it in a closed garage, basement car park or any enclosed space. The engine is running and producing exhaust fumes exactly as a petrol car would. Outdoors only, and away from open windows.',
          ar: 'لا تستخدمه أبدا في جراج مغلق أو بدروم أو أي مكان مغلق. المحرك يعمل وينتج عوادم تماما مثل سيارة بنزين. في الهواء الطلق فقط وبعيدا عن النوافذ المفتوحة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'ac-connector',
        label: 'Auto unlock slow charging gun',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Releases the AC charging cable automatically once charging is complete, so you can simply pull it out when you return.',
          ar: 'يحرر كابل الشحن المتردد تلقائيا بعد اكتمال الشحن حتى تسحبه ببساطة عند عودتك.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'preconditioning',
        label: 'Manual battery preheating',
        section: 'CHARGING MANAGEMENT',
        description: {
          en: 'Brings the battery to its ideal temperature before charging, so it accepts power at the fastest rate it safely can. Start it around twenty minutes before you reach a fast charger.',
          ar: 'يجهز البطارية لدرجة حرارتها المثالية قبل الشحن حتى تستقبل الطاقة بأسرع معدل آمن. شغله قبل الوصول لشاحن سريع بنحو عشرين دقيقة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'energy-mode',
        label: 'Energy mode',
        section: 'ENERGY MODE',
        description: {
          en: 'Where you tell the car how to balance battery and petrol. Forced EV mode keeps the range extender off and drives on the battery alone.',
          ar: 'هنا تخبر السيارة كيف توازن بين البطارية والبنزين. وضع Forced EV يبقي محرك المدى الممتد متوقفا ويقود على البطارية وحدها.',
        },
        egyptTip: {
          en: 'Home charging is not an option for many owners in Egypt. The V27 never has to be plugged in, and Fuel priority is the everyday mode for that case: the generator keeps the battery in a working band so the motors always have power to draw on.',
          ar: 'الشحن المنزلي غير متاح لكثير من الملاك في مصر. V27 لا تحتاج للتوصيل إطلاقا، وأولوية الوقود هي الوضع اليومي في هذه الحالة: يبقي المولد البطارية في نطاق تشغيلي حتى تجد المواتير طاقة دائما.',
        },
        status: EGYPT,
        control: choice(['Hybrid', 'Fuel priority', 'Electric priority', 'Forced EV mode'], 0),
      },
      {
        id: 'force-range-extender',
        label: 'Force Range Extender',
        section: 'ENERGY MODE',
        description: {
          en: 'A toggle that layers on top of the mode you chose: the generator works harder to build charge instead of merely holding it steady. Listed in the Egypt guide but not in the owner’s manual.',
          ar: 'مفتاح يعمل فوق الوضع الذي اخترته: يعمل المولد بجهد أكبر لبناء شحن بدل الحفاظ عليه فقط. موجود في دليل مصر وغير مذكور في دليل المالك.',
        },
        egyptTip: {
          en: 'Switch it on during a motorway run to build charge, then let that charge carry you through stop-and-go traffic, where electric drive is at its most efficient and the engine at its least.',
          ar: 'شغله في رحلة على الطريق السريع لبناء شحن، ثم دع هذا الشحن يحملك في زحام المدينة، حيث تكون القيادة الكهربائية في أعلى كفاءتها والمحرك في أقلها.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'external-power',
        label: 'External Power Supply Limit',
        section: 'DISCHARGING',
        description: {
          en: 'With the external power cable plugged in the V27 supplies 220V AC, enough to run lights, a fridge, tools or a coffee machine. This sets how far the battery is allowed to drain before the car cuts the supply.',
          ar: 'بتوصيل كابل الطاقة الخارجية تعطي V27 تيارا مترددا 220 فولت يكفي لتشغيل إضاءة أو ثلاجة أو عدد أو ماكينة قهوة. هذا الإعداد يحدد إلى أي مدى يسمح بتفريغ البطارية قبل أن تقطع السيارة التغذية.',
        },
        status: EGYPT,
        control: choice(['20%', '30%', '50%'], 1),
      },
      {
        id: 'fuel-power',
        label: 'Fuel-Based Power Supply',
        section: 'DISCHARGING',
        description: {
          en: 'When the battery reaches that limit the range extender starts and keeps generating, so the power supply continues from petrol.',
          ar: 'عند وصول البطارية لذلك الحد يعمل محرك المدى الممتد ويستمر في التوليد فتستمر التغذية من البنزين.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'wireless',
        label: 'Wireless Charging',
        section: 'DISCHARGING',
        description: {
          en: 'Enables the phone charging pad in the console. Place the phone on the pad to start charging.',
          ar: 'يفعل قاعدة شحن الهاتف في الكونسول. ضع الهاتف على القاعدة ليبدأ الشحن.',
        },
        egyptTip: {
          en: 'Wireless charging generates heat, and a phone left on the pad in a hot cabin can overheat and stop charging or throttle itself. On long summer drives a cable is often the better choice.',
          ar: 'الشحن اللاسلكي يولد حرارة، والهاتف المتروك على القاعدة في كابينة ساخنة قد ترتفع حرارته فيتوقف عن الشحن أو يخفض أداءه. في رحلات الصيف الطويلة يكون الكابل خيارا أفضل غالبا.',
        },
        status: EGYPT,
        control: toggle(true),
      },
    ],
  },
  {
    id: 'voice',
    icon: 'mic',
    index: 6,
    name: { en: 'Voice setting', ar: 'إعدادات الصوت' },
    subtitle: {
      en: 'The voice assistant, woken by its wake word while the screen is on',
      ar: 'المساعد الصوتي الذي يستيقظ بكلمة التنبيه أثناء تشغيل الشاشة',
    },
    controls: [
      {
        id: 'conversation',
        label: 'Continuous conversation duration',
        description: {
          en: 'How long the assistant keeps listening after it answers, so you can give a follow-up command without repeating the wake word. OFF means every command needs the wake word first.',
          ar: 'المدة التي يظل فيها المساعد مستمعا بعد الرد، حتى تعطي أمرا إضافيا دون تكرار كلمة التنبيه. الإيقاف يعني أن كل أمر يحتاج كلمة التنبيه أولا.',
        },
        status: EGYPT,
        control: choice(['OFF', '10s', '15s', '20s'], 1),
      },
      {
        id: 'source-localization',
        label: 'Sound source localization',
        description: {
          en: 'Which seat the microphones listen to. Driver’s seat means only the driver can issue commands, worth setting if passengers or children keep waking the assistant by accident. Auto works out who spoke and responds to them.',
          ar: 'المقعد الذي تستمع إليه الميكروفونات. خيار مقعد السائق يعني أن السائق وحده يصدر الأوامر، وهو مفيد إذا كان الركاب أو الأطفال يوقظون المساعد بالخطأ. والوضع التلقائي يحدد من تكلم ويرد عليه.',
        },
        status: EGYPT,
        control: choice(['OFF', "Driver's seat", 'Auto'], 2),
      },
      {
        id: 'voice-assistant',
        label: 'Voice assistant',
        description: {
          en: 'Turns the assistant on or off entirely. It can control navigation, media, Bluetooth calls, the A/C, windows, seats, volume and system settings.',
          ar: 'يشغل المساعد أو يوقفه تماما. يمكنه التحكم في الملاحة، الوسائط، مكالمات البلوتوث، التكييف، النوافذ، المقاعد، مستوى الصوت، وإعدادات النظام.',
        },
        status: EGYPT,
        control: toggle(true),
      },
    ],
  },
  {
    id: 'display',
    icon: 'display',
    index: 7,
    name: { en: 'Display', ar: 'الشاشة' },
    subtitle: {
      en: 'Theme, screen saver, brightness, units, time, language and screen cleaning',
      ar: 'الثيم، شاشة التوقف، الإضاءة، الوحدات، الوقت، اللغة، وتنظيف الشاشة',
    },
    controls: [
      {
        id: 'theme',
        label: 'Theme',
        description: {
          en: 'Light or dark interface. Auto switches with the time of day. Try it: this simulator follows the setting.',
          ar: 'واجهة فاتحة أو داكنة. الوضع Auto يبدل حسب وقت اليوم. جربه: هذا المحاكي يتبع الإعداد.',
        },
        status: EXPORT,
        control: choice(['Light mode', 'Dark mode', 'Auto'], 0),
      },
      {
        id: 'screensaver',
        label: 'Screen saver display',
        description: {
          en: 'What the screen shows while it is idle. Black screen display switches the picture off completely.',
          ar: 'ما تعرضه الشاشة أثناء الخمول. خيار Black screen display يطفئ الصورة تماما.',
        },
        status: EXPORT,
        control: choice(['Hand clock', 'Digital clock', 'Black screen display'], 1),
      },
      {
        id: 'brightness',
        label: 'Central control',
        description: {
          en: 'Slide the bar to set the centre screen brightness.',
          ar: 'اسحب الشريط لضبط إضاءة الشاشة المركزية.',
        },
        status: EXPORT,
        control: slider(80, 10, 100, 5, '%'),
      },
      {
        id: 'auto-brightness',
        label: 'Auto screen brightness',
        description: {
          en: 'Lets the light sensor dim the screen at night and brighten it in sunshine.',
          ar: 'يترك حساس الضوء يخفض إضاءة الشاشة ليلا ويرفعها في الشمس.',
        },
        egyptTip: {
          en: 'Leave it on. Midday sun on the screen is the main reason owners complain it is hard to read.',
          ar: 'اتركه مفعلا. شمس الظهيرة على الشاشة هي السبب الرئيسي لشكوى الملاك من صعوبة القراءة.',
        },
        status: EXPORT,
        control: toggle(true),
      },
      {
        id: 'range-unit',
        label: 'Range display',
        description: {
          en: 'Show the remaining battery as a distance or as a percentage.',
          ar: 'عرض البطارية المتبقية كمسافة أو كنسبة مئوية.',
        },
        status: EXPORT,
        control: choice(['Kilometre', 'Percentage'], 1),
      },
      {
        id: 'time-display',
        label: 'Time display',
        description: {
          en: 'Clock format on the screen and instrument cluster.',
          ar: 'صيغة الساعة على الشاشة ولوحة العدادات.',
        },
        status: EGYPT,
        control: choice(['12-hour time', '24-hour time'], 1),
      },
      {
        id: 'language-settings',
        label: 'Language settings',
        description: {
          en: 'The interface language for the whole system. A full Arabic interface is available on Egypt cars.',
          ar: 'لغة الواجهة للنظام كله. تتوفر واجهة عربية كاملة في سيارات مصر.',
        },
        status: EGYPT,
        control: choice(['English', 'العربية'], 0),
      },
      {
        id: 'timezone',
        label: 'Time zone settings',
        description: {
          en: 'Set the time zone manually. Should read (UTC+3:00) Cairo in Egypt.',
          ar: 'اضبط المنطقة الزمنية يدويا. يجب أن تكون (UTC+3:00) القاهرة في مصر.',
        },
        egyptTip: {
          en: 'Egypt moves its clocks for daylight saving in spring and autumn, so if the time drifts by an hour, check this page before assuming a fault.',
          ar: 'مصر تغير التوقيت في الربيع والخريف، فإذا اختلف الوقت بساعة راجع هذه الصفحة قبل افتراض وجود عطل.',
        },
        status: EGYPT,
        control: choice(['(UTC+3:00) Cairo', '(UTC+2:00)', '(UTC+4:00)'], 0),
      },
      {
        id: 'screen-cleaning',
        label: 'Screen cleaning',
        description: {
          en: 'Enters screen cleaning mode, which ignores touches so you can wipe the screen without pressing things by accident.',
          ar: 'يدخل وضع تنظيف الشاشة الذي يتجاهل اللمس حتى تمسح الشاشة دون الضغط على شيء بالخطأ.',
        },
        warning: {
          en: 'Use a soft microfibre cloth, dry or very slightly damp. Never use glass cleaner or anything with alcohol in it, which strips the screen’s anti-glare coating.',
          ar: 'استخدم قطعة ميكروفايبر ناعمة جافة أو مبللة قليلا جدا. لا تستخدم أبدا منظف زجاج أو أي مادة بها كحول لأنها تزيل طبقة مقاومة الانعكاس.',
        },
        status: EGYPT,
        control: action('Screen cleaning'),
      },
    ],
  },
  {
    id: 'sound',
    icon: 'volume',
    index: 8,
    name: { en: 'Sound', ar: 'الصوتيات' },
    subtitle: {
      en: 'Sound mode, sound stage, the individual volume levels, and the car’s own alert sounds',
      ar: 'وضع الصوت، المسرح الصوتي، مستويات الصوت المنفصلة، وأصوات تنبيهات السيارة',
    },
    controls: [
      {
        id: 'sound-mode',
        label: 'Sound mode',
        description: {
          en: 'Where the audio is aimed. Private mode keeps it to the driver so others in the car are less disturbed, Share driver mode favours the driver’s seat while still reaching the others, and Sharing mode fills the car evenly.',
          ar: 'وجهة الصوت. الوضع الخاص يقصره على السائق حتى لا ينزعج باقي الركاب، ووضع المشاركة مع السائق يركز على مقعده مع وصول الصوت للآخرين، ووضع المشاركة يوزعه على السيارة بالتساوي.',
        },
        status: EGYPT,
        control: choice(['Private mode', 'Share driver mode', 'Sharing mode'], 2),
      },
      {
        id: 'sound-effects',
        label: 'Sound effect',
        description: {
          en: 'Preset audio characters. Standard is neutral; Concert hall adds reverberation; Subwoofer emphasises bass.',
          ar: 'أنماط صوتية جاهزة. القياسي محايد، وقاعة الحفلات تضيف صدى، والسب ووفر يبرز الصوت المنخفض.',
        },
        status: EGYPT,
        control: choice(['Standard', 'Surround', 'Concert hall', 'Subwoofer'], 0),
      },
      {
        id: 'sound-field',
        label: 'Sound field',
        section: 'SOUND STAGE',
        description: {
          en: 'Where the focal point of the audio sits in the cabin. Smart adaptation moves it to where people are sitting.',
          ar: 'مكان نقطة تركيز الصوت داخل الكابينة. الخيار Smart adaptation ينقلها إلى أماكن جلوس الركاب.',
        },
        status: EGYPT,
        control: choice(['Whole vehicle', "Driver's seat", 'Front', 'Rear', 'Custom', 'Smart adaptation'], 0),
      },
      {
        id: 'equalizer',
        label: 'Equalizer',
        section: 'SOUND STAGE',
        description: {
          en: 'Sound effect presets. Professional tuning opens bars for setting each frequency band, treble included, yourself.',
          ar: 'أنماط صوت جاهزة. الخيار Professional tuning يفتح أشرطة لضبط كل نطاق ترددي بنفسك بما فيه الحاد.',
        },
        status: EGYPT,
        control: choice(['Standard', 'Vocal', 'Pop', 'Rock', 'Electronic', 'Basic tuning', 'Professional tuning'], 0),
      },
      {
        id: 'vol-media',
        label: 'Media',
        section: 'VOLUME',
        description: {
          en: 'Music, radio and video volume.',
          ar: 'مستوى صوت الموسيقى والراديو والفيديو.',
        },
        status: EGYPT,
        control: slider(14, 0, 39),
      },
      {
        id: 'vol-nav',
        label: 'Navigation',
        section: 'VOLUME',
        description: {
          en: 'Turn-by-turn prompts. Setting them a little above your music means you hear the instruction without reaching for the volume every time.',
          ar: 'تعليمات الملاحة. ضبطها أعلى قليلا من الموسيقى يجعلك تسمع التعليمات دون تغيير مستوى الصوت في كل مرة.',
        },
        status: EGYPT,
        control: slider(18, 0, 39),
      },
      {
        id: 'vol-voice',
        label: 'Voice',
        section: 'VOLUME',
        description: {
          en: 'The voice assistant’s replies.',
          ar: 'ردود المساعد الصوتي.',
        },
        status: EGYPT,
        control: slider(16, 0, 39),
      },
      {
        id: 'vol-call',
        label: 'Call',
        section: 'VOLUME',
        description: {
          en: 'Phone call volume over Bluetooth.',
          ar: 'مستوى صوت المكالمات عبر البلوتوث.',
        },
        status: EGYPT,
        control: slider(20, 0, 39),
      },
      {
        id: 'vol-dashboard',
        label: 'Dashboard alert tone',
        section: 'VOLUME',
        description: {
          en: 'The chimes and warnings from the instrument cluster.',
          ar: 'نغمات وتحذيرات لوحة العدادات.',
        },
        status: EGYPT,
        control: slider(20, 0, 39),
      },
      {
        id: 'call-notice',
        label: 'Incoming call ringtone',
        description: {
          en: 'How the car announces a call. Voice guidance reads out who is calling, which keeps your eyes on the road.',
          ar: 'كيف تعلن السيارة عن مكالمة واردة. الإعلان الصوتي ينطق اسم المتصل فتبقى عيناك على الطريق.',
        },
        status: EGYPT,
        control: choice(['Close', 'Voice guidance', 'Phone ringtone'], 1),
      },
      {
        id: 'pedestrian',
        label: 'Low-speed pedestrian reminder',
        description: {
          en: 'Electric cars are nearly silent at low speed, so the V27 plays a sound through an external speaker to warn pedestrians it is moving. This chooses which sound. It cannot be switched off, and it should not be.',
          ar: 'السيارات الكهربائية شبه صامتة عند السرعات المنخفضة، لذلك تشغل V27 صوتا عبر سماعة خارجية لتنبيه المشاة أنها تتحرك. هنا تختار الصوت. لا يمكن إيقافه ولا ينبغي ذلك.',
        },
        status: EGYPT,
        control: choice(['Starry sky', 'Wind chant', 'Engine'], 0),
      },
      {
        id: 'touch-sound',
        label: 'Touchscreen sound effects',
        section: 'SMART SOUND EFFECT',
        description: {
          en: 'The click you hear when tapping the screen.',
          ar: 'صوت النقر الذي تسمعه عند لمس الشاشة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'tone',
        label: 'Notification tone',
        section: 'SMART SOUND EFFECT',
        description: {
          en: 'The chime for system messages and alerts.',
          ar: 'نغمة رسائل النظام والتنبيهات.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'speed-volume',
        label: 'Speed-dependent volume compensation',
        section: 'SMART SOUND EFFECT',
        description: {
          en: 'Raises the volume gradually as you go faster to compensate for road and wind noise, and lowers it again as you slow down.',
          ar: 'يرفع مستوى الصوت تدريجيا مع زيادة السرعة لتعويض ضجيج الطريق والهواء، ويخفضه عند الإبطاء.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'door-volume',
        label: 'Door open volume reduction',
        section: 'SMART SOUND EFFECT',
        description: {
          en: 'Drops the volume automatically when a door is opened, so you do not blast the street or the person you have stopped to greet.',
          ar: 'يخفض مستوى الصوت تلقائيا عند فتح أي باب، حتى لا تزعج الشارع أو الشخص الذي توقفت لتحيته.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'rear-belt',
        label: 'Rear seatbelt alert',
        section: 'SMART SOUND EFFECT',
        description: {
          en: 'Chimes when a rear passenger is not buckled up.',
          ar: 'ينبه عندما لا يربط أحد ركاب الخلف حزام الأمان.',
        },
        egyptTip: {
          en: 'Keep it on, especially with children in the back.',
          ar: 'اتركه مفعلا، خاصة مع وجود أطفال في الخلف.',
        },
        status: EXPORT,
        control: toggle(true),
      },
    ],
  },
  {
    id: 'connections',
    icon: 'wifi',
    index: 9,
    name: { en: 'Connections', ar: 'الاتصالات' },
    subtitle: {
      en: 'Wi-Fi, Bluetooth, the car hotspot, CarPlay and Android Auto',
      ar: 'واي فاي، بلوتوث، نقطة اتصال السيارة، كاربلاي، وأندرويد أوتو',
    },
    controls: [
      {
        id: 'wifi',
        label: 'Wi-Fi',
        section: 'BASIC CONNECTION',
        description: {
          en: 'Connects the car to a wireless network, a home network or your phone’s hotspot, for online services and software updates.',
          ar: 'يوصل السيارة بشبكة لاسلكية، سواء شبكة المنزل أو نقطة اتصال هاتفك، للخدمات الإلكترونية وتحديثات السوفتوير.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'bluetooth',
        label: 'Bluetooth',
        section: 'BASIC CONNECTION',
        description: {
          en: 'Pairs phones for calls and audio. The name shown beneath it is what your phone will see when searching for the car.',
          ar: 'يقرن الهواتف للمكالمات والصوت. الاسم الظاهر أسفله هو ما سيراه هاتفك عند البحث عن السيارة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'hotspot',
        label: 'Car Hotspot',
        section: 'BASIC CONNECTION',
        description: {
          en: 'Shares the car’s own mobile data with passengers’ phones and tablets.',
          ar: 'يشارك بيانات الموبايل الخاصة بالسيارة مع هواتف وتابلت الركاب.',
        },
        status: EXPORT,
        control: toggle(false),
      },
      {
        id: 'carplay-aa',
        label: 'Apple CarPlay / Android Auto',
        section: 'PHONE INTERCONNECTION',
        description: {
          en: 'Mirrors your phone’s maps, music and messages onto the car’s screen. Each entry shows Connected or Not connected. Wired: use the phone’s original cable in the USB port. Wireless: pair over Bluetooth first, then confirm CarPlay when the screen asks.',
          ar: 'ينقل خرائط هاتفك وموسيقاه ورسائله إلى شاشة السيارة. يعرض كل سطر متصل أو غير متصل. سلكي: استخدم كابل الهاتف الأصلي في منفذ USB. لاسلكي: اقرن بالبلوتوث أولا ثم أكد استخدام كاربلاي عندما تسألك الشاشة.',
        },
        egyptTip: {
          en: 'If CarPlay drops out repeatedly, try a different cable before anything else. After a wireless CarPlay connection the Bluetooth icon turns grey; that is normal.',
          ar: 'إذا انقطع كاربلاي بشكل متكرر، جرب كابلا آخر قبل أي شيء. بعد اتصال كاربلاي اللاسلكي تصبح أيقونة البلوتوث رمادية، وهذا طبيعي.',
        },
        status: EGYPT,
        control: action('Connect Apple CarPlay', 'Connect Android Auto'),
      },
    ],
  },
  {
    id: 'safety-service',
    icon: 'service',
    index: 10,
    name: { en: 'Safety & services', ar: 'السلامة والخدمات' },
    subtitle: {
      en: 'Cabin protection, the passenger airbag, units, and workshop functions',
      ar: 'حماية الكابينة، وسادة الراكب الهوائية، الوحدات، ووظائف الورشة',
    },
    controls: [
      {
        id: 'cabin-overheat',
        label: 'Cabin overheat protection',
        description: {
          en: 'Stops a parked car turning into an oven. Ventilation runs the fans to move hot air out; Cooling runs the air conditioning.',
          ar: 'يمنع السيارة المركونة من التحول إلى فرن. Ventilation يشغل المراوح لطرد الهواء الساخن، و Cooling يشغل التكييف.',
        },
        egyptTip: {
          en: 'Ventilation is a sensible summer default. Cooling uses battery, so keep an eye on the charge if the car is parked for days.',
          ar: 'Ventilation اختيار منطقي في الصيف. Cooling يستهلك البطارية، فراقب الشحن إذا كانت السيارة مركونة لأيام.',
        },
        status: EXPORT,
        control: choice(['Close', 'Ventilation', 'Cooling'], 0),
      },
      {
        id: 'passenger-airbag',
        label: 'Passenger seat airbag',
        description: {
          en: 'Switches the front passenger airbag on or off. The status bar always shows its state.',
          ar: 'يشغل وسادة الراكب الأمامي الهوائية أو يوقفها. شريط الحالة يعرض حالتها دائما.',
        },
        warning: {
          en: 'Turn it off only when a rear-facing child seat is fitted in the front seat, and turn it back on as soon as the child seat is removed. Children are always safest in the back.',
          ar: 'أوقفها فقط عند تركيب كرسي أطفال مواجه للخلف في المقعد الأمامي، وأعد تشغيلها فور إزالته. الأطفال دائما أكثر أمانا في الخلف.',
        },
        status: EXPORT,
        control: toggle(true),
      },
      {
        id: 'tpms-unit',
        label: 'Tire pressure unit',
        description: {
          en: 'The unit tyre pressures are shown in. Egyptian tyre shops usually talk in psi ("pounds").',
          ar: 'الوحدة التي تعرض بها ضغوط الإطارات. محلات الكاوتش في مصر تتكلم غالبا بالـ psi ("الباوند").',
        },
        status: EXPORT,
        control: choice(['bar', 'kPa', 'psi'], 2),
      },
      {
        id: 'trailer-mode',
        label: 'Trailer mode',
        section: 'VEHICLE SERVICES',
        description: {
          en: 'Tells the car it is pulling a trailer, so the parking sensors and assistance systems account for the extra length behind you. Switch it off again once the trailer is unhitched.',
          ar: 'يخبر السيارة أنها تسحب مقطورة، فتحسب حساسات الركن وأنظمة المساعدة الطول الإضافي خلفك. أوقفه بعد فك المقطورة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'towing',
        label: 'Towing Mode',
        section: 'VEHICLE SERVICES',
        description: {
          en: 'Prepares the vehicle to be moved by a recovery truck without the car’s own systems resisting or the alarm sounding. Listed in the Egypt guide but not on this page of the owner’s manual.',
          ar: 'يجهز السيارة لنقلها بونش دون أن تقاوم أنظمتها أو ينطلق جرس الإنذار. موجود في دليل مصر وغير مذكور في هذه الصفحة من دليل المالك.',
        },
        warning: {
          en: 'Check the towing procedure in your owner’s manual before the car is loaded, as the requirements differ depending on whether it is towed or carried on a flatbed.',
          ar: 'راجع إجراء السحب في دليل المالك قبل تحميل السيارة، فالمتطلبات تختلف بين السحب والنقل على سطح مستو.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'exhaust',
        label: 'Exhaust gas detection',
        section: 'VEHICLE SERVICES',
        description: {
          en: 'Puts the vehicle into the state required for the annual emissions test, so the range extender runs as the inspection equipment expects. Turn it on at the testing centre and off again afterwards.',
          ar: 'يضع السيارة في الحالة المطلوبة لاختبار العوادم السنوي حتى يعمل محرك المدى الممتد كما تتوقع أجهزة الفحص. شغله في مركز الفحص وأوقفه بعده.',
        },
        egyptTip: {
          en: 'This is the setting to remember at your annual licence renewal inspection. Because the petrol engine in an EREV does not run continuously, testing centres can struggle to get a reading without it.',
          ar: 'هذا هو الإعداد الذي يجب تذكره عند فحص تجديد الرخصة السنوي. لأن محرك البنزين في سيارة المدى الممتد لا يعمل باستمرار، قد يصعب على مراكز الفحص أخذ قراءة بدونه.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'wiper-maintenance',
        label: 'Front wiper maintenance',
        section: 'VEHICLE SERVICES',
        description: {
          en: 'Moves the wiper arms into the service position so you can lift them off the glass to change blades or clear them. Only works with the car in P or N and the wipers and washer switched off.',
          ar: 'ينقل أذرع المساحات إلى وضع الخدمة حتى ترفعها عن الزجاج لتغيير الريش أو تنظيفها. يعمل فقط والسيارة في P أو N والمساحات والرشاش متوقفة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'power-off',
        label: 'Power supply',
        section: 'VEHICLE SERVICES',
        description: {
          en: 'Shuts the vehicle down completely. The car must be stationary and in P. Use it when you want everything genuinely off rather than in standby.',
          ar: 'يطفئ السيارة تماما. يجب أن تكون السيارة متوقفة وفي وضع P. استخدمه عندما تريد إطفاء كل شيء فعليا بدل وضع الاستعداد.',
        },
        status: EGYPT,
        control: action('Power off'),
      },
    ],
  },
  {
    id: 'general',
    icon: 'info',
    index: 11,
    name: { en: 'General', ar: 'عام' },
    subtitle: {
      en: 'Vehicle information, storage, resets, and app permissions',
      ar: 'معلومات السيارة، التخزين، إعادة الضبط، وأذونات التطبيقات',
    },
    controls: [
      {
        id: 'version',
        label: 'The current version used',
        section: 'VEHICLE INFORMATION',
        description: {
          en: 'The software version installed. Quote it when you report a problem to the dealer or check whether an update has arrived.',
          ar: 'إصدار السوفتوير المثبت. اذكره عند الإبلاغ عن مشكلة للوكيل أو للتأكد من وصول تحديث.',
        },
        status: EXPORT,
        control: action('View version'),
      },
      {
        id: 'storage',
        label: 'Storage space',
        section: 'VEHICLE INFORMATION',
        description: {
          en: 'How much of the system memory is used. Clearing the cache frees space without deleting your settings.',
          ar: 'كم من ذاكرة النظام مستخدم. مسح الكاش يحرر مساحة دون حذف إعداداتك.',
        },
        status: EXPORT,
        control: action('Clear cache'),
      },
      {
        id: 'my-vehicle',
        label: 'My vehicle',
        section: 'VEHICLE INFORMATION',
        description: {
          en: 'Vehicle name, model and VIN. The VIN here is handy when booking a service or ordering parts.',
          ar: 'اسم السيارة والموديل ورقم الشاسيه. رقم الشاسيه هنا مفيد عند حجز صيانة أو طلب قطع غيار.',
        },
        status: EXPORT,
        control: action('Show name, model and VIN'),
      },
      {
        id: 'restore-vehicle',
        label: 'Restore Vehicle Settings',
        section: 'VEHICLE INFORMATION',
        description: {
          en: 'Puts the car-control settings back to their defaults, leaving your apps and accounts alone.',
          ar: 'يعيد إعدادات التحكم في السيارة إلى الوضع الافتراضي دون المساس بتطبيقاتك وحساباتك.',
        },
        status: EXPORT,
        control: action('Restore'),
      },
      {
        id: 'restore-factory',
        label: 'Restore Factory Settings',
        section: 'VEHICLE INFORMATION',
        description: {
          en: 'Wipes the head unit back to how it left the factory: paired phones, profiles, accounts and settings are all removed.',
          ar: 'يمسح الشاشة ويعيدها كما خرجت من المصنع: الهواتف المقترنة، الملفات، الحسابات، والإعدادات كلها تحذف.',
        },
        warning: {
          en: 'Do this before you sell the car, so the next owner does not inherit your phone pairings, addresses and accounts.',
          ar: 'افعل ذلك قبل بيع السيارة حتى لا يرث المالك التالي هواتفك المقترنة وعناوينك وحساباتك.',
        },
        status: EXPORT,
        control: action('Restore'),
      },
      {
        id: 'ux-program',
        label: 'Users experience analysis & improvement program',
        section: 'VEHICLE INFORMATION',
        description: {
          en: 'Shares anonymous usage data with the manufacturer to improve the software. Optional.',
          ar: 'يشارك بيانات استخدام مجهولة مع الشركة المصنعة لتحسين السوفتوير. اختياري.',
        },
        status: EXPORT,
        control: toggle(false),
      },
      {
        id: 'perm-position',
        label: 'Position',
        section: 'APPS & PERMISSIONS',
        description: {
          en: 'Whether apps may use the car’s location. Navigation needs it.',
          ar: 'هل يسمح للتطبيقات باستخدام موقع السيارة. الملاحة تحتاجه.',
        },
        status: EXPORT,
        control: toggle(true),
      },
      {
        id: 'perm-camera',
        label: 'Camera',
        section: 'APPS & PERMISSIONS',
        description: {
          en: 'Whether apps may use the car’s cameras.',
          ar: 'هل يسمح للتطبيقات باستخدام كاميرات السيارة.',
        },
        status: EXPORT,
        control: toggle(true),
      },
      {
        id: 'perm-microphone',
        label: 'Microphone',
        section: 'APPS & PERMISSIONS',
        description: {
          en: 'Whether apps may use the cabin microphones. The voice assistant and calls need it.',
          ar: 'هل يسمح للتطبيقات باستخدام ميكروفونات الكابينة. المساعد الصوتي والمكالمات تحتاجه.',
        },
        status: EXPORT,
        control: toggle(true),
      },
      {
        id: 'perm-reminder',
        label: 'Sensitive permission usage reminder',
        section: 'APPS & PERMISSIONS',
        description: {
          en: 'Shows a notice whenever an app is using location, a camera or the microphone.',
          ar: 'يعرض تنبيها كلما استخدم تطبيق الموقع أو الكاميرا أو الميكروفون.',
        },
        status: EXPORT,
        control: toggle(true),
      },
      {
        id: 'app-management',
        label: 'Application management',
        section: 'APPS & PERMISSIONS',
        description: {
          en: 'Manage the permissions of each installed application.',
          ar: 'إدارة أذونات كل تطبيق مثبت.',
        },
        status: EXPORT,
        control: action('Manage'),
      },
    ],
  },
]

/**
 * The guide's recommended starting setup for a newly delivered car in Egypt.
 * Each entry points at a control above.
 */
export const recommendedSetup: {
  menuId: string
  controlId: string
  setTo: string
  why: Localized
}[] = [
  {
    menuId: 'body-control',
    controlId: 'wiper-sensitivity',
    setTo: 'Low',
    why: {
      en: 'Dust triggers sensitive rain sensors; dry wiping scratches glass.',
      ar: 'الأتربة تشغل حساس المطر الحساس، والمسح الجاف يخدش الزجاج.',
    },
  },
  {
    menuId: 'body-control',
    controlId: 'key-fob-custom',
    setTo: 'A/C On',
    why: { en: 'Cool the cabin before you get in.', ar: 'تبريد الكابينة قبل أن تركب.' },
  },
  {
    menuId: 'body-control',
    controlId: 'lock-driving',
    setTo: 'On',
    why: { en: 'Doors secured in city traffic.', ar: 'تأمين الأبواب في زحام المدينة.' },
  },
  {
    menuId: 'body-control',
    controlId: 'reverse-tilt',
    setTo: 'On',
    why: { en: 'Protects wheels against high kerbs.', ar: 'يحمي الجنوط من الأرصفة المرتفعة.' },
  },
  {
    menuId: 'driving-setting',
    controlId: 'autohold',
    setTo: 'On',
    why: {
      en: 'Removes the strain of stop-and-go traffic.',
      ar: 'يخفف إرهاق القيادة في الزحام المتقطع.',
    },
  },
  {
    menuId: 'driving-setting',
    controlId: 'esc',
    setTo: 'On',
    why: {
      en: 'Leave on unless freeing the car from sand.',
      ar: 'اتركه مفعلا إلا عند تحرير السيارة من الرمال.',
    },
  },
  {
    menuId: 'driving-setting',
    controlId: 'speed-warning',
    setTo: 'On, 120 km/h',
    why: {
      en: 'Matches the motorway limit and the radar cameras.',
      ar: 'يطابق حد الطرق السريعة وكاميرات الرادار.',
    },
  },
  {
    menuId: 'adas',
    controlId: 'fcw-sensitivity',
    setTo: 'Late',
    why: {
      en: 'Stays useful instead of crying wolf in close traffic.',
      ar: 'يظل مفيدا بدل التنبيه المستمر في الزحام القريب.',
    },
  },
  {
    menuId: 'adas',
    controlId: 'ldw',
    setTo: 'Close',
    why: {
      en: 'Lane markings here are too inconsistent for it to be useful.',
      ar: 'علامات الحارات هنا غير منتظمة بدرجة تجعله غير مفيد.',
    },
  },
  {
    menuId: 'energy',
    controlId: 'range-display',
    setTo: 'WLTC',
    why: {
      en: 'A realistic range figure you can plan around.',
      ar: 'رقم مدى واقعي يمكنك التخطيط على أساسه.',
    },
  },
]

/* ------------------------------------------------------------------------ */
/* Home screen (manual figure "Head Unit Display View")                      */
/* ------------------------------------------------------------------------ */

export type HotspotId = 'lock' | 'headlight' | 'tpms' | 'window' | 'fuel' | 'mirror'

/** Buttons drawn on the car picture. Positions are percentages of the home stage. */
export type HomeHotspot = {
  id: HotspotId
  label: Localized
  /** Horizontal position, % from the left of the screen. */
  x: number
  /** Vertical position, % from the top of the screen. */
  y: number
}

export const homeHotspots: HomeHotspot[] = [
  { id: 'lock', label: { en: 'Central lock', ar: 'القفل المركزي' }, x: 52, y: 15 },
  { id: 'window', label: { en: 'Window control', ar: 'التحكم في النوافذ' }, x: 37, y: 25 },
  { id: 'mirror', label: { en: 'Outside rear view mirror folding', ar: 'طي المرايات الخارجية' }, x: 42, y: 34 },
  { id: 'headlight', label: { en: 'Headlight leveling adjusting', ar: 'ضبط ارتفاع المصابيح' }, x: 56, y: 40 },
  { id: 'fuel', label: { en: 'Fuel filler', ar: 'غطاء الوقود' }, x: 30, y: 41 },
  { id: 'tpms', label: { en: 'Tire pressure monitoring', ar: 'مراقبة ضغط الإطارات' }, x: 62, y: 58 },
]

export type AppId =
  | 'settings'
  | 'navigation'
  | 'camera'
  | 'recorder'
  | 'scenes'
  | 'media'
  | 'windows'
  | 'tpms'
  | 'energy'
  | 'phone'

/** Every app the App center lists. The first four start out as the dock shortcuts. */
export const apps: { id: AppId; label: string; ar: string }[] = [
  { id: 'settings', label: 'Settings', ar: 'الإعدادات' },
  { id: 'navigation', label: 'Navigation', ar: 'الملاحة' },
  { id: 'camera', label: '360 Camera', ar: 'كاميرا 360' },
  { id: 'recorder', label: 'Driving recorder', ar: 'مسجل القيادة' },
  { id: 'scenes', label: 'Scene mode', ar: 'أوضاع المشاهد' },
  { id: 'media', label: 'Music', ar: 'الموسيقى' },
  { id: 'phone', label: 'Phone', ar: 'الهاتف' },
  { id: 'windows', label: 'Window control', ar: 'النوافذ' },
  { id: 'tpms', label: 'Tire pressure', ar: 'ضغط الإطارات' },
  { id: 'energy', label: 'Energy flow', ar: 'تدفق الطاقة' },
]

export const DEFAULT_DOCK_APPS: AppId[] = ['settings', 'navigation', 'camera', 'recorder']

/* ------------------------------------------------------------------------ */
/* Control center (swipe down from the top of the screen)                    */
/* ------------------------------------------------------------------------ */

export type QuickEffect = 'screensaver' | 'screen-cleaning' | 'car-wash' | 'power-off' | 'mirror-fold' | 'recording'

export type QuickToggle = {
  id: string
  label: string
  /** A settings value this tile mirrors, so both places stay in sync. */
  setting?: { menuId: string; controlId: string; on?: string; off?: string }
  /** Something the tile does to the screen itself instead of a stored value. */
  effect?: QuickEffect
}

export const controlCenterToggles: QuickToggle[] = [
  { id: 'fog', label: 'Fog lights' },
  { id: 'wireless', label: 'Wireless charging', setting: { menuId: 'energy', controlId: 'wireless' } },
  { id: 'mirror-fold', label: 'Rearview mirror fold', effect: 'mirror-fold' },
  { id: 'screensaver', label: 'Screensaver display', effect: 'screensaver' },
  { id: 'stability', label: 'Body stability', setting: { menuId: 'driving-setting', controlId: 'esc' } },
  { id: 'screen-cleaning', label: 'Screen cleaning', effect: 'screen-cleaning' },
  {
    id: 'light-mode',
    label: 'Light mode',
    setting: { menuId: 'display', controlId: 'theme', on: 'Light mode', off: 'Dark mode' },
  },
  {
    id: 'passenger-lock',
    label: 'Passenger window lock',
    setting: { menuId: 'body-control', controlId: 'passenger-lock' },
  },
  { id: 'hdc', label: 'Hill descent control', setting: { menuId: 'driving-setting', controlId: 'hill-descent' } },
  { id: 'brake-hold', label: 'Brake hold', setting: { menuId: 'driving-setting', controlId: 'brake-hold' } },
  { id: 'auto-hold', label: 'Auto hold', setting: { menuId: 'driving-setting', controlId: 'autohold' } },
  { id: 'recording', label: 'Drive video recording', effect: 'recording' },
  { id: 'car-wash', label: 'Car wash mode', effect: 'car-wash' },
  { id: 'power-leaving', label: 'Power on when leaving' },
  { id: 'power-off', label: 'Power supply OFF', effect: 'power-off' },
]

/* ------------------------------------------------------------------------ */
/* Scene modes                                                                */
/* ------------------------------------------------------------------------ */

export type SceneId = 'nap' | 'camping' | 'pet' | 'car-wash' | 'welcome'

export type SceneMode = {
  id: SceneId
  name: string
  ar: string
  summary: Localized
  /** Conditions the car checks before the mode will start. Welcome mode has none. */
  requires?: { minBattery: number; gearP?: boolean; noChargingGun?: boolean }
  /** Battery level at which a running mode exits by itself. */
  exitBelow?: number
  /** Settings shown on the mode's own screen. */
  options: { id: string; label: string; control: ControlSpec }[]
  /** What the car does once the mode is running. */
  whileOn: Localized[]
  /** Ways the mode ends. */
  exits: Localized[]
  warning?: Localized
}

export const sceneModes: SceneMode[] = [
  {
    id: 'nap',
    name: 'Nap mode',
    ar: 'وضع القيلولة',
    summary: {
      en: 'A quiet, dim cabin for a rest. You set the seat, A/C, rest time and background sound, and the car wakes you when the time is up.',
      ar: 'كابينة هادئة وخافتة للراحة. تضبط المقعد والتكييف ومدة الراحة وصوت الخلفية، وتوقظك السيارة عند انتهاء الوقت.',
    },
    requires: { minBattery: 25, gearP: true },
    exitBelow: 15,
    options: [
      { id: 'duration', label: 'Alarm', control: choice(['15 min', '30 min', '45 min', '60 min'], 1) },
      { id: 'sound', label: 'Background sound', control: choice(['Off', 'Rain', 'Ocean', 'Forest'], 1) },
    ],
    whileOn: [
      {
        en: 'Doors lock if all doors, the bonnet and tailgate are shut; opening a door unlocks them all.',
        ar: 'تقفل الأبواب إذا كانت كل الأبواب والكبوت والباب الخلفي مغلقة، وفتح أي باب يفتحها كلها.',
      },
      {
        en: 'Auto wipers, auto windows, exterior and interior lights switch off, the instrument cluster turns off, the gear selector and range extender are disabled.',
        ar: 'تتوقف المساحات والنوافذ التلقائية والإضاءة الخارجية والداخلية، وتنطفئ لوحة العدادات، ويتعطل ناقل الحركة ومحرك المدى الممتد.',
      },
      {
        en: 'The screen shows a nap page without the status bar or dock, dims after 10 s untouched and turns off after 30 s. Touch it to bring it back.',
        ar: 'تعرض الشاشة صفحة القيلولة بدون شريط الحالة أو الشريط السفلي، وتخفت بعد 10 ثوان وتنطفئ بعد 30 ثانية دون لمس. المسها لتعود.',
      },
      {
        en: 'The A/C turns on with your current settings and can still be changed.',
        ar: 'يعمل التكييف بإعداداتك الحالية ويمكن تغييره.',
      },
    ],
    exits: [
      { en: 'Tap End Now, or ask the voice assistant.', ar: 'اضغط End Now أو اطلب من المساعد الصوتي.' },
      {
        en: 'Below 15% battery an alarm sounds; confirm within 30 s or the mode ends by itself.',
        ar: 'تحت 15% بطارية ينطلق تنبيه، أكد خلال 30 ثانية وإلا ينتهي الوضع تلقائيا.',
      },
    ],
  },
  {
    id: 'camping',
    name: 'Camping mode',
    ar: 'وضع التخييم',
    summary: {
      en: 'Keeps air moving and the temperature comfortable for a long stay in the car, with the screens and outside lights off. The 220 V outlets and external discharging still work.',
      ar: 'يحافظ على تجدد الهواء ودرجة حرارة مريحة للبقاء طويلا في السيارة، مع إطفاء الشاشات والإضاءة الخارجية. منافذ 220 فولت والتفريغ الخارجي تظل تعمل.',
    },
    requires: { minBattery: 25, gearP: true },
    exitBelow: 20,
    options: [
      { id: 'reserve', label: 'Reserved battery power', control: choice(['20%', '30%', '40%', '50%'], 1) },
      { id: 'discharge', label: 'External discharging', control: toggle(false) },
      { id: 'bed', label: 'Large bed mode', control: toggle(false) },
    ],
    whileOn: [
      {
        en: 'Interior camping sets the A/C to 24 °C, turns off the instrument cluster, screen and auto headlights, closes the windows and sunshade, and locks the doors.',
        ar: 'التخييم الداخلي يضبط التكييف على 24 درجة، ويطفئ لوحة العدادات والشاشة والمصابيح التلقائية، ويغلق النوافذ والستارة، ويقفل الأبواب.',
      },
      {
        en: 'The range extender, fuel detection, fuel-powered charging and sentry mode are unavailable until you leave camping.',
        ar: 'محرك المدى الممتد وكشف الوقود والشحن بالوقود ووضع الحراسة غير متاحة حتى تخرج من التخييم.',
      },
      {
        en: 'With external discharging on, apps left idle for 5 minutes close to stretch the supply.',
        ar: 'مع تشغيل التفريغ الخارجي، تغلق التطبيقات الخاملة 5 دقائق لإطالة مدة التغذية.',
      },
    ],
    exits: [
      { en: 'Tap Exit on the camping screen, or use voice.', ar: 'اضغط Exit في شاشة التخييم أو استخدم الصوت.' },
      {
        en: 'Below 20% battery it exits by itself and lowers every window 10% for air.',
        ar: 'تحت 20% بطارية يخرج تلقائيا ويخفض كل النوافذ 10% للتهوية.',
      },
    ],
  },
  {
    id: 'pet',
    name: 'Pet mode',
    ar: 'وضع الحيوانات الأليفة',
    summary: {
      en: 'Keeps the cabin comfortable while you step away and leaves a message on the screen for passers-by.',
      ar: 'يحافظ على راحة الكابينة أثناء ابتعادك ويترك رسالة على الشاشة للمارة.',
    },
    requires: { minBattery: 25, gearP: true },
    exitBelow: 20,
    options: [
      { id: 'temp', label: 'A/C temperature', control: choice(['20 °C', '22 °C', '24 °C', '26 °C'], 1) },
      { id: 'keep-ac', label: 'Maintain the current air conditioning settings', control: toggle(false) },
      { id: 'vent', label: 'Lower windows for ventilation during abnormality', control: toggle(true) },
    ],
    whileOn: [
      {
        en: 'The screen shows your message, the A/C temperature and an exit button. Once the car is locked the instrument cluster goes dark and the touchscreen stops responding.',
        ar: 'تعرض الشاشة رسالتك ودرجة التكييف وزر الخروج. بعد قفل السيارة تنطفئ لوحة العدادات وتتوقف الشاشة عن الاستجابة للمس.',
      },
      {
        en: 'Door and window buttons, voice, updates, the range extender, the custom button and the A/C buttons are disabled. Wireless charging, USB and 220 V stay powered.',
        ar: 'أزرار الأبواب والنوافذ والصوت والتحديثات ومحرك المدى الممتد والزر المخصص وأزرار التكييف تتعطل. الشحن اللاسلكي و USB و 220 فولت تظل تعمل.',
      },
      {
        en: 'The A/C can still be adjusted from the phone app.',
        ar: 'يمكن ضبط التكييف من تطبيق الهاتف.',
      },
    ],
    exits: [
      {
        en: 'With the car unlocked, hold the exit button for 3 seconds; or shift gear with the brake pressed; or use the phone app.',
        ar: 'والسيارة مفتوحة، اضغط زر الخروج مطولا 3 ثوان، أو غير الترس مع الضغط على الفرامل، أو استخدم تطبيق الهاتف.',
      },
      {
        en: 'Below 20% battery, or on an A/C or high-voltage fault, it exits, your phone is notified and the windows lower to vent.',
        ar: 'تحت 20% بطارية أو عند عطل في التكييف أو الجهد العالي يخرج الوضع ويصلك إشعار على الهاتف وتنخفض النوافذ للتهوية.',
      },
    ],
    warning: {
      en: 'Never leave children in the car. In Egyptian summer heat, check on any animal you leave inside often, whatever the screen says.',
      ar: 'لا تترك الأطفال في السيارة أبدا. في حر صيف مصر، اطمئن على أي حيوان تتركه بالداخل كثيرا مهما كانت الشاشة تقول.',
    },
  },
  {
    id: 'car-wash',
    name: 'Car wash mode',
    ar: 'وضع غسيل السيارة',
    summary: {
      en: 'Closes every window and locks the charging and fuel flaps in one go, and stops the car reacting to water and brushes.',
      ar: 'يغلق كل النوافذ ويقفل غطاء الشحن والوقود مرة واحدة، ويمنع السيارة من التفاعل مع المياه والفرش.',
    },
    requires: { minBattery: 15, noChargingGun: true },
    exitBelow: 10,
    options: [
      { id: 'type', label: 'Washing method', control: choice(['Fixed car wash', 'Movable car wash'], 0) },
    ],
    whileOn: [
      {
        en: 'Fixed: shifts to P and switches the screen off. Movable (conveyor wash): shifts to N and mutes the parking radar.',
        ar: 'الثابت: ينقل إلى P ويطفئ الشاشة. المتحرك (غسيل على سير): ينقل إلى N ويكتم صوت حساسات الركن.',
      },
      {
        en: 'Both: windows close, walk-away locking and approach unlocking are off, sentry mode and auto wipers are off, A/C recirculates, flaps lock, range extender, touch handles and voice are disabled, mirrors fold.',
        ar: 'في الحالتين: تغلق النوافذ، يتوقف القفل عند الابتعاد والفتح عند الاقتراب، يتوقف وضع الحراسة والمساحات التلقائية، يعمل التكييف على الدوران الداخلي، تقفل الأغطية، يتعطل محرك المدى الممتد ومقابض اللمس والصوت، وتنطوي المرايات.',
      },
    ],
    exits: [
      { en: 'Tap exit.', ar: 'اضغط خروج.' },
      {
        en: 'Fixed: driving above 15 km/h. Movable: shifting to P. Either: battery below 10%. Your settings come back afterwards.',
        ar: 'الثابت: القيادة فوق 15 كم/س. المتحرك: النقل إلى P. أي منهما: البطارية تحت 10%. تعود إعداداتك بعدها.',
      },
    ],
  },
  {
    id: 'welcome',
    name: 'Welcome mode',
    ar: 'وضع الترحيب',
    summary: {
      en: 'One page for everything the car does when you arrive: sounds, lights, a welcome message and the easy-access seat.',
      ar: 'صفحة واحدة لكل ما تفعله السيارة عند وصولك: الأصوات، الإضاءة، رسالة الترحيب، والمقعد سهل الدخول.',
    },
    options: [
      { id: 'disarm-sound', label: 'Disarm sound', control: toggle(true) },
      { id: 'arm-sound', label: 'Arm sound', control: toggle(true) },
      { id: 'disarm-light', label: 'Disarm light', control: toggle(true) },
      { id: 'welcome-light', label: 'Welcome ambient light', control: toggle(true) },
      { id: 'welcome-message', label: 'Welcome message', control: toggle(true) },
      { id: 'easy-access', label: 'Easy access', control: toggle(true) },
    ],
    whileOn: [
      {
        en: 'Unlocking or locking plays a light animation with the hazard lights and a sound.',
        ar: 'الفتح أو القفل يشغل عرضا ضوئيا مع إشارات الانتظار وصوتا.',
      },
      {
        en: 'Opening the driver door moves the seat to its easy-access position and the dash and door ambient lights breathe twice.',
        ar: 'فتح باب السائق ينقل المقعد لوضع الدخول السهل، وتنبض إضاءة التابلوه والأبواب مرتين.',
      },
      {
        en: 'Closing the door plays the welcome message and returns the seat to your driving position.',
        ar: 'غلق الباب يشغل رسالة الترحيب ويعيد المقعد لوضع القيادة.',
      },
    ],
    exits: [],
  },
]

/* ------------------------------------------------------------------------ */
/* Driving recorder app                                                       */
/* ------------------------------------------------------------------------ */

export const recorderTabs = ['Real-time Screen', 'Driving Video', 'Album', 'Settings'] as const
export type RecorderTab = (typeof recorderTabs)[number]

export const recorderSettings: { id: string; label: string; control: ControlSpec; note: Localized }[] = [
  {
    id: 'loop',
    label: 'Loop recording duration',
    control: choice(['1 minute', '3 minutes', '5 minutes'], 0),
    note: { en: 'Length of each looped clip.', ar: 'طول كل مقطع في التسجيل الدائري.' },
  },
  {
    id: 'clarity',
    label: 'Video clarity',
    control: choice(['SD (720 p)', 'HD (1080 p)'], 0),
    note: {
      en: 'HD looks better but fills the USB drive faster.',
      ar: 'HD أوضح لكنه يملأ الفلاشة أسرع.',
    },
  },
  {
    id: 'interior-sound',
    label: 'Interior sound recording',
    control: toggle(false),
    note: {
      en: 'Records cabin audio with the video. Off by default.',
      ar: 'يسجل صوت الكابينة مع الفيديو. متوقف افتراضيا.',
    },
  },
]

/** The assistant's wake word, per the Egypt guide. */
export const WAKE_WORD = 'Hello iCAUR'
