import type { Localized, Verification } from './types'

/**
 * A model of the V27 centre-screen menus, transcribed from the infotainment
 * settings guide and export-market evidence.
 *
 * Control labels stay as the vehicle's own screen text rather than being
 * translated, so the simulator matches what an owner actually sees in the car.
 * Everything that explains a setting is bilingual.
 */

export type ControlSpec =
  /** An on/off switch. */
  | { kind: 'toggle'; defaultOn: boolean }
  /** A segmented list where exactly one option is active. */
  | { kind: 'choice'; options: string[]; defaultIndex: number }
  /** A momentary command with no persistent state. */
  | { kind: 'action'; actions: string[] }

export type InfotainmentControl = {
  id: string
  /** Label as printed on the vehicle screen. */
  label: string
  /** What the setting actually changes, in both site languages. */
  description: Localized
  status: Verification
  control: ControlSpec
}

export type MenuIcon =
  | 'car'
  | 'gauge'
  | 'shield'
  | 'lightbulb'
  | 'battery'
  | 'mic'
  | 'monitor'
  | 'volume'
  | 'wifi'
  | 'settings'

export type InfotainmentMenu = {
  id: string
  icon: MenuIcon
  /** Menu number as shown in the vehicle's settings list. */
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

export const infotainmentMenus: InfotainmentMenu[] = [
  {
    id: 'vehicle-control',
    icon: 'car',
    index: 1,
    name: { en: 'Vehicle Settings', ar: 'إعدادات السيارة' },
    subtitle: {
      en: 'Windows, doors, locks, mirrors, wipers, buttons, seats',
      ar: 'النوافذ، الأبواب، الأقفال، المرايات، المساحات، الأزرار، المقاعد',
    },
    controls: [
      {
        id: 'all-open',
        label: 'All Open / Ventilate / All Close',
        description:
          {
          en: 'One-touch control for all four windows. Ventilate opens them slightly to flush hot air from a parked car.',
          ar: 'تحكم بلمسة واحدة في النوافذ الأربع. وضع التهوية يفتحها قليلا لطرد الهواء الساخن من السيارة المتوقفة.',
        },
        status: 'confirmed-export',
        control: action('All Open', 'Ventilate', 'All Close'),
      },
      {
        id: 'rain-close',
        label: 'Auto Close in Rain',
        description: {
          en: 'Uses the rain sensor to close open windows automatically when rain is detected.',
          ar: 'يستخدم حساس المطر لغلق النوافذ المفتوحة تلقائيا عند نزول المطر.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'passenger-lock',
        label: 'Passenger Window Lock',
        description: {
          en: 'Disables other door window switches so only the driver can operate the windows.',
          ar: 'يوقف مفاتيح النوافذ في باقي الأبواب بحيث يتحكم السائق وحده في النوافذ.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'lock-window',
        label: 'Auto Close / Ventilation on Lock',
        description:
          {
          en: 'Defines whether windows fully close or remain slightly open when the vehicle is locked.',
          ar: 'يحدد إذا كانت النوافذ تغلق بالكامل أو تبقى مفتوحة قليلا عند قفل السيارة.',
        },
        status: 'confirmed-export',
        control: choice(['Auto Close', 'Ventilation', 'Off'], 0),
      },
      {
        id: 'mirror-fold',
        label: 'Mirror Fold / Adjustment',
        description: {
          en: 'Folds or unfolds the mirrors and opens the on-screen mirror adjustment controls.',
          ar: 'يطوي أو يفرد المرايات ويفتح أدوات ضبط المراية على الشاشة.',
        },
        status: 'confirmed-export',
        control: action('Fold', 'Unfold', 'Adjust'),
      },
      {
        id: 'reverse-tilt',
        label: 'Mirrors Tilt Down When Reversing',
        description: {
          en: 'Tilts the mirror glass when reverse is selected to help see kerbs and rear wheels.',
          ar: 'يميل زجاج المراية عند اختيار الرجوع للخلف لمساعدتك على رؤية الرصيف والعجل الخلفي.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'wiper-sensitivity',
        label: 'Auto Wiper Sensitivity',
        description:
          {
          en: 'Rain-sensor sensitivity. The guide recommends Low for dusty Egypt conditions to avoid smearing.',
          ar: 'حساسية حساس المطر. الدليل ينصح بالمستوى المنخفض في أجواء مصر المتربة لتفادي تلطيخ الزجاج.',
        },
        status: 'confirmed-export',
        control: choice(['Low', 'Medium', 'High', 'Maximum'], 0),
      },
      {
        id: 'rear-wiper',
        label: 'Rear Wiper / Rear Wash',
        description: {
          en: 'Operates the rear wiper and washer directly from the screen.',
          ar: 'يشغل مساحة الزجاج الخلفي ورشاش المياه مباشرة من الشاشة.',
        },
        status: 'confirmed-export',
        control: action('Wipe', 'Wash'),
      },
      {
        id: 'custom-buttons',
        label: 'Custom Buttons',
        description:
          {
          en: 'Assigns actions to the centre-display shortcut, the steering-wheel custom button, and the key-fob shortcut.',
          ar: 'يحدد وظيفة اختصار الشاشة، وزر الدركسيون المخصص، واختصار المفتاح.',
        },
        status: 'confirmed-export',
        control: choice(['Screen shortcut', 'Steering wheel', 'Key fob'], 0),
      },
      {
        id: 'car-lock',
        label: 'Door Lock / Approach / Walk Away',
        description:
          {
          en: 'Controls door lock, auto unlock on approach, auto lock on walk away, driving lock, and parking unlock behavior.',
          ar: 'يتحكم في قفل الأبواب، الفتح التلقائي عند الاقتراب، القفل عند الابتعاد، القفل أثناء القيادة، والفتح عند الركن.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'seat-memory',
        label: 'Seat 1 / Seat 2 / Seat 3',
        description:
          {
          en: 'Seat memory profile behavior where fitted. Exact trim availability needs Egypt confirmation.',
          ar: 'ذاكرة أوضاع المقعد حسب التجهيز. توفرها في فئات مصر يحتاج تأكيد.',
        },
        status: 'verify',
        control: choice(['Seat 1', 'Seat 2', 'Seat 3'], 0),
      },
      {
        id: 'easy-entry',
        label: 'Easy Entry / Exit',
        description: {
          en: 'Moves the seat to make entry and exit easier where the power-seat system supports it.',
          ar: 'يحرك المقعد لتسهيل الركوب والنزول عند دعم نظام المقاعد الكهربائية لهذه الوظيفة.',
        },
        status: 'verify',
        control: toggle(false),
      },
    ],
  },
  {
    id: 'driving-control',
    icon: 'gauge',
    index: 2,
    name: { en: 'Driving', ar: 'القيادة' },
    subtitle: {
      en: 'Hill descent, AutoHold, regen, stability, brake cleaning, trailer',
      ar: 'نزول المنحدرات، التثبيت، الاسترجاع، الثبات، تنظيف الفرامل، المقطورة',
    },
    controls: [
      {
        id: 'hill-descent',
        label: 'Hill Descent Control',
        description: {
          en: 'Controls downhill speed on steep descents when conditions allow.',
          ar: 'يتحكم في سرعة النزول على المنحدرات الحادة عندما تسمح الظروف.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'autohold',
        label: 'AutoHold',
        description: {
          en: 'Holds the vehicle stopped after braking so the driver can release the brake pedal.',
          ar: 'يبقي السيارة متوقفة بعد الفرملة حتى يستطيع السائق رفع قدمه عن الدواسة.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'regen',
        label: 'Regenerative Braking',
        description: {
          en: 'Adjusts energy recovery feel and how much braking comes from the electric motors.',
          ar: 'يضبط إحساس استرجاع الطاقة ومقدار الفرملة القادم من المواتير الكهربائية.',
        },
        status: 'confirmed-export',
        control: choice(['Low', 'Standard', 'High'], 1),
      },
      {
        id: 'esc',
        label: 'Electronic Stability Control',
        description:
          {
          en: 'Stability system. The guide warns not to turn it off except for specific stuck-vehicle recovery.',
          ar: 'نظام الثبات. الدليل يحذر من إيقافه إلا في حالات إخراج السيارة من الغرز.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'brake-cleaning',
        label: 'Brake Disc Cleaning',
        description: {
          en: 'Reduces regeneration so the friction brakes can clear surface moisture or deposits.',
          ar: 'يقلل الاسترجاع حتى تتمكن الفرامل الاحتكاكية من إزالة الرطوبة أو الترسبات من الأقراص.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'trailer-mode',
        label: 'Trailer Mode',
        description:
          {
          en: 'Changes vehicle behavior for towing. Export towing values must be verified before Egypt use.',
          ar: 'يغير سلوك السيارة للسحب. قيم السحب في أسواق التصدير تحتاج تأكيد قبل استخدامها في مصر.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
    ],
  },
  {
    id: 'driver-assistance',
    icon: 'shield',
    index: 3,
    name: { en: 'Driver Assistance', ar: 'مساعدة السائق' },
    subtitle: {
      en: 'Monitoring, speed warning, cruise, lane, collision, reverse brake',
      ar: 'المراقبة، تحذير السرعة، المثبت، المسار، التصادم، فرملة الرجوع',
    },
    controls: [
      {
        id: 'fatigue',
        label: 'Fatigue Monitoring',
        description: {
          en: 'Monitors signs of driver fatigue and alerts when its detection rules are met.',
          ar: 'يراقب علامات إرهاق السائق وينبه عند تحقق شروط الاكتشاف.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'attention',
        label: 'Attention Monitoring',
        description: {
          en: 'Driver attention monitoring function described in the infotainment guide.',
          ar: 'وظيفة مراقبة انتباه السائق كما وردت في دليل نظام الشاشة.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'speed-warning',
        label: 'Speed Warning',
        description: {
          en: 'Configures speed warning behavior where supported by software and market data.',
          ar: 'يضبط سلوك التحذير من السرعة حسب دعم السوفتوير وبيانات السوق.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'cruise-mode',
        label: 'Cruise Mode Switch',
        description: {
          en: 'Switches between Adaptive and Constant Speed cruise behavior.',
          ar: 'يبدل بين مثبت السرعة التكيفي ومثبت السرعة الثابت.',
        },
        status: 'confirmed-export',
        control: choice(['Adaptive', 'Constant Speed'], 0),
      },
      {
        id: 'leading-vehicle',
        label: 'Leading Vehicle Departure Alert',
        description: {
          en: 'Alerts when the vehicle ahead has moved off and the V27 is still stopped.',
          ar: 'ينبهك عندما تتحرك السيارة أمامك وتكون V27 ما زالت متوقفة.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'elk',
        label: 'Emergency Lane Keeping Assist',
        description: {
          en: 'Lane intervention feature for emergency avoidance situations.',
          ar: 'تدخل على مستوى المسار في حالات التفادي الطارئ.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'rba',
        label: 'Reverse Brake Assist',
        description: {
          en: 'Reverse emergency braking assistance when backing toward an obstacle.',
          ar: 'مساعدة الفرملة الطارئة أثناء الرجوع للخلف تجاه عائق.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'fcw',
        label: 'Forward Collision Warning Assist',
        description: {
          en: 'Warns of forward collision risk and works together with the sensitivity setting.',
          ar: 'ينبه من خطر اصطدام أمامي ويعمل مع إعداد الحساسية.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'fcw-sensitivity',
        label: 'FCW Sensitivity',
        description: {
          en: 'Warning timing for forward collision warnings.',
          ar: 'توقيت التحذير من الاصطدام الأمامي.',
        },
        status: 'confirmed-export',
        control: choice(['Early', 'Medium', 'Late'], 1),
      },
    ],
  },
  {
    id: 'lights',
    icon: 'lightbulb',
    index: 4,
    name: { en: 'Lights', ar: 'الإضاءة' },
    subtitle: {
      en: 'Ambient lighting, dome light, alerts, welcome, find car, follow-me-home',
      ar: 'الإضاءة المحيطة، إضاءة السقف، التنبيهات، الترحيب، تحديد السيارة، إضاءة المرافقة',
    },
    controls: [
      {
        id: 'ambient-on',
        label: 'Ambient Lighting',
        description: {
          en: 'On, Theme, Music Rhythm, and Custom ambient lighting behavior.',
          ar: 'سلوك الإضاءة المحيطة: تشغيل، حسب الثيم، مع إيقاع الموسيقى، أو مخصص.',
        },
        status: 'confirmed-export',
        control: choice(['On', 'Theme', 'Music Rhythm', 'Custom'], 0),
      },
      {
        id: 'ambient-brightness',
        label: 'Brightness',
        description: {
          en: 'Adjusts ambient lighting brightness.',
          ar: 'يضبط سطوع الإضاءة المحيطة.',
        },
        status: 'confirmed-export',
        control: choice(['Low', 'Medium', 'High'], 1),
      },
      {
        id: 'ambient-effect',
        label: 'Ambient Light Effect',
        description: {
          en: 'Always On or Breathing effect mode.',
          ar: 'وضع الإضاءة الثابتة أو تأثير التنفس.',
        },
        status: 'confirmed-export',
        control: choice(['Always On', 'Breathing'], 0),
      },
      {
        id: 'dome',
        label: 'Auto Dome Light',
        description: {
          en: 'Controls automatic dome and interior light behavior.',
          ar: 'يتحكم في الإضاءة الداخلية وإضاءة السقف التلقائية.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'ambient-alert',
        label: 'Ambient Lighting Alert',
        description: {
          en: 'Uses the ambient light as an attention-catching alert.',
          ar: 'يستخدم الإضاءة المحيطة كتنبيه للفت الانتباه.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'welcome',
        label: 'Welcome Ambient Lighting',
        description: {
          en: 'Welcome lighting behavior when approaching or unlocking the vehicle.',
          ar: 'سلوك إضاءة الترحيب عند الاقتراب من السيارة أو فتحها.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'find-car',
        label: 'Find My Car',
        description: {
          en: 'Lighting duration used to locate the vehicle in a car park.',
          ar: 'مدة الإضاءة المستخدمة لتحديد مكان السيارة في الجراج.',
        },
        status: 'confirmed-export',
        control: choice(['Off', '15s', '30s', '60s', '120s'], 2),
      },
      {
        id: 'follow-me',
        label: 'Follow Me Home Lights',
        description: {
          en: 'Exterior light duration after leaving the vehicle.',
          ar: 'مدة بقاء الإضاءة الخارجية بعد مغادرة السيارة.',
        },
        status: 'confirmed-export',
        control: choice(['Off', '15s', '30s', '60s', '120s'], 1),
      },
      {
        id: 'turn-signal',
        label: 'Turn Signal Blink',
        description: {
          en: 'Convenience signalling blink count for a short lane-change tap.',
          ar: 'عدد ومضات الإشارة عند الضغطة القصيرة لتغيير الحارة.',
        },
        status: 'confirmed-export',
        control: choice(['3', '5', '7'], 0),
      },
    ],
  },
  {
    id: 'energy',
    icon: 'battery',
    index: 5,
    name: { en: 'Energy', ar: 'الطاقة' },
    subtitle: {
      en: 'Charge limit, fuel cap, charging current, generator, V2L, wireless charging',
      ar: 'حد الشحن، غطاء الوقود، تيار الشحن، المولد، V2L، الشحن اللاسلكي',
    },
    controls: [
      {
        id: 'charge-limit',
        label: 'Charge Limit',
        description: {
          en: 'Sets the battery charge target where supported.',
          ar: 'يحدد نسبة الشحن المستهدفة للبطارية عند دعم الوظيفة.',
        },
        status: 'confirmed-export',
        control: choice(['80%', '90%', '100%'], 2),
      },
      {
        id: 'fuel-cap',
        label: 'Fuel Cap Unlock',
        description: {
          en: 'Unlocks the fuel filler cap from the screen.',
          ar: 'يفتح غطاء خزان الوقود من الشاشة.',
        },
        status: 'confirmed-export',
        control: action('Unlock'),
      },
      {
        id: 'slow-current',
        label: 'Slow Charging Current Limit',
        description: {
          en: 'Limits AC charging current for safer home or low-power charging situations.',
          ar: 'يحد من تيار الشحن المتردد لشحن أكثر أمانا في المنزل أو على مصادر كهرباء ضعيفة.',
        },
        status: 'confirmed-export',
        control: choice(['6 A', '10 A', '13 A', '16 A'], 3),
      },
      {
        id: 'stationary-charge',
        label: 'Stationary Charging',
        description: {
          en: 'Starts the range extender while parked to charge the battery.',
          ar: 'يشغل المولد والسيارة متوقفة لشحن البطارية.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'ac-connector',
        label: 'Auto Unlock AC Charging Connector',
        description: {
          en: 'Automatically releases the AC charging connector under the configured conditions.',
          ar: 'يحرر قابس الشحن المتردد تلقائيا حسب الشروط المضبوطة.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'preconditioning',
        label: 'Manual Battery Preconditioning',
        description: {
          en: 'Prepares battery temperature for better charging and performance behavior.',
          ar: 'يهيئ درجة حرارة البطارية لتحسين الشحن والأداء.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'external-power',
        label: 'External Power Supply Limit',
        description: {
          en: 'Sets the V2L export power limit. The Saudi export source lists up to 6 kW.',
          ar: 'يضبط حد قدرة التغذية الخارجية V2L. مصدر التصدير السعودي يذكر حتى 6 كيلوواط.',
        },
        status: 'confirmed-export',
        control: choice(['1 kW', '3 kW', '6 kW'], 2),
      },
      {
        id: 'fuel-power',
        label: 'Fuel-Based Power Supply',
        description: {
          en: 'Uses the range extender to sustain external power supply where supported.',
          ar: 'يستخدم المولد لاستمرار تغذية الأجهزة الخارجية عند دعم الوظيفة.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'wireless',
        label: 'Wireless Charging',
        description: {
          en: 'Wireless phone charging pad control and status.',
          ar: 'التحكم في شاحن الهاتف اللاسلكي ومتابعة حالته.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
    ],
  },
  {
    id: 'voice',
    icon: 'mic',
    index: 6,
    name: { en: 'Voice', ar: 'الصوت والأوامر' },
    subtitle: {
      en: 'Voice assistant, conversation duration, source localization',
      ar: 'المساعد الصوتي، مدة المحادثة، تحديد مصدر الصوت',
    },
    controls: [
      {
        id: 'voice-assistant',
        label: 'Voice Assistant',
        description: {
          en: 'Voice assistant feature page and related voice interaction settings.',
          ar: 'صفحة المساعد الصوتي وإعدادات التفاعل الصوتي المرتبطة به.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'conversation',
        label: 'Conversation Duration',
        description: {
          en: 'How long the assistant keeps listening for a follow-up command.',
          ar: 'المدة التي يظل فيها المساعد مستمعا لأمر إضافي.',
        },
        status: 'confirmed-export',
        control: choice(['Off', '10s', '15s', '20s'], 1),
      },
      {
        id: 'source-localization',
        label: 'Sound Source Localization',
        description: {
          en: 'Decides whether the assistant responds to any seat or only the driver.',
          ar: 'يحدد إذا كان المساعد يستجيب لأي مقعد أو للسائق فقط.',
        },
        status: 'confirmed-export',
        control: choice(['Off', 'Driver Seat', 'Auto'], 2),
      },
    ],
  },
  {
    id: 'display',
    icon: 'monitor',
    index: 7,
    name: { en: 'Display', ar: 'الشاشة' },
    subtitle: {
      en: 'Time, language, timezone, screen cleaning',
      ar: 'الوقت، اللغة، المنطقة الزمنية، تنظيف الشاشة',
    },
    controls: [
      {
        id: 'time-display',
        label: 'Time Display',
        description: {
          en: '12-hour or 24-hour clock display.',
          ar: 'عرض الساعة بنظام 12 أو 24 ساعة.',
        },
        status: 'confirmed-export',
        control: choice(['12 h', '24 h'], 1),
      },
      {
        id: 'language-settings',
        label: 'Language Settings',
        description: {
          en: 'System language setting page.',
          ar: 'صفحة ضبط لغة النظام.',
        },
        status: 'confirmed-export',
        control: choice(['English', 'العربية', '中文'], 0),
      },
      {
        id: 'timezone',
        label: 'Time Zone Settings',
        description: {
          en: 'Time-zone configuration.',
          ar: 'ضبط المنطقة الزمنية.',
        },
        status: 'confirmed-export',
        control: choice(['GMT+2 Cairo', 'GMT+3', 'GMT+4'], 0),
      },
      {
        id: 'screen-cleaning',
        label: 'Screen Cleaning',
        description: {
          en: 'Locks touch input so the display can be wiped without triggering anything.',
          ar: 'يقفل اللمس حتى يمكن مسح الشاشة دون تشغيل أي وظيفة بالخطأ.',
        },
        status: 'confirmed-export',
        control: action('Lock screen for 30s'),
      },
    ],
  },
  {
    id: 'sound',
    icon: 'volume',
    index: 8,
    name: { en: 'Sound', ar: 'الصوتيات' },
    subtitle: {
      en: 'Sound mode, effects, EQ, prompts, pedestrian reminder, tones',
      ar: 'وضع الصوت، المؤثرات، الموازن، التنبيهات، تنبيه المشاة، النغمات',
    },
    controls: [
      {
        id: 'sound-mode',
        label: 'Sound Mode',
        description: {
          en: 'Which seats the audio system focuses on.',
          ar: 'يحدد المقاعد التي يركز عليها نظام الصوت.',
        },
        status: 'confirmed-export',
        control: choice(['Private', 'DriverCentric', 'Whole Cabin'], 2),
      },
      {
        id: 'sound-effects',
        label: 'Sound Effects',
        description: {
          en: 'Preset audio character for the Pioneer system.',
          ar: 'نمط صوتي جاهز لنظام Pioneer.',
        },
        status: 'confirmed-export',
        control: choice(['Standard', 'Surround', 'Concert Hall', 'Subwoofer'], 0),
      },
      {
        id: 'soundstage',
        label: 'Soundstage / Equalizer',
        description: {
          en: 'Sound field and equalizer controls.',
          ar: 'التحكم في المجال الصوتي والموازن.',
        },
        status: 'confirmed-export',
        control: action('Open equalizer'),
      },
      {
        id: 'call-notice',
        label: 'Incoming Call Notification',
        description: {
          en: 'How an incoming call is announced.',
          ar: 'طريقة الإعلان عن المكالمة الواردة.',
        },
        status: 'confirmed-export',
        control: choice(['Off', 'Voice Announce', 'Ringtone'], 2),
      },
      {
        id: 'pedestrian',
        label: 'Low-speed Pedestrian Reminder',
        description: {
          en: 'External low-speed warning sound played while driving on electric power.',
          ar: 'صوت تنبيه خارجي عند السرعات المنخفضة أثناء السير بالكهرباء.',
        },
        status: 'confirmed-export',
        control: choice(['Starry Sky', 'Wind Chant', 'Engine'], 0),
      },
      {
        id: 'touch-sound',
        label: 'Touchscreen Sound Effects',
        description: {
          en: 'Touch feedback sound setting.',
          ar: 'إعداد صوت اللمس على الشاشة.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'tone',
        label: 'Notification Tone',
        description: {
          en: 'System notification sound setting.',
          ar: 'إعداد نغمة تنبيهات النظام.',
        },
        status: 'confirmed-export',
        control: choice(['Tone 1', 'Tone 2', 'Tone 3'], 0),
      },
      {
        id: 'speed-volume',
        label: 'Speed-dependent Volume Compensation',
        description: {
          en: 'Automatically raises volume as vehicle speed rises.',
          ar: 'يرفع مستوى الصوت تلقائيا مع زيادة سرعة السيارة.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'door-volume',
        label: 'Door Open Volume Reduction',
        description: {
          en: 'Reduces volume when a door is opened.',
          ar: 'يخفض مستوى الصوت عند فتح أي باب.',
        },
        status: 'confirmed-export',
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
      en: 'Wi-Fi, Bluetooth, Apple CarPlay, Android Auto',
      ar: 'واي فاي، بلوتوث، أبل كاربلاي، أندرويد أوتو',
    },
    controls: [
      {
        id: 'wifi',
        label: 'Wi-Fi',
        description: {
          en: 'Wi-Fi connection settings where the market software enables them.',
          ar: 'إعدادات اتصال الواي فاي حيث يتيحها سوفتوير السوق.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'bluetooth',
        label: 'Bluetooth',
        description: {
          en: 'Bluetooth pairing and device management.',
          ar: 'إقران أجهزة البلوتوث وإدارتها.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'carplay-aa',
        label: 'Apple CarPlay / Android Auto',
        description:
          {
          en: 'Phone projection described in the infotainment guide. Egypt software support should still be verified.',
          ar: 'ربط الهاتف كما ورد في دليل نظام الشاشة. دعم نسخة مصر يحتاج تحققا.',
        },
        status: 'confirmed-export',
        control: action('Add new device'),
      },
    ],
  },
  {
    id: 'system-safety',
    icon: 'settings',
    index: 10,
    name: { en: 'System & Safety', ar: 'النظام والسلامة' },
    subtitle: {
      en: 'Towing, air quality, power off, service-related controls',
      ar: 'السحب، جودة الهواء، إيقاف التشغيل، إعدادات الخدمة',
    },
    controls: [
      {
        id: 'towing',
        label: 'Towing Mode',
        description: {
          en: 'Vehicle towing mode. Use only according to the official manual instructions.',
          ar: 'وضع سحب السيارة. استخدمه فقط حسب تعليمات دليل المالك الرسمي.',
        },
        status: 'confirmed-export',
        control: toggle(false),
      },
      {
        id: 'exhaust',
        label: 'Exhaust Gas Detection',
        description: {
          en: 'Air-quality and exhaust gas detection function described in the guide.',
          ar: 'وظيفة مراقبة جودة الهواء واكتشاف غازات العادم كما وردت في الدليل.',
        },
        status: 'confirmed-export',
        control: toggle(true),
      },
      {
        id: 'power-off',
        label: 'Power Off',
        description: {
          en: 'Power-off control in the system menu.',
          ar: 'أمر إيقاف تشغيل النظام من قائمة النظام.',
        },
        status: 'confirmed-export',
        control: action('Power off'),
      },
    ],
  },
]

/** Tiles on the simulated home screen. `menuId` opens the matching settings group. */
export type HomeTile = {
  id: string
  label: Localized
  icon: MenuIcon | 'nav' | 'media' | 'phone' | 'camera'
  /** Opens a settings group. */
  menuId?: string
  /** Opens a full-screen app instead of a settings group. */
  appId?: 'navigation' | 'camera'
  /** Shown under the tile label, e.g. the current station or range. */
  detail?: Localized
}

export const homeTiles: HomeTile[] = [
  {
    id: 'navigation',
    icon: 'nav',
    label: { en: 'Navigation', ar: 'الملاحة' },
    detail: { en: 'Cairo Ring Road', ar: 'الطريق الدائري' },
    appId: 'navigation',
  },
  {
    id: 'media',
    icon: 'media',
    label: { en: 'Media', ar: 'الوسائط' },
    detail: { en: 'Pioneer audio', ar: 'صوتيات Pioneer' },
    menuId: 'sound',
  },
  {
    id: 'phone',
    icon: 'phone',
    label: { en: 'Phone', ar: 'الهاتف' },
    detail: { en: 'Bluetooth ready', ar: 'بلوتوث جاهز' },
    menuId: 'connections',
  },
  {
    id: 'vehicle',
    icon: 'car',
    label: { en: 'Vehicle', ar: 'السيارة' },
    detail: { en: 'Doors, windows, mirrors', ar: 'أبواب، نوافذ، مرايات' },
    menuId: 'vehicle-control',
  },
  {
    id: 'energy',
    icon: 'battery',
    label: { en: 'Energy', ar: 'الطاقة' },
    detail: { en: 'Charging and V2L', ar: 'الشحن و V2L' },
    menuId: 'energy',
  },
  {
    id: 'camera',
    icon: 'camera',
    label: { en: 'Camera', ar: 'الكاميرا' },
    detail: { en: '540 surround view', ar: 'رؤية محيطية 540' },
    appId: 'camera',
  },
  {
    id: 'assistance',
    icon: 'shield',
    label: { en: 'Assistance', ar: 'المساعدة' },
    detail: { en: 'ADAS settings', ar: 'إعدادات ADAS' },
    menuId: 'driver-assistance',
  },
  {
    id: 'settings',
    icon: 'settings',
    label: { en: 'Settings', ar: 'الإعدادات' },
    detail: { en: 'System and safety', ar: 'النظام والسلامة' },
    menuId: 'system-safety',
  },
]

export const DRIVE_MODES = ['Eco', 'Comfort', 'Sport', 'Off-road'] as const
export type DriveMode = (typeof DRIVE_MODES)[number]
