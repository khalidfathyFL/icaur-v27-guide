import type { Localized, Verification } from './types'

/**
 * The V27 centre-screen Settings menu, transcribed from the official
 * "iCAUR V27 Infotainment Settings" owner's guide (Version 2, 18 September 2026),
 * which is written for owners in Egypt and bundled with this site.
 *
 * Section names, order and control labels match the car's own screen exactly,
 * so the simulator can be used side by side with the vehicle. Explanations and
 * the guide's Egypt-specific advice are bilingual.
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
  /** Sub-heading this control sits under on the car's page, e.g. "WINDOWS". */
  section?: string
  /** What the setting actually changes, in both site languages. */
  description: Localized
  /** The guide's Egypt-specific recommendation for this setting. */
  egyptTip?: Localized
  /** A safety warning the guide attaches to this setting. */
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

export type InfotainmentMenu = {
  id: string
  icon: MenuIcon
  /** Position in the car's own left-hand menu column. */
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

/** The guide is an Egypt-market owner document, so its settings are Egypt-confirmed. */
const EGYPT: Verification = 'confirmed-egypt'

export const infotainmentMenus: InfotainmentMenu[] = [
  {
    id: 'vehicle-settings',
    icon: 'car',
    index: 1,
    name: { en: 'Vehicle Settings', ar: 'إعدادات السيارة' },
    subtitle: {
      en: 'Windows, doors, locking behaviour, mirrors, wipers, button customization and seats',
      ar: 'النوافذ، الأبواب، سلوك القفل، المرايات، المساحات، تخصيص الأزرار، والمقاعد',
    },
    controls: [
      {
        id: 'all-open',
        label: 'All Open / Ventilate / All Close',
        section: 'WINDOWS',
        description: {
          en: 'One-touch control of all four windows. Ventilate opens them a small amount rather than fully, the quickest way to flush hot air out of a car that has been standing in the sun.',
          ar: 'تحكم بلمسة واحدة في النوافذ الأربع. وضع التهوية يفتحها قليلا بدل الفتح الكامل، وهو أسرع طريقة لطرد الهواء الساخن من سيارة واقفة في الشمس.',
        },
        status: EGYPT,
        control: action('All Open', 'Ventilate', 'All Close'),
      },
      {
        id: 'rain-close',
        label: 'Auto Close in Rain',
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
        label: 'Passenger Window Lock',
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
        label: 'Auto Close on Lock / Auto Ventilation on Lock',
        section: 'AUTO LOCK CONTROL',
        description: {
          en: 'Decides what the windows do when you lock the car. Auto Close shuts everything; Auto Ventilation leaves them slightly open so the cabin does not turn into an oven while parked.',
          ar: 'يحدد ما تفعله النوافذ عند قفل السيارة. الغلق التلقائي يغلقها بالكامل، والتهوية تتركها مفتوحة قليلا حتى لا تتحول الكابينة إلى فرن أثناء الوقوف.',
        },
        status: EGYPT,
        control: choice(['Auto Close', 'Auto Ventilation'], 0),
      },
      {
        id: 'mirror-fold',
        label: 'Mirror Fold',
        section: 'EXTERIOR REARVIEW MIRRORS',
        description: {
          en: 'Folds or unfolds the mirrors immediately. Useful in tight garages and narrow side streets.',
          ar: 'يطوي أو يفرد المرايات فورا. مفيد في الجراجات الضيقة والشوارع الجانبية الصغيرة.',
        },
        status: EGYPT,
        control: action('Fold', 'Unfold'),
      },
      {
        id: 'mirror-adjust',
        label: 'Mirror Adjustment',
        section: 'EXTERIOR REARVIEW MIRRORS',
        description: {
          en: 'Opens the on-screen controls for aiming each mirror.',
          ar: 'يفتح أدوات ضبط اتجاه كل مراية على الشاشة.',
        },
        status: EGYPT,
        control: action('Left mirror', 'Right mirror'),
      },
      {
        id: 'mirror-auto-fold',
        label: 'Auto Fold on Lock',
        section: 'EXTERIOR REARVIEW MIRRORS',
        description: {
          en: 'The mirrors fold in automatically whenever you lock the car, and unfold when you unlock it.',
          ar: 'تنطوي المرايات تلقائيا عند قفل السيارة وتنفرد عند فتحها.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'reverse-tilt',
        label: 'Mirrors tilt down when reversing',
        section: 'EXTERIOR REARVIEW MIRRORS',
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
        label: 'Auto Wiper Sensitivity',
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
        label: 'Rear Wiper / Rear Wash',
        section: 'WIPERS',
        description: {
          en: 'Operates the rear wiper and washer directly from the screen.',
          ar: 'يشغل مساحة الزجاج الخلفي ورشاش المياه مباشرة من الشاشة.',
        },
        status: EGYPT,
        control: action('Wipe', 'Wash'),
      },
      {
        id: 'display-shortcut',
        label: 'Center Display Custom Shortcut',
        section: 'BUTTON CUSTOMIZATION',
        description: {
          en: 'Assigns two separate actions to the physical control below the screen: one for a short press and one for scrolling it. Volume on the scroll is the sensible default.',
          ar: 'يخصص وظيفتين للزر الفعلي أسفل الشاشة: واحدة للضغطة القصيرة وأخرى للتمرير. ضبط التمرير على مستوى الصوت هو الخيار المنطقي.',
        },
        status: EGYPT,
        control: choice(['Volume', 'Media', 'Map zoom'], 0),
      },
      {
        id: 'steering-custom',
        label: 'Steering Wheel Customization',
        section: 'BUTTON CUSTOMIZATION',
        description: {
          en: 'Chooses which function the customisable steering wheel button triggers.',
          ar: 'يحدد الوظيفة التي يشغلها زر الدركسيون القابل للتخصيص.',
        },
        status: EGYPT,
        control: choice(['Voice', 'Media', 'A/C'], 0),
      },
      {
        id: 'key-fob-custom',
        label: 'Key Fob Button Customization',
        section: 'BUTTON CUSTOMIZATION',
        description: {
          en: 'Sets what the extra button on your remote does. A/C On starts the air conditioning remotely so the cabin is cool before you reach the car.',
          ar: 'يحدد وظيفة الزر الإضافي في الريموت. خيار A/C On يشغل التكييف عن بعد حتى تبرد الكابينة قبل أن تصل للسيارة.',
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
        section: 'CAR LOCK',
        description: {
          en: 'Locks or unlocks the doors from the screen.',
          ar: 'يقفل أو يفتح الأبواب من الشاشة.',
        },
        status: EGYPT,
        control: action('Lock', 'Unlock'),
      },
      {
        id: 'unlock-approach',
        label: 'Auto Unlock on Approach',
        section: 'CAR LOCK',
        description: {
          en: 'The car unlocks by itself when it senses the smart key nearby. Convenient with full hands; turn it off if you would rather the car stayed locked until you press something.',
          ar: 'تفتح السيارة نفسها عند استشعار المفتاح الذكي قريبا. مريح ويداك مشغولتان، وأوقفه إذا كنت تفضل أن تبقى مقفلة حتى تضغط بنفسك.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'lock-walk-away',
        label: 'Auto Lock on Walk Away',
        section: 'CAR LOCK',
        description: {
          en: 'The car locks itself once the key has moved a certain distance away.',
          ar: 'تقفل السيارة نفسها بمجرد ابتعاد المفتاح مسافة معينة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'lock-driving',
        label: 'Auto Lock When Driving',
        section: 'CAR LOCK',
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
        label: 'Auto Unlock When Parking',
        section: 'CAR LOCK',
        description: {
          en: 'Unlocks the doors when you shift into P and unbuckle your seatbelt.',
          ar: 'يفتح الأبواب عند نقل ناقل الحركة إلى P وفك حزام الأمان.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'key-reminder',
        label: 'Key Left Behind Reminder',
        section: 'CAR LOCK',
        description: {
          en: 'Warns you to take your phone and key with you before leaving the vehicle.',
          ar: 'ينبهك لأخذ هاتفك ومفتاحك قبل مغادرة السيارة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'driving-habit',
        label: 'Seat 1 / Seat 2 / Seat 3',
        section: 'DRIVING HABIT',
        description: {
          en: 'Three stored driver profiles, so the car can hold different preferences for different people in the household.',
          ar: 'ثلاثة ملفات سائق محفوظة، حتى تحتفظ السيارة بتفضيلات مختلفة لأفراد البيت.',
        },
        status: EGYPT,
        control: choice(['Seat 1', 'Seat 2', 'Seat 3'], 0),
      },
      {
        id: 'easy-entry',
        label: 'Easy Entry/Exit',
        section: 'SEAT',
        description: {
          en: 'The driver’s seat slides back when you switch the car off to give you room to get out, then returns to your position when you return. Genuinely useful in a vehicle this tall.',
          ar: 'يتراجع مقعد السائق للخلف عند إطفاء السيارة ليعطيك مساحة للنزول، ثم يعود لوضعك عند العودة. مفيد فعلا في سيارة بهذا الارتفاع.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'seat-adjust',
        label: 'Driver Seat / Passenger Seat',
        section: 'SEAT',
        description: {
          en: 'On-screen arrows for adjusting the seat you have selected: backrest angle, forward and back, and height. The driver can adjust the front passenger seat from here too.',
          ar: 'أسهم على الشاشة لضبط المقعد المختار: زاوية الظهر، للأمام والخلف، والارتفاع. يمكن للسائق ضبط مقعد الراكب الأمامي من هنا أيضا.',
        },
        status: EGYPT,
        control: action('Driver seat', 'Passenger seat'),
      },
    ],
  },
  {
    id: 'driver-assistance-settings',
    icon: 'wheel',
    index: 2,
    name: { en: 'Driver Assistance Settings', ar: 'إعدادات مساعدة السائق' },
    subtitle: {
      en: 'Braking behaviour, stability systems, driver monitoring and the speed warning',
      ar: 'سلوك الفرملة، أنظمة الثبات، مراقبة السائق، وتحذير السرعة',
    },
    controls: [
      {
        id: 'hill-descent',
        label: 'Hill Descent Control',
        section: 'DRIVING MODE ASSIST',
        description: {
          en: 'On a steep descent the car holds a low, steady speed by itself so you can keep both feet off the pedals and concentrate on steering. For off-road and steep unpaved slopes, not for normal roads.',
          ar: 'على المنحدرات الحادة تحافظ السيارة على سرعة منخفضة ثابتة بنفسها حتى ترفع قدميك عن الدواسات وتركز في التوجيه. مخصص للطرق الوعرة والمنحدرات غير الممهدة وليس للطرق العادية.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'autohold',
        label: 'AutoHold',
        section: 'DRIVING MODE ASSIST',
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
        id: 'regen',
        label: 'Regenerative Braking',
        section: 'DRIVING MODE ASSIST',
        description: {
          en: 'When you lift off the accelerator the electric motor slows the car and turns that momentum back into charge. It is what gives an EV its distinctive one-pedal feel, and a good part of your city efficiency comes from it.',
          ar: 'عند رفع قدمك عن دواسة البنزين يبطئ الموتور الكهربائي السيارة ويحول هذه الحركة إلى شحن. هذا ما يعطي إحساس القيادة بدواسة واحدة، ومنه جزء كبير من كفاءتك داخل المدينة.',
        },
        status: EGYPT,
        control: choice(['Low', 'Standard', 'High'], 1),
      },
      {
        id: 'parking-brake',
        label: 'Parking Brake',
        section: 'DRIVING MODE ASSIST',
        description: {
          en: 'Applies and releases the electronic parking brake. It appears greyed out while the vehicle is moving.',
          ar: 'يشغل ويحرر فرامل الانتظار الكهربائية. يظهر معطلا أثناء تحرك السيارة.',
        },
        status: EGYPT,
        control: action('Apply', 'Release'),
      },
      {
        id: 'esc',
        label: 'Electronic Stability Control',
        section: 'DRIVING MODE ASSIST',
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
        label: 'Brake Disc Cleaning',
        section: 'DRIVING MODE ASSIST',
        description: {
          en: 'Because regenerative braking does most of the slowing, the ordinary discs are used lightly and can develop surface rust or a squeal. This temporarily holds back regeneration so the friction brakes wipe the discs clean, then switches itself off when finished.',
          ar: 'لأن الفرملة الاسترجاعية تقوم بمعظم الإبطاء، تستخدم الأقراص العادية بشكل خفيف وقد يظهر عليها صدأ سطحي أو صرير. هذا الخيار يقلل الاسترجاع مؤقتا حتى تنظف الفرامل الاحتكاكية الأقراص، ثم يتوقف من تلقاء نفسه.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'trailer-mode',
        label: 'Trailer Mode',
        section: 'DRIVING MODE ASSIST',
        description: {
          en: 'Tells the car it is pulling a trailer, so the parking sensors and assistance systems account for the extra length behind you. Switch it off again once the trailer is unhitched.',
          ar: 'يخبر السيارة أنها تسحب مقطورة، فتحسب حساسات الركن وأنظمة المساعدة الطول الإضافي خلفك. أوقفه بعد فك المقطورة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'fatigue',
        label: 'Fatigue Monitoring',
        section: 'DRIVER SAFETY MONITORING',
        description: {
          en: 'Uses the driver-facing camera to watch for signs of drowsiness, such as eyes closing or the head dropping, and warns you to rest.',
          ar: 'يستخدم الكاميرا الموجهة للسائق لمراقبة علامات النعاس مثل إغلاق العينين أو سقوط الرأس، وينبهك للراحة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'attention',
        label: 'Attention Monitoring',
        section: 'DRIVER SAFETY MONITORING',
        description: {
          en: 'Warns you when your eyes have been off the road for too long, typically looking down at a phone.',
          ar: 'ينبهك عندما تبتعد عيناك عن الطريق لفترة طويلة، غالبا عند النظر إلى الهاتف.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'speed-warning',
        label: 'Speed Warning',
        section: 'DRIVER SAFETY MONITORING',
        description: {
          en: 'Sounds an alert when you exceed the speed you set with the - and + buttons. Sensitivity controls how insistently it nags.',
          ar: 'يصدر تنبيها عند تجاوز السرعة التي تضبطها بزري - و +. الحساسية تحدد مدى إلحاح التنبيه.',
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
        label: 'Cruise Mode Switch',
        description: {
          en: 'Adaptive Cruise Control holds your set speed but also keeps a gap to the vehicle ahead, slowing and accelerating for you. Constant Speed Cruise Control is the traditional kind: it holds the speed you set and nothing more, so you brake yourself.',
          ar: 'مثبت السرعة التكيفي يحافظ على سرعتك المضبوطة ويحافظ أيضا على مسافة من السيارة أمامك، فيبطئ ويسرع نيابة عنك. المثبت الثابت هو النوع التقليدي: يحافظ على السرعة فقط وتتولى أنت الفرملة.',
        },
        status: EGYPT,
        control: choice(['Adaptive', 'Constant Speed'], 0),
      },
      {
        id: 'leading-vehicle',
        label: 'Leading Vehicle Departure Alert',
        section: 'INTELLIGENT DRIVER ASSISTANCE',
        description: {
          en: 'When you are stopped in traffic and the car in front pulls away without you noticing, the system prompts you to move. A small feature that saves a lot of horn from behind.',
          ar: 'عندما تكون متوقفا في الزحام وتتحرك السيارة أمامك دون أن تنتبه، ينبهك النظام للتحرك. ميزة صغيرة توفر عليك كثيرا من الكلاكس من الخلف.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'elk',
        label: 'Emergency Lane Keeping Assist',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Steers the car back into its lane, but only when drifting out would cause a collision: with an oncoming vehicle, a vehicle alongside you, or off the edge of the road. It stays out of the way the rest of the time.',
          ar: 'يعيد السيارة إلى مسارها، لكن فقط عندما يؤدي الانحراف إلى اصطدام: بسيارة قادمة، أو سيارة بجوارك، أو الخروج عن حافة الطريق. وفيما عدا ذلك لا يتدخل.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'rba',
        label: 'Reverse Brake Assist',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Brakes automatically while you are reversing if it detects an obstacle behind you or a vehicle crossing your path. Valuable when backing out of a parking space with poor visibility.',
          ar: 'يفرمل تلقائيا أثناء الرجوع للخلف إذا اكتشف عائقا خلفك أو سيارة تعبر مسارك. مفيد عند الخروج من مكان ركن ضعيف الرؤية.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'fcw',
        label: 'Forward Collision Warning Assist',
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
        label: 'Forward Collision Warning Sensitivity',
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
        control: choice(['Early', 'Medium', 'Late'], 2),
      },
      {
        id: 'ldw',
        label: 'Lane Departure Warning',
        section: 'SAFETY ASSISTANCE',
        description: {
          en: 'Alerts you when you cross a lane line without signalling. The third option adds a gentle steering correction to nudge you back.',
          ar: 'ينبهك عند عبور خط الحارة دون إشارة. الخيار الثالث يضيف تصحيحا خفيفا في التوجيه لإعادتك للمسار.',
        },
        egyptTip: {
          en: 'On most Egyptian roads the lane markings are faint, repainted at odd angles, or simply ignored, so the system warns and tugs at the wheel constantly with no real lane to keep you in. Off is the practical setting here; turn it back on abroad where the markings can be trusted.',
          ar: 'في معظم الطرق المصرية تكون علامات الحارات باهتة أو معاد رسمها بزوايا غريبة أو متجاهلة تماما، فيظل النظام ينبه ويشد الدركسيون بلا حارة حقيقية. الإيقاف هو الخيار العملي هنا، وأعده للعمل في الخارج حيث يمكن الوثوق بالعلامات.',
        },
        status: EGYPT,
        control: choice(['Off', 'Warning Only', 'Warning + Steering Assist'], 0),
      },
    ],
  },
  {
    id: 'lighting',
    icon: 'lightbulb',
    index: 4,
    name: { en: 'Lighting', ar: 'الإضاءة' },
    subtitle: {
      en: 'Split into two tabs: Interior Lights and Exterior Lights',
      ar: 'مقسمة إلى تبويبين: الإضاءة الداخلية والإضاءة الخارجية',
    },
    controls: [
      {
        id: 'ambient-mode',
        label: 'On / Theme / Music Rhythm / Custom',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'How the ambient lighting chooses its colour. Theme follows a preset scheme, Music Rhythm pulses in time with whatever is playing, and Custom lets you pick the colour yourself.',
          ar: 'كيف تختار الإضاءة المحيطة لونها. الثيم يتبع نمطا جاهزا، وإيقاع الموسيقى ينبض مع ما يعمل حاليا، والمخصص يتيح لك اختيار اللون بنفسك.',
        },
        status: EGYPT,
        control: choice(['On', 'Theme', 'Music Rhythm', 'Custom'], 0),
      },
      {
        id: 'ambient-colour',
        label: 'Ambient Lighting',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'The colour spectrum. Drag the circle anywhere across it to set the cabin colour, and use My Favorites below to store the ones you return to.',
          ar: 'طيف الألوان. اسحب الدائرة في أي مكان عليه لضبط لون الكابينة، واستخدم المفضلة بالأسفل لحفظ الألوان التي تعود إليها.',
        },
        status: EGYPT,
        control: action('Open colour picker', 'My Favorites'),
      },
      {
        id: 'ambient-brightness',
        label: 'Brightness',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'Intensity of the ambient lights. Worth lowering at night so the reflections in the windscreen do not distract you.',
          ar: 'شدة الإضاءة المحيطة. يفضل خفضها ليلا حتى لا تشتتك الانعكاسات على الزجاج الأمامي.',
        },
        status: EGYPT,
        control: choice(['Low', 'Medium', 'High'], 1),
      },
      {
        id: 'ambient-effect',
        label: 'Ambient Light Effect',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'Always On holds a steady colour; Breathing fades slowly in and out. The ceiling lights stay steady either way, as they do not support the breathing effect.',
          ar: 'الوضع الدائم يثبت اللون، ووضع التنفس يخفت ويسطع ببطء. إضاءة السقف تبقى ثابتة في الحالتين لأنها لا تدعم تأثير التنفس.',
        },
        status: EGYPT,
        control: choice(['Always On', 'Breathing'], 0),
      },
      {
        id: 'ambient-zones',
        label: 'Ambient Lighting Zones - Dome Light',
        section: 'INTERIOR LIGHTS',
        description: {
          en: 'Includes or excludes the roof lighting from the ambient colour scheme.',
          ar: 'يضم إضاءة السقف إلى نظام ألوان الإضاءة المحيطة أو يستبعدها منه.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'dome',
        label: 'Auto Dome Light',
        section: 'SCENE EFFECTS',
        description: {
          en: 'The interior light comes on by itself when you unlock the car or open a door, and fades out once you are moving.',
          ar: 'تضيء الإضاءة الداخلية تلقائيا عند فتح السيارة أو فتح باب، وتخفت بعد التحرك.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'ambient-alert',
        label: 'Ambient Lighting Alert',
        section: 'SCENE EFFECTS',
        description: {
          en: 'The ambient strips flash to reinforce a safety warning, for example when a vehicle is in your blind spot as you signal. A warning you catch in your peripheral vision rather than one you have to look for.',
          ar: 'تومض شرائط الإضاءة لتأكيد تحذير السلامة، مثل وجود سيارة في النقطة العمياء أثناء إعطاء الإشارة. تحذير تلتقطه بطرف عينك بدل البحث عنه.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'welcome',
        label: 'Welcome Ambient Lighting',
        section: 'SCENE EFFECTS',
        description: {
          en: 'A short lighting sequence that plays as you unlock and approach the car.',
          ar: 'تسلسل إضاءة قصير يعمل عند فتح السيارة والاقتراب منها.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'find-car',
        label: 'Find My Car',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'Flashes the exterior lights for the chosen length of time so you can spot the car. Genuinely handy in a large mall garage; pair it with the key fob button on the Vehicle Settings page.',
          ar: 'تومض الأضواء الخارجية للمدة المختارة حتى تجد سيارتك. مفيد فعلا في جراج مول كبير، واربطه بزر الريموت من صفحة إعدادات السيارة.',
        },
        status: EGYPT,
        control: choice(['Off', '15s', '30s', '60s', '120s'], 2),
      },
      {
        id: 'follow-me',
        label: 'Follow Me Home Lights',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'The headlights stay on for the selected time after you lock the car, lighting your way to the door. Useful on an unlit driveway or in a compound.',
          ar: 'تبقى المصابيح الأمامية مضاءة للمدة المختارة بعد قفل السيارة لتنير طريقك إلى الباب. مفيد في ممر غير مضاء أو داخل كمبوند.',
        },
        status: EGYPT,
        control: choice(['Off', '15s', '30s', '60s', '120s'], 1),
      },
      {
        id: 'turn-signal',
        label: 'Turn Signal Blink',
        section: 'EXTERIOR LIGHTS',
        description: {
          en: 'How many times the indicator flashes when you tap the stalk lightly without holding it, the lane-change signal. Higher numbers give other drivers longer to notice you.',
          ar: 'عدد ومضات الإشارة عند لمس الذراع لمسة خفيفة دون تثبيته، أي إشارة تغيير الحارة. الأرقام الأعلى تعطي السائقين الآخرين وقتا أطول لملاحظتك.',
        },
        status: EGYPT,
        control: choice(['3', '5', '7'], 0),
      },
    ],
  },
  {
    id: 'energy',
    icon: 'energy',
    index: 5,
    name: { en: 'Energy', ar: 'الطاقة' },
    subtitle: {
      en: 'The most important section in the car. Two tabs: Charging and Discharging',
      ar: 'أهم قسم في السيارة. تبويبان: الشحن والتفريغ',
    },
    controls: [
      {
        id: 'charge-limit',
        label: 'Charge Limit',
        section: 'CHARGING',
        description: {
          en: 'The green bar sets how full the battery will charge, with markers for Daily and Trip. Daily stops short of full; Trip charges all the way for a long journey.',
          ar: 'الشريط الأخضر يحدد مدى امتلاء البطارية عند الشحن، مع علامتين للاستخدام اليومي والرحلات. اليومي يتوقف قبل الامتلاء، والرحلة تشحن بالكامل.',
        },
        egyptTip: {
          en: 'The V27 uses an LFP battery, which is happy being charged to 100%. A full charge about once a month actually helps the car read the remaining charge accurately, so you do not need to baby it at 80%.',
          ar: 'تستخدم V27 بطارية LFP التي لا تتأثر بالشحن حتى 100%. الشحن الكامل مرة شهريا يساعد السيارة على قراءة الشحن المتبقي بدقة، فلا داعي للتوقف عند 80%.',
        },
        status: EGYPT,
        control: choice(['Daily', 'Trip'], 0),
      },
      {
        id: 'fuel-cap',
        label: 'Fuel Cap Unlock',
        section: 'CHARGING',
        description: {
          en: 'Releases the fuel filler flap for the petrol that feeds the range extender.',
          ar: 'يفتح غطاء خزان الوقود الذي يغذي محرك المدى الممتد.',
        },
        status: EGYPT,
        control: action('Unlock'),
      },
      {
        id: 'range-display',
        label: 'Driving Range Display',
        section: 'CHARGING',
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
        label: 'Slow Charging Current Limit',
        section: 'CHARGING RESTRICTION',
        description: {
          en: 'Caps the current the car will draw when AC charging. Lowering it makes charging slower but gentler on the supply.',
          ar: 'يحد من التيار الذي تسحبه السيارة عند الشحن المتردد. خفضه يجعل الشحن أبطأ لكن أرفق بمصدر الكهرباء.',
        },
        status: EGYPT,
        control: choice(['6 A', '10 A', '13 A', '16 A'], 3),
      },
      {
        id: 'scheduled-charging',
        label: 'Scheduled Charging',
        section: 'CHARGING RESTRICTION',
        description: {
          en: 'Sets a window during which the car will charge, for example 00:00 to 01:00, so you can plug in when you arrive home but only draw power during off-peak hours.',
          ar: 'يحدد فترة زمنية تشحن فيها السيارة، مثلا من 00:00 إلى 01:00، حتى توصل الكابل عند وصولك للمنزل لكن تسحب الكهرباء في ساعات انخفاض الاستهلاك فقط.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'stationary-charge',
        label: 'Stationary Charging - Start Engine to Charge',
        section: 'CHARGING RESTRICTION',
        description: {
          en: 'Runs the petrol range extender while the car is parked so it can recharge the battery without a charging point. Useful where there is nowhere to plug in.',
          ar: 'يشغل محرك المدى الممتد والسيارة متوقفة لشحن البطارية دون نقطة شحن. مفيد حيث لا يوجد مكان للتوصيل.',
        },
        warning: {
          en: 'Never use Stationary Charging in a closed garage, basement car park or any enclosed space. The engine is running and producing exhaust fumes exactly as a petrol car would. Outdoors only, and away from open windows.',
          ar: 'لا تستخدم الشحن أثناء الوقوف أبدا في جراج مغلق أو بدروم أو أي مكان مغلق. المحرك يعمل وينتج عوادم تماما مثل سيارة بنزين. في الهواء الطلق فقط وبعيدا عن النوافذ المفتوحة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'ac-connector',
        label: 'Auto Unlock AC Charging Connector',
        section: 'CHARGING RESTRICTION',
        description: {
          en: 'Releases the charging cable automatically once charging is complete, so you can simply pull it out when you return.',
          ar: 'يحرر كابل الشحن تلقائيا بعد اكتمال الشحن حتى تسحبه ببساطة عند عودتك.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'preconditioning',
        label: 'Manual Battery Preconditioning',
        section: 'CHARGING RESTRICTION',
        description: {
          en: 'Brings the battery to its ideal temperature before charging, so it accepts power at the fastest rate it safely can. Start it around twenty minutes before you reach a fast charger.',
          ar: 'يجهز البطارية لدرجة حرارتها المثالية قبل الشحن حتى تستقبل الطاقة بأسرع معدل آمن. شغله قبل الوصول لشاحن سريع بنحو عشرين دقيقة.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'energy-mode',
        label: 'Energy Mode',
        section: 'ENERGY MODE',
        description: {
          en: 'Where you tell the car how to balance battery and petrol: Hybrid, Fuel Priority or Electric Priority.',
          ar: 'هنا تخبر السيارة كيف توازن بين البطارية والبنزين: هجين، أولوية الوقود، أو أولوية الكهرباء.',
        },
        egyptTip: {
          en: 'Home charging is not an option for many owners in Egypt. The V27 never has to be plugged in, and Fuel Priority is the everyday mode for that case: the generator keeps the battery in a working band so the motors always have power to draw on.',
          ar: 'الشحن المنزلي غير متاح لكثير من الملاك في مصر. V27 لا تحتاج للتوصيل إطلاقا، وأولوية الوقود هي الوضع اليومي في هذه الحالة: يبقي المولد البطارية في نطاق تشغيلي حتى تجد المواتير طاقة دائما.',
        },
        status: EGYPT,
        control: choice(['Hybrid', 'Fuel Priority', 'Electric Priority'], 0),
      },
      {
        id: 'force-range-extender',
        label: 'Force Range Extender',
        section: 'ENERGY MODE',
        description: {
          en: 'Not a fourth mode but a toggle that layers on top of the one you chose: the car keeps your strategy while the generator works harder to build charge instead of merely holding it steady. It burns more fuel while active and the engine is audible.',
          ar: 'ليس وضعا رابعا بل مفتاح يعمل فوق الوضع الذي اخترته: تحتفظ السيارة باستراتيجيتك بينما يعمل المولد بجهد أكبر لبناء شحن بدل الحفاظ عليه فقط. يستهلك وقودا أكثر أثناء عمله ويكون صوت المحرك مسموعا.',
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
          en: 'With the external power cable plugged in the V27 supplies 220V AC, enough to run lights, a fridge, tools or a coffee machine. This sets how far the battery is allowed to drain before the car cuts the supply, so you do not return to a flat car.',
          ar: 'بتوصيل كابل الطاقة الخارجية تعطي V27 تيارا مترددا 220 فولت يكفي لتشغيل إضاءة أو ثلاجة أو عدد أو ماكينة قهوة. هذا الإعداد يحدد إلى أي مدى يسمح بتفريغ البطارية قبل أن تقطع السيارة التغذية حتى لا تعود لسيارة فارغة.',
        },
        status: EGYPT,
        control: choice(['20%', '30%', '50%'], 1),
      },
      {
        id: 'fuel-power',
        label: 'Fuel-Based Power Supply',
        section: 'DISCHARGING',
        description: {
          en: 'When the battery reaches that limit the range extender starts and keeps generating, so the power supply continues from petrol. In effect your car becomes a quiet generator with a very large fuel tank.',
          ar: 'عند وصول البطارية لذلك الحد يعمل محرك المدى الممتد ويستمر في التوليد فتستمر التغذية من البنزين. عمليا تتحول سيارتك إلى مولد هادئ بخزان وقود كبير جدا.',
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
    name: { en: 'Voice', ar: 'الصوت' },
    subtitle: {
      en: 'The voice assistant, woken by saying "Hello iCAUR"',
      ar: 'المساعد الصوتي الذي يستيقظ بقول "Hello iCAUR"',
    },
    controls: [
      {
        id: 'conversation',
        label: 'Conversation Duration',
        description: {
          en: 'How long the assistant keeps listening after it answers, so you can give a follow-up command without repeating the wake word. Off means every command needs "Hello iCAUR" first.',
          ar: 'المدة التي يظل فيها المساعد مستمعا بعد الرد، حتى تعطي أمرا إضافيا دون تكرار كلمة التنبيه. الإيقاف يعني أن كل أمر يحتاج "Hello iCAUR" أولا.',
        },
        status: EGYPT,
        control: choice(['Off', '10s', '15s', '20s'], 1),
      },
      {
        id: 'source-localization',
        label: 'Sound Source Localization',
        description: {
          en: 'Which seat the microphones listen to. Driver Seat means only the driver can issue commands, worth setting if passengers or children keep waking the assistant by accident. Auto works out who spoke and responds to them.',
          ar: 'المقعد الذي تستمع إليه الميكروفونات. خيار مقعد السائق يعني أن السائق وحده يصدر الأوامر، وهو مفيد إذا كان الركاب أو الأطفال يوقظون المساعد بالخطأ. والوضع التلقائي يحدد من تكلم ويرد عليه.',
        },
        status: EGYPT,
        control: choice(['Off', 'Driver Seat', 'Auto'], 2),
      },
      {
        id: 'voice-assistant',
        label: 'Voice Assistant',
        description: {
          en: 'Turns the assistant on or off entirely. The button beside it plays a sample of the wake word.',
          ar: 'يشغل المساعد أو يوقفه تماما. الزر بجواره يشغل عينة من كلمة التنبيه.',
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
      en: 'Time, language, time zone and screen cleaning',
      ar: 'الوقت، اللغة، المنطقة الزمنية، وتنظيف الشاشة',
    },
    controls: [
      {
        id: 'time-display',
        label: 'Time Display',
        description: {
          en: 'Clock format on the screen and instrument cluster.',
          ar: 'صيغة الساعة على الشاشة ولوحة العدادات.',
        },
        status: EGYPT,
        control: choice(['12-Hour', '24-Hour'], 1),
      },
      {
        id: 'language-settings',
        label: 'Language Settings',
        description: {
          en: 'The interface language for the whole system. A full Arabic interface is available, and every menu in this guide appears in Arabic once it is selected.',
          ar: 'لغة الواجهة للنظام كله. تتوفر واجهة عربية كاملة، وكل القوائم في هذا الدليل تظهر بالعربية بمجرد اختيارها.',
        },
        status: EGYPT,
        control: choice(['English', 'العربية'], 0),
      },
      {
        id: 'timezone',
        label: 'Time Zone Settings',
        description: {
          en: 'Should read (UTC+3:00) Cairo in Egypt.',
          ar: 'يجب أن يكون (UTC+3:00) القاهرة في مصر.',
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
        label: 'Screen Cleaning',
        description: {
          en: 'Temporarily locks the touchscreen so you can wipe it without pressing things by accident.',
          ar: 'يقفل الشاشة مؤقتا حتى تمسحها دون الضغط على شيء بالخطأ.',
        },
        warning: {
          en: 'Use a soft microfibre cloth, dry or very slightly damp. Never use glass cleaner or anything with alcohol in it, which strips the screen’s anti-glare coating.',
          ar: 'استخدم قطعة ميكروفايبر ناعمة جافة أو مبللة قليلا جدا. لا تستخدم أبدا منظف زجاج أو أي مادة بها كحول لأنها تزيل طبقة مقاومة الانعكاس.',
        },
        status: EGYPT,
        control: action('Lock screen'),
      },
    ],
  },
  {
    id: 'sound',
    icon: 'volume',
    index: 8,
    name: { en: 'Sound', ar: 'الصوتيات' },
    subtitle: {
      en: 'Audio tuning, the individual volume levels, and the car’s own alert sounds',
      ar: 'ضبط الصوت، مستويات الصوت المنفصلة، وأصوات تنبيهات السيارة',
    },
    controls: [
      {
        id: 'sound-mode',
        label: 'Sound Mode',
        description: {
          en: 'Where the audio is aimed. Private keeps it close to the front so a sleeping passenger in the back is less disturbed, DriverCentric focuses the stage on the driver’s seat, and Whole Cabin fills the car evenly.',
          ar: 'وجهة الصوت. الوضع الخاص يبقيه قريبا من الأمام حتى لا ينزعج راكب نائم في الخلف، والوضع المركز على السائق يوجه الصوت لمقعده، ووضع الكابينة الكاملة يوزعه بالتساوي.',
        },
        status: EGYPT,
        control: choice(['Private', 'DriverCentric', 'Whole Cabin'], 2),
      },
      {
        id: 'sound-effects',
        label: 'Sound Effects',
        description: {
          en: 'Preset audio characters. Standard is neutral; Concert Hall adds reverberation; Subwoofer emphasises bass.',
          ar: 'أنماط صوتية جاهزة. القياسي محايد، وقاعة الحفلات تضيف صدى، والسب ووفر يبرز الصوت المنخفض.',
        },
        status: EGYPT,
        control: choice(['Standard', 'Surround', 'Concert Hall', 'Subwoofer'], 0),
      },
      {
        id: 'soundstage',
        label: 'Soundstage - Sound Field & Equalizer',
        description: {
          en: 'Sound Field positions the focal point of the audio within the cabin. Equalizer opens manual control over the frequency balance if the presets do not suit you.',
          ar: 'المجال الصوتي يحدد نقطة تركيز الصوت داخل الكابينة، والموازن يفتح تحكما يدويا في توازن الترددات إذا لم تناسبك الأنماط الجاهزة.',
        },
        status: EGYPT,
        control: action('Sound Field', 'Equalizer'),
      },
      {
        id: 'volume-sliders',
        label: 'Volume',
        section: 'VOLUME',
        description: {
          en: 'Five independent sliders: Media, Navigation, Voice, Call, and Alarm Sounds & Engine Sound. Setting navigation prompts a little above your music means you hear the turn instruction without reaching for the volume every time.',
          ar: 'خمسة أشرطة مستقلة: الوسائط، الملاحة، الصوت، المكالمات، وأصوات التنبيه وصوت المحرك. ضبط تنبيهات الملاحة أعلى قليلا من الموسيقى يجعلك تسمع تعليمات الانعطاف دون تغيير مستوى الصوت في كل مرة.',
        },
        status: EGYPT,
        control: action('Media', 'Navigation', 'Voice', 'Call', 'Alarm & Engine'),
      },
      {
        id: 'call-notice',
        label: 'Incoming Call Notification',
        description: {
          en: 'How the car announces a call. Voice Announce reads out who is calling, which keeps your eyes on the road.',
          ar: 'كيف تعلن السيارة عن مكالمة واردة. الإعلان الصوتي ينطق اسم المتصل فتبقى عيناك على الطريق.',
        },
        status: EGYPT,
        control: choice(['Off', 'Voice Announce', 'Ringtone'], 1),
      },
      {
        id: 'pedestrian',
        label: 'Low-speed Pedestrian Reminder',
        description: {
          en: 'Electric cars are nearly silent at low speed, so the V27 plays a sound through an external speaker to warn pedestrians it is moving. This chooses which sound. It cannot be switched off, and it should not be: in crowded streets and car parks it is the only warning people get that you are there.',
          ar: 'السيارات الكهربائية شبه صامتة عند السرعات المنخفضة، لذلك تشغل V27 صوتا عبر سماعة خارجية لتنبيه المشاة أنها تتحرك. هنا تختار الصوت. لا يمكن إيقافه ولا ينبغي ذلك: في الشوارع المزدحمة والجراجات هو التحذير الوحيد الذي يصل للناس.',
        },
        status: EGYPT,
        control: choice(['Starry Sky', 'Wind Chant', 'Engine'], 0),
      },
      {
        id: 'touch-sound',
        label: 'Touchscreen Sound Effects',
        section: 'SMART SOUND EFFECTS',
        description: {
          en: 'The click you hear when tapping the screen.',
          ar: 'صوت النقر الذي تسمعه عند لمس الشاشة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'tone',
        label: 'Notification Tone',
        section: 'SMART SOUND EFFECTS',
        description: {
          en: 'The chime for system messages and alerts.',
          ar: 'نغمة رسائل النظام والتنبيهات.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'speed-volume',
        label: 'Speed-dependent Volume Compensation',
        section: 'SMART SOUND EFFECTS',
        description: {
          en: 'Raises the volume gradually as you go faster to compensate for road and wind noise, and lowers it again as you slow down. Leave it on and you will stop fiddling with the volume knob.',
          ar: 'يرفع مستوى الصوت تدريجيا مع زيادة السرعة لتعويض ضجيج الطريق والهواء، ويخفضه عند الإبطاء. اتركه مفعلا وستتوقف عن العبث بمستوى الصوت.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'door-volume',
        label: 'Door Open Volume Reduction',
        section: 'SMART SOUND EFFECTS',
        description: {
          en: 'Drops the volume automatically when a door is opened, so you do not blast the street or the person you have stopped to greet.',
          ar: 'يخفض مستوى الصوت تلقائيا عند فتح أي باب، حتى لا تزعج الشارع أو الشخص الذي توقفت لتحيته.',
        },
        status: EGYPT,
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
      en: 'Wi-Fi, Bluetooth, CarPlay and Android Auto',
      ar: 'واي فاي، بلوتوث، كاربلاي، وأندرويد أوتو',
    },
    controls: [
      {
        id: 'wifi',
        label: 'Wi-Fi',
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
        description: {
          en: 'Pairs phones for calls and audio. The name shown beneath it is what your phone will see when searching for the car.',
          ar: 'يقرن الهواتف للمكالمات والصوت. الاسم الظاهر أسفله هو ما سيراه هاتفك عند البحث عن السيارة.',
        },
        status: EGYPT,
        control: toggle(true),
      },
      {
        id: 'carplay-aa',
        label: 'Apple CarPlay / Android Auto',
        description: {
          en: 'Mirrors your phone’s maps, music and messages onto the car’s screen. The entry shows which device is connected, or "Not Connected".',
          ar: 'ينقل خرائط هاتفك وموسيقاه ورسائله إلى شاشة السيارة. يعرض السطر الجهاز المتصل أو "غير متصل".',
        },
        egyptTip: {
          en: 'If CarPlay drops out repeatedly, try a different cable before anything else. It is the cause more often than not.',
          ar: 'إذا انقطع كاربلاي بشكل متكرر، جرب كابلا آخر قبل أي شيء. هذا هو السبب في أغلب الحالات.',
        },
        status: EGYPT,
        control: action('Add new device'),
      },
    ],
  },
  {
    id: 'safety-service',
    icon: 'service',
    index: 10,
    name: { en: 'Safety & Service', ar: 'السلامة والخدمة' },
    subtitle: {
      en: 'Maintenance and workshop functions. Most owners visit this page rarely, but when you need it, you need it',
      ar: 'وظائف الصيانة والورشة. معظم الملاك يزورون هذه الصفحة نادرا، لكن عند الحاجة إليها تكون ضرورية',
    },
    controls: [
      {
        id: 'towing',
        label: 'Towing Mode',
        description: {
          en: 'Prepares the vehicle to be moved by a recovery truck without the car’s own systems resisting or the alarm sounding.',
          ar: 'يجهز السيارة لنقلها بونش دون أن تقاوم أنظمتها أو ينطلق جرس الإنذار.',
        },
        warning: {
          en: 'Check the exact procedure in your owner’s manual before the car is loaded, as the requirements differ depending on whether it is towed or carried on a flatbed.',
          ar: 'راجع الإجراء الدقيق في دليل المالك قبل تحميل السيارة، فالمتطلبات تختلف بين السحب والنقل على سطح مستو.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'exhaust',
        label: 'Exhaust Gas Detection',
        description: {
          en: 'Puts the vehicle into the state required for the annual emissions test, so the range extender runs as the inspection equipment expects. Turn it on at the testing centre and off again afterwards.',
          ar: 'يضع السيارة في الحالة المطلوبة لاختبار العوادم السنوي حتى يعمل محرك المدى الممتد كما تتوقع أجهزة الفحص. شغله في مركز الفحص وأوقفه بعده.',
        },
        egyptTip: {
          en: 'This is the setting to remember at your annual licence renewal inspection. Because the petrol engine in an EREV does not run continuously, testing centres can struggle to get a reading without it, and an inspector unfamiliar with the car may tell you the vehicle has failed when it simply was not in the right mode.',
          ar: 'هذا هو الإعداد الذي يجب تذكره عند فحص تجديد الرخصة السنوي. لأن محرك البنزين في سيارة المدى الممتد لا يعمل باستمرار، قد يصعب على مراكز الفحص أخذ قراءة بدونه، وقد يخبرك فاحص غير معتاد على السيارة أنها رسبت بينما هي فقط لم تكن في الوضع الصحيح.',
        },
        status: EGYPT,
        control: toggle(false),
      },
      {
        id: 'wiper-maintenance',
        label: 'Front Wiper Maintenance / Rear Wiper Maintenance',
        description: {
          en: 'Moves the wiper arms into the service position so you can lift them off the glass to change blades or clear them. Only works with the car in P or N and the wipers and washer switched off.',
          ar: 'ينقل أذرع المساحات إلى وضع الخدمة حتى ترفعها عن الزجاج لتغيير الريش أو تنظيفها. يعمل فقط والسيارة في P أو N والمساحات والرشاش متوقفة.',
        },
        status: EGYPT,
        control: action('Front wipers', 'Rear wiper'),
      },
      {
        id: 'power-off',
        label: 'Power Off',
        description: {
          en: 'Shuts the vehicle down completely. The car must be powered on, stationary and in P. Use it when you want everything genuinely off rather than in standby.',
          ar: 'يطفئ السيارة تماما. يجب أن تكون السيارة مشغلة ومتوقفة وفي وضع P. استخدمه عندما تريد إطفاء كل شيء فعليا بدل وضع الاستعداد.',
        },
        status: EGYPT,
        control: action('Power off'),
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
    menuId: 'vehicle-settings',
    controlId: 'wiper-sensitivity',
    setTo: 'Low',
    why: {
      en: 'Dust triggers sensitive rain sensors; dry wiping scratches glass.',
      ar: 'الأتربة تشغل حساس المطر الحساس، والمسح الجاف يخدش الزجاج.',
    },
  },
  {
    menuId: 'vehicle-settings',
    controlId: 'key-fob-custom',
    setTo: 'A/C On',
    why: { en: 'Cool the cabin before you get in.', ar: 'تبريد الكابينة قبل أن تركب.' },
  },
  {
    menuId: 'vehicle-settings',
    controlId: 'lock-driving',
    setTo: 'On',
    why: { en: 'Doors secured in city traffic.', ar: 'تأمين الأبواب في زحام المدينة.' },
  },
  {
    menuId: 'vehicle-settings',
    controlId: 'reverse-tilt',
    setTo: 'On',
    why: { en: 'Protects wheels against high kerbs.', ar: 'يحمي الجنوط من الأرصفة المرتفعة.' },
  },
  {
    menuId: 'driver-assistance-settings',
    controlId: 'autohold',
    setTo: 'On',
    why: {
      en: 'Removes the strain of stop-and-go traffic.',
      ar: 'يخفف إرهاق القيادة في الزحام المتقطع.',
    },
  },
  {
    menuId: 'driver-assistance-settings',
    controlId: 'esc',
    setTo: 'On',
    why: {
      en: 'Leave on unless freeing the car from sand.',
      ar: 'اتركه مفعلا إلا عند تحرير السيارة من الرمال.',
    },
  },
  {
    menuId: 'driver-assistance-settings',
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
    setTo: 'On - Late',
    why: {
      en: 'Stays useful instead of crying wolf in close traffic.',
      ar: 'يظل مفيدا بدل التنبيه المستمر في الزحام القريب.',
    },
  },
  {
    menuId: 'adas',
    controlId: 'ldw',
    setTo: 'Off',
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

/** Tiles on the simulated home screen. */
export type HomeTile = {
  id: string
  label: Localized
  icon: MenuIcon | 'nav' | 'media' | 'phone' | 'camera'
  /** Opens a settings group. */
  menuId?: string
  /** Opens a full-screen app instead of a settings group. */
  appId?: 'navigation' | 'camera'
  /** Shown under the tile label. */
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
    menuId: 'vehicle-settings',
  },
  {
    id: 'energy',
    icon: 'energy',
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
    id: 'adas',
    icon: 'radar',
    label: { en: 'ADAS', ar: 'أنظمة ADAS' },
    detail: { en: 'Cruise and active safety', ar: 'المثبت والسلامة الفعالة' },
    menuId: 'adas',
  },
  {
    id: 'service',
    icon: 'service',
    label: { en: 'Safety & Service', ar: 'السلامة والخدمة' },
    detail: { en: 'Towing, emissions test', ar: 'السحب، فحص العوادم' },
    menuId: 'safety-service',
  },
]

export const DRIVE_MODES = ['Eco', 'Comfort', 'Sport', 'Off-road'] as const
export type DriveMode = (typeof DRIVE_MODES)[number]

/** The assistant's wake word, per the guide. */
export const WAKE_WORD = 'Hello iCAUR'
