// Generated from the bilingual owner-guide research set. Edit content here.
import type { Feature } from './types'

export const features: Feature[] = [
  {
    id: "vehicle-control",
    slug: "vehicle-control",
    categoryId: "screen",
    name: { en: "Vehicle Control menu", ar: "قائمة التحكم في السيارة" },
    summary: { en: "Brings together door, window, mirror, lock, and some comfort settings depending on equipment.", ar: "تجمع إعدادات الأبواب، النوافذ، المرايات، القفل، وبعض وظائف الراحة حسب التجهيز." },
    location: { en: "Home screen, inside the vehicle settings.", ar: "الشاشة الرئيسية داخل إعدادات السيارة." },
    screenPath: ["Home","Vehicle","Vehicle Control"],
    steps: {
      en: [
        "Open the home screen.",
        "Enter Vehicle or the car icon.",
        "Select Vehicle Control.",
        "Change the setting you need and watch for the confirmation message on the screen.",
      ],
      ar: [
        "افتح الشاشة الرئيسية.",
        "ادخل إلى Vehicle أو أيقونة السيارة.",
        "اختر Vehicle Control.",
        "غير الإعداد المطلوب ثم راقب رسالة التأكيد على الشاشة.",
      ],
    },
    requirements: {
      en: [
        "The vehicle is in Ready or the correct power mode.",
        "Some settings require the vehicle to be stationary.",
      ],
      ar: [
        "السيارة في وضع Ready أو وضع الطاقة المناسب.",
        "بعض الإعدادات قد تحتاج توقف السيارة.",
      ],
    },
    unavailableWhen: {
      en: [
        "The vehicle is moving, for certain settings.",
        "A fault or the child lock blocks some window functions.",
      ],
      ar: [
        "عند تحرك السيارة في إعدادات معينة.",
        "عند وجود عطل أو قفل حماية للأطفال لبعض وظائف النوافذ.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not adjust door or mirror functions while driving unless it is necessary and can be done safely.",
      ],
      ar: [
        "لا تضبط وظائف الأبواب أو المرايات أثناء القيادة إلا إذا كان الأمر ضروريا وبطريقة آمنة.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["تحكم","أبواب","مرايات","قفل","vehicle control","windows"],
    sourceIds: ["icaur-v27-website-master-brief","icaur-v27-infotainment-settings-guide-en-ar","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    videoIds: ["vehicle-controls-and-adas-settings-example"],
    related: ["key","screen-map","mirrors"],
  },
  {
    id: "driver-assistance",
    slug: "driver-assistance",
    categoryId: "adas",
    name: { en: "Driver Assistance", ar: "مساعدة السائق" },
    summary: { en: "Settings for assistance systems such as adaptive cruise, lane support, collision warnings, and parking features.", ar: "صفحة إعدادات أنظمة المساعدة مثل مثبت السرعة التكيفي، المسار، التحذيرات، والركن." },
    location: { en: "Center screen under Driver Assistance.", ar: "الشاشة المركزية ضمن إعدادات Driver Assistance." },
    screenPath: ["Home","Vehicle","Driver Assistance"],
    steps: {
      en: [
        "Open Driver Assistance.",
        "Review each feature before enabling it.",
        "Adjust warning sensitivity where available.",
        "Test cautiously on a safe road.",
      ],
      ar: [
        "ادخل إلى Driver Assistance.",
        "راجع كل وظيفة قبل تشغيلها.",
        "اضبط الحساسية أو التنبيه إذا كان الخيار متاحا.",
        "اختبر الوظيفة في طريق آمن وبسرعة مناسبة.",
      ],
    },
    requirements: {
      en: [
        "Clean cameras and sensors.",
        "Visible lane markings for lane-based systems.",
      ],
      ar: [
        "حساسات وكاميرات نظيفة.",
        "طريق واضح وخطوط حارة مرئية للوظائف المعتمدة على المسار.",
      ],
    },
    unavailableWhen: {
      en: [
        "Heavy rain or dust blocks sensors.",
        "Vehicle speed is outside the feature range.",
        "The feature is not confirmed for the Egypt trim.",
      ],
      ar: [
        "الأمطار الكثيفة أو الأتربة تحجب الحساسات.",
        "السرعة أقل أو أعلى من نطاق تشغيل الوظيفة.",
        "النظام غير مؤكد لتجهيز مصر.",
      ],
    },
    safetyNotes: {
      en: [
        "ADAS supports the driver but does not replace attention. Keep your hands on the wheel and watch the road.",
      ],
      ar: [
        "ADAS يساعدك ولا يستبدل انتباه السائق. أمسك الدركسيون وراقب الطريق دائما.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["adas","lane assist","ACC","مساعدة السائق","حارة","فرامل طوارئ"],
    sourceIds: ["icaur-v27-website-master-brief","icaur-v27-infotainment-settings-guide-en-ar","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    videoIds: ["vehicle-controls-and-adas-settings-example"],
    related: ["auto-park","cameras","tpms"],
  },
  {
    id: "auto-park",
    slug: "auto-park",
    categoryId: "adas",
    name: { en: "Automatic Parking", ar: "الركن الأوتوماتيكي" },
    summary: { en: "Helps detect a parking space and perform a parking maneuver when the feature and conditions are available.", ar: "يساعد السيارة على اكتشاف مكان الركن وتنفيذ المناورة عند توفر الشروط والتجهيز." },
    location: { en: "Parking screen or camera/parking shortcut if fitted.", ar: "من شاشة Parking أو اختصار الكاميرا/الركن إذا كان متاحا." },
    screenPath: ["Home","Parking","Auto Park"],
    steps: {
      en: [
        "Drive slowly beside parking spaces.",
        "Open Parking or Auto Park.",
        "Select the detected space if shown.",
        "Follow screen instructions and stay ready to brake.",
      ],
      ar: [
        "قد بجوار أماكن الركن ببطء.",
        "افتح Parking أو Auto Park.",
        "اختر المكان المكتشف إذا ظهر على الشاشة.",
        "اتبع تعليمات الشاشة واضغط الفرامل عند الحاجة.",
      ],
    },
    requirements: {
      en: [
        "Clean sensors and cameras.",
        "Clear suitable parking space.",
        "Confirmed trim availability.",
      ],
      ar: [
        "حساسات وكاميرات نظيفة.",
        "مكان ركن واضح ومناسب.",
        "تأكيد توفر الوظيفة في Trim السيارة.",
      ],
    },
    unavailableWhen: {
      en: [
        "Incompatible drive mode.",
        "Blocked sensors.",
        "Space is unclear to the system.",
      ],
      ar: [
        "وضع قيادة غير متوافق.",
        "حساسات محجوبة.",
        "مكان الركن غير واضح للنظام.",
      ],
    },
    safetyNotes: {
      en: [
        "Be ready to brake at any moment. Do not rely on auto parking around children or low obstacles.",
      ],
      ar: [
        "كن جاهزا للفرملة في أي لحظة. لا تعتمد على الركن الأوتوماتيكي حول أطفال أو عوائق منخفضة.",
      ],
    },
    availability: {
      play: "not-available",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["ركن","parking","auto park","park assist","ركن اوتوماتيك"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    videoIds: ["automatic-parking-demonstration"],
    related: ["cameras","driver-assistance"],
  },
  {
    id: "cameras",
    slug: "cameras",
    categoryId: "adas",
    name: { en: "Cameras and 540 view", ar: "الكاميرات والرؤية 540" },
    summary: { en: "Shows the area around the vehicle with guide lines to help with parking and tight maneuvers.", ar: "تعرض محيط السيارة وخطوط التوجيه للمساعدة في الركن والمناورات الضيقة." },
    location: { en: "Camera shortcut on the screen, or automatically when reverse is engaged.", ar: "اختصار الكاميرا في الشاشة أو عند تعشيق الرجوع للخلف." },
    screenPath: ["Home","Parking","Camera"],
    steps: {
      en: [
        "Press the camera shortcut or shift to R.",
        "Choose a view angle if the options appear.",
        "Use the dynamic guide lines as a reference while still looking around the vehicle.",
        "Clean the lenses when the image becomes unclear.",
      ],
      ar: [
        "اضغط اختصار الكاميرا أو انقل إلى R.",
        "اختر زاوية العرض إذا ظهرت الخيارات.",
        "استخدم الخطوط الديناميكية كمرجع مع النظر حول السيارة فعليا.",
        "نظف العدسات عند تشوش الصورة.",
      ],
    },
    requirements: {
      en: [
        "Clean cameras.",
        "Low speed in parking modes.",
      ],
      ar: [
        "نظافة الكاميرات.",
        "سرعة منخفضة في أوضاع الركن.",
      ],
    },
    unavailableWhen: {
      en: [
        "A camera is covered with mud or water.",
        "System fault or high screen temperature.",
      ],
      ar: [
        "كاميرا مغطاة بالطين أو مياه.",
        "خلل في النظام أو حرارة عالية للشاشة.",
      ],
    },
    safetyNotes: {
      en: [
        "Cameras do not reveal every obstacle. Confirm with direct vision and the mirrors.",
      ],
      ar: [
        "الكاميرات لا تكشف كل العوائق. تأكد بالنظر المباشر والمرايات.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["كاميرا","360","540","parking camera","رؤية محيطية"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["auto-park","driver-assistance"],
  },
  {
    id: "charging",
    slug: "charging",
    categoryId: "energy",
    name: { en: "Charging", ar: "شحن البطارية" },
    summary: { en: "Explains AC/DC charging behavior, charge-port use, and common conditions that can stop charging.", ar: "يوضح شحن بطارية LFP من التيار المتردد أو السريع حسب المتاح وحالة السيارة." },
    location: { en: "Exterior charge port and the Energy menu on the center screen.", ar: "منفذ الشحن الخارجي وقائمة Energy في الشاشة." },
    screenPath: ["Home","Energy","Charging"],
    steps: {
      en: [
        "Park safely.",
        "Open the charge door.",
        "Connect the correct charging cable.",
        "Check charging status on the screen or port indicator.",
        "Disconnect after charging is complete according to the charger instructions.",
      ],
      ar: [
        "أوقف السيارة في مكان آمن.",
        "افتح باب الشحن.",
        "وصل كابل الشحن المناسب.",
        "تابع حالة الشحن على الشاشة أو مؤشر المنفذ.",
        "افصل الكابل بعد انتهاء الشحن حسب تعليمات الشاحن.",
      ],
    },
    requirements: {
      en: [
        "Compatible charger.",
        "Safe, undamaged cable.",
        "Vehicle parked and secured.",
      ],
      ar: [
        "شاحن متوافق.",
        "الكابل سليم وغير مبلل.",
        "السيارة متوقفة ومؤمنة.",
      ],
    },
    unavailableWhen: {
      en: [
        "Cable is not latched.",
        "Battery temperature is outside the allowed range.",
        "Charging station fault or power outage.",
      ],
      ar: [
        "الكابل غير مقفل جيدا.",
        "حرارة البطارية خارج النطاق.",
        "خلل في محطة الشحن أو انقطاع كهرباء.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not use damaged adapters or wash the charge area while connected.",
      ],
      ar: [
        "لا تستخدم وصلات تالفة. لا تغسل منطقة الشحن أثناء التوصيل.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["شحن","charging","AC","DC","بطارية","charge port"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["reev","v2l"],
  },
  {
    id: "v2l",
    slug: "v2l",
    categoryId: "energy",
    name: { en: "Vehicle-to-Load V2L", ar: "تغذية الأجهزة الخارجية" },
    summary: { en: "Lets you run external devices from the vehicle battery where the equipment and the correct adapter are available.", ar: "تسمح باستخدام طاقة البطارية لتشغيل أجهزة خارجية عند توفر التجهيز والمحول المناسب." },
    location: { en: "Charge port or V2L adapter, depending on the vehicle design.", ar: "منفذ الشحن أو محول V2L حسب تصميم السيارة." },
    screenPath: ["Home","Energy","V2L"],
    steps: {
      en: [
        "Make sure you have the original or an approved V2L adapter.",
        "Park in a safe, well-ventilated place.",
        "Connect the adapter first, then the device.",
        "Watch the power draw and the battery percentage.",
        "Disconnect the devices before removing the adapter.",
      ],
      ar: [
        "تأكد من توفر محول V2L الأصلي أو المعتمد.",
        "أوقف السيارة في مكان جيد التهوية وآمن.",
        "وصل المحول ثم الجهاز.",
        "راقب استهلاك الطاقة ونسبة البطارية.",
        "افصل الأجهزة قبل فصل المحول.",
      ],
    },
    requirements: {
      en: [
        "A suitable V2L adapter.",
        "Sufficient battery level.",
        "Electrical load within the official limit.",
      ],
      ar: [
        "محول V2L مناسب.",
        "مستوى بطارية كاف.",
        "حمل كهربائي داخل الحد المسموح الرسمي.",
      ],
    },
    unavailableWhen: {
      en: [
        "Battery level is low.",
        "The load exceeds the allowed limit.",
        "The vehicle blocks the function to protect the system.",
      ],
      ar: [
        "مستوى البطارية منخفض.",
        "الحمل أعلى من الحد.",
        "السيارة تمنع الوظيفة لحماية النظام.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not run medical equipment or heavy loads without confirming the official V2L capacity.",
      ],
      ar: [
        "لا تشغل أجهزة طبية أو أحمال عالية بدون تأكيد قدرة V2L الرسمية.",
      ],
    },
    availability: {
      play: "verify",
      wild: "likely",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["v2l","كهرباء خارجية","camping","مخيم","external power"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page"],
    related: ["charging","reev"],
  },
  {
    id: "spare-wheel-remove",
    slug: "spare-wheel-remove",
    categoryId: "wheels",
    name: { en: "Spare wheel removal", ar: "فك الاستبن الخلفي" },
    summary: { en: "A safety-first guide to the rear spare wheel location and observed removal workflow, with critical details left unpublished until officially verified.", ar: "دليل آمن لفهم مكان الاستبن وخطوات الفك المرصودة مع إبقاء التفاصيل الحرجة غير منشورة حتى يتم توثيقها رسميا." },
    location: { en: "Rear side-hinged tailgate spare wheel carrier.", ar: "حامل الاستبن على الباب الخلفي الجانبي." },
    steps: {
      en: [
        "Park on firm, level ground and apply the parking brake.",
        "Inspect the spare wheel cover and camera or trim area.",
        "Remove the cover fasteners according to the actual vehicle design.",
        "Use the original vehicle tool kit and security adapter if fitted.",
        "Support the wheel before removing the final carrier bolt.",
        "Pull the spare wheel carefully away from the carrier.",
      ],
      ar: [
        "اركن على أرض ثابتة ومستوية وشغل فرامل التثبيت.",
        "افحص غطاء الاستبن ومنطقة الكاميرا/الكسوة.",
        "فك مثبتات الغطاء حسب التصميم الفعلي.",
        "استخدم عدة السيارة ومفتاح الأمان إذا كان موجودا.",
        "اسند العجلة قبل فك آخر مسمار حامل.",
        "اسحب العجلة بعناية بعيدا عن الحامل.",
      ],
    },
    requirements: {
      en: [
        "Original vehicle tool kit.",
        "Security wheel adapter if supplied with the vehicle.",
        "Official source before publishing wheel torque or jack points.",
      ],
      ar: [
        "عدة السيارة الأصلية.",
        "مفتاح أمان صواميل العجل إذا كان مزودا.",
        "مصدر رسمي قبل نشر عزم الربط أو نقاط الرفع.",
      ],
    },
    unavailableWhen: {
      en: [
        "The security adapter is missing.",
        "Cover fasteners are damaged.",
        "The vehicle is parked in an unsafe place or on unstable ground.",
      ],
      ar: [
        "فقدان مفتاح الأمان.",
        "تلف مثبتات الغطاء.",
        "السيارة في مكان غير آمن أو أرض غير ثابتة.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not publish torque values or lifting points without the official owner manual.",
        "Never go under the vehicle while it is supported only by the jack.",
      ],
      ar: [
        "لا تنشر عزم ربط أو نقطة رفع بدون دليل مالك رسمي. لا تدخل تحت السيارة وهي مرفوعة بالكوريك فقط.",
      ],
    },
    availability: {
      play: "verify",
      wild: "verify",
      china: "confirmed-export",
      exportOther: "verify",
    },
    lastVerified: "2026-09-22",
    keywords: ["استبن","spare","spare wheel","عجلة احتياطية","كاوتش","فك الاستبن"],
    sourceIds: ["icaur-v27-website-master-brief"],
    videoIds: ["spare-wheel-removal-demonstration"],
    related: ["tire-change","tpms"],
  },
  {
    id: "tire-change",
    slug: "tire-change",
    categoryId: "wheels",
    name: { en: "Wheel change", ar: "تغيير عجلة الطريق" },
    summary: { en: "A roadside wheel-change framework that keeps jack points and torque values as placeholders until official documentation is attached.", ar: "إطار عمل للطوارئ مع منع نشر نقاط الرفع وعزم الربط حتى توفر دليل رسمي لمصر." },
    location: { en: "Road wheels, tool kit, and official lifting points.", ar: "العجلات وعدة السيارة ونقاط الرفع الرسمية غير المؤكدة." },
    steps: {
      en: [
        "Move away from traffic and switch on hazard lights.",
        "Confirm the official jack point before lifting.",
        "Loosen wheel nuts only as instructed by the manual.",
        "Lift the vehicle using the official method only.",
        "Install the wheel and re-check torque at a service center.",
      ],
      ar: [
        "ابتعد عن الطريق وشغل الانتظار والتحذير.",
        "ثبت السيارة ولا تبدأ الرفع إلا بعد تحديد نقطة الرفع الرسمية.",
        "فك الصواميل جزئيا قبل الرفع إذا كان ذلك منصوصا عليه في الدليل.",
        "ارفع السيارة وفق دليل المالك فقط.",
        "ركب العجلة وشد الصواميل بنمط متقاطع ثم افحص العزم في مركز خدمة.",
      ],
    },
    requirements: {
      en: [
        "Official owner manual for jack points and torque.",
        "Warning triangle, gloves, and original tool kit.",
      ],
      ar: [
        "دليل مالك رسمي لنقاط الرفع والعزم.",
        "مثلث تحذير وقفازات وعدة أصلية.",
      ],
    },
    unavailableWhen: {
      en: [
        "Soft or sloped ground.",
        "No verified lifting point.",
        "Damaged nuts or missing security adapter.",
      ],
      ar: [
        "أرض رخوة أو منحدر.",
        "عدم وجود نقطة رفع موثقة.",
        "الصواميل تالفة أو مفتاح الأمان غير موجود.",
      ],
    },
    safetyNotes: {
      en: [
        "This remains a caution guide until Egypt documentation is available. Contact roadside assistance if unsure.",
      ],
      ar: [
        "هذه صفحة تحذيرية إلى أن تصل وثائق مصر. في حالة الشك اتصل بخدمة الطريق.",
      ],
    },
    availability: {
      play: "verify",
      wild: "verify",
      china: "verify",
      exportOther: "verify",
    },
    lastVerified: "2026-09-22",
    keywords: ["تغيير كاوتش","tire","tyre","jack","كوريك","عزم"],
    sourceIds: ["icaur-v27-website-master-brief"],
    related: ["spare-wheel-remove","tpms"],
  },
  {
    id: "seats",
    slug: "seats",
    categoryId: "comfort",
    name: { en: "Seats and memory", ar: "المقاعد والذاكرة" },
    summary: { en: "Covers driver and passenger seat adjustment, heating or ventilation where fitted, and Wild seat memory once confirmed.", ar: "شرح ضبط مقاعد السائق والراكب، التهوية أو التسخين إن وجدت، وذاكرة المقعد في Wild إذا تأكدت." },
    location: { en: "Seat side buttons and the seats page on the screen.", ar: "أزرار المقعد الجانبية وقائمة المقاعد في الشاشة." },
    screenPath: ["Home","Comfort","Seats"],
    steps: {
      en: [
        "Set the seat position before driving.",
        "Use the side buttons for the basic adjustments.",
        "Open the seats page for heating or ventilation if it is shown.",
        "Save a memory position only after confirming the feature exists on your vehicle.",
      ],
      ar: [
        "اضبط وضعية المقعد قبل القيادة.",
        "استخدم أزرار الجنب للتحريك الأساسي.",
        "افتح صفحة المقاعد للتسخين أو التهوية إن ظهرت.",
        "احفظ الذاكرة فقط بعد تأكيد توفرها في سيارتك.",
      ],
    },
    requirements: {
      en: [
        "The vehicle is in a suitable power mode.",
        "Nothing is blocking seat travel.",
      ],
      ar: [
        "السيارة في وضع طاقة مناسب.",
        "عدم وجود جسم يعيق حركة المقعد.",
      ],
    },
    unavailableWhen: {
      en: [
        "The function is not fitted to the trim.",
        "Thermal protection or a seat module fault.",
      ],
      ar: [
        "الوظيفة غير متاحة للتريم.",
        "حماية الحرارة أو عطل في وحدة المقعد.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not adjust the seat while driving if it would affect control of the pedals or steering.",
      ],
      ar: [
        "لا تضبط المقعد أثناء القيادة إذا كان سيؤثر على التحكم بالدواسات أو الدركسيون.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["كرسي","seat","memory","تهوية","تسخين","مقعد"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["ac","screen-map"],
  },
  {
    id: "ac",
    slug: "ac",
    categoryId: "comfort",
    name: { en: "Dual-zone A/C", ar: "التكييف ثنائي المناطق" },
    summary: { en: "Controls driver and passenger temperature, airflow direction, defogging, and fan speed.", ar: "يتحكم في درجة حرارة السائق والراكب، اتجاه الهواء، إزالة الشبورة، وسرعة المروحة." },
    location: { en: "A/C shortcut on the screen, plus physical buttons where fitted.", ar: "اختصار A/C في الشاشة وأزرار فعلية إذا وجدت." },
    screenPath: ["Home","A/C"],
    steps: {
      en: [
        "Open the A/C shortcut.",
        "Set the temperature for each side.",
        "Use Auto for everyday driving.",
        "Use Defog for the windscreen when it mists up.",
        "Check the rear vents for passengers.",
      ],
      ar: [
        "افتح اختصار A/C.",
        "اضبط درجة حرارة كل جهة.",
        "اختر Auto للاستخدام اليومي.",
        "استخدم Defog للزجاج الأمامي عند وجود شبورة.",
        "راجع فتحات الخلف للركاب.",
      ],
    },
    requirements: {
      en: [
        "The power system is on.",
        "Cabin filter in good condition.",
      ],
      ar: [
        "نظام الطاقة يعمل.",
        "فلتر كابينة بحالة جيدة.",
      ],
    },
    unavailableWhen: {
      en: [
        "Deep power-saving mode.",
        "Compressor fault or low refrigerant charge in the system.",
      ],
      ar: [
        "وضع توفير طاقة شديد.",
        "خلل كمبروسر أو مستوى شحن منخفض في النظام.",
      ],
    },
    safetyNotes: {
      en: [
        "Start defogging early to keep visibility.",
      ],
      ar: [
        "استخدم إزالة الشبورة مبكرا للحفاظ على الرؤية.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["تكييف","ac","air condition","defog","شبورة"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["seats","screen-map"],
  },
  {
    id: "key",
    slug: "key",
    categoryId: "exterior",
    name: { en: "Key and keyless entry", ar: "المفتاح والدخول الذكي" },
    summary: { en: "Covers the key buttons, keyless entry, and starting the vehicle when the key is inside it.", ar: "يغطي أزرار المفتاح، الدخول بدون مفتاح، وتشغيل السيارة عند توفر المفتاح داخلها." },
    location: { en: "The key, the door handles, and the start button.", ar: "المفتاح، مقابض الأبواب، وزر التشغيل." },
    steps: {
      en: [
        "Carry the key near the vehicle.",
        "Use the handle or the lock button depending on equipment.",
        "Unlock the vehicle and check that the key is recognized on the screen if needed.",
        "Put the key in a fixed place inside the cabin before setting off.",
      ],
      ar: [
        "احمل المفتاح بالقرب من السيارة.",
        "استخدم المقبض أو زر القفل حسب التجهيز.",
        "افتح السيارة وتأكد من ظهور المفتاح على الشاشة إذا لزم.",
        "ضع المفتاح في مكان ثابت داخل الكابينة قبل الانطلاق.",
      ],
    },
    requirements: {
      en: [
        "A healthy key battery.",
        "The key is within range of the vehicle.",
      ],
      ar: [
        "بطارية مفتاح سليمة.",
        "المفتاح داخل نطاق السيارة.",
      ],
    },
    unavailableWhen: {
      en: [
        "The key battery is weak.",
        "Strong wireless interference.",
        "Digital key services are not confirmed for Egypt.",
      ],
      ar: [
        "بطارية المفتاح ضعيفة.",
        "تداخل لاسلكي قوي.",
        "خدمات مفتاح رقمي غير مؤكدة لمصر.",
      ],
    },
    safetyNotes: {
      en: [
        "Never leave the key in the vehicle with children. Do not treat NFC or Bluetooth key functions as confirmed for Egypt before verification.",
      ],
      ar: [
        "لا تترك المفتاح داخل السيارة مع أطفال. لا تنشر وظائف NFC أو Bluetooth كمؤكدة لمصر قبل التحقق.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["مفتاح","key","keyless","nfc","bluetooth key","دخول ذكي"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["vehicle-control","trunk"],
  },
  {
    id: "sunroof",
    slug: "sunroof",
    categoryId: "comfort",
    name: { en: "Panoramic roof", ar: "السقف البانوراما" },
    summary: { en: "Explains opening and closing the roof or its shade where the equipment is fitted.", ar: "يوضح فتح وغلق السقف أو الستارة عندما يكون التجهيز متاحا في السيارة." },
    location: { en: "Roof buttons or the comfort page on the screen, depending on equipment.", ar: "أزرار السقف أو صفحة الراحة في الشاشة حسب التجهيز." },
    steps: {
      en: [
        "Check that the roof path is clear.",
        "Press open or close with a short or long press according to the actual behavior.",
        "Watch the shade and keep hands out of the path.",
        "Have the roof drains cleaned periodically at the service center.",
      ],
      ar: [
        "تأكد من خلو مسار السقف.",
        "اضغط زر الفتح أو الغلق ضغطة قصيرة/مطولة حسب السلوك الفعلي.",
        "راقب الستارة ولا تضع يدك في المسار.",
        "نظف مجاري السقف دوريا في مركز الخدمة.",
      ],
    },
    requirements: {
      en: [
        "The vehicle is fitted with the roof.",
        "Nothing is in the path.",
      ],
      ar: [
        "السيارة مزودة بالسقف.",
        "عدم وجود جسم في المسار.",
      ],
    },
    unavailableWhen: {
      en: [
        "The trim is not fitted with the feature.",
        "Anti-pinch protection has triggered.",
        "High temperature or a motor fault.",
      ],
      ar: [
        "التريم غير مزود.",
        "حماية مانع الانحشار تعمل.",
        "حرارة عالية أو عطل في المحرك.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not let children operate the roof unsupervised.",
      ],
      ar: [
        "لا تسمح للأطفال بتشغيل السقف دون مراقبة.",
      ],
    },
    availability: {
      play: "not-available",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["بانوراما","sunroof","roof","سقف","فتحة سقف"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["seats","ac"],
  },
  {
    id: "trunk",
    slug: "trunk",
    categoryId: "storage",
    name: { en: "Tailgate and cargo area", ar: "الباب الخلفي والشنطة" },
    summary: { en: "Explains the side-hinged tailgate, the cargo area, and safe loading.", ar: "يشرح الباب الخلفي الجانبي، مساحة التخزين، والتحميل الآمن." },
    location: { en: "Side-hinged tailgate and the cargo area.", ar: "الباب الخلفي الجانبي ومنطقة الشنطة." },
    steps: {
      en: [
        "Unlock with the key or the handle.",
        "Leave space behind the vehicle because the tailgate swings sideways.",
        "Keep heavy items low and close to the seat backs.",
        "Make sure the tailgate is closed before moving off.",
      ],
      ar: [
        "افتح القفل بالمفتاح أو المقبض.",
        "اترك مساحة خلف السيارة لأن الباب يفتح جانبيا.",
        "ثبت الأغراض الثقيلة منخفضة وقريبة من ظهر المقاعد.",
        "تأكد من غلق الباب قبل التحرك.",
      ],
    },
    requirements: {
      en: [
        "Enough side clearance for the door to swing open.",
        "Stay within the official load limits.",
      ],
      ar: [
        "مساحة جانبية كافية لفتح الباب.",
        "عدم تجاوز حدود الحمولة الرسمية.",
      ],
    },
    unavailableWhen: {
      en: [
        "The vehicle is locked or the key is out of range.",
        "A slope or strong wind can affect the door movement.",
      ],
      ar: [
        "السيارة مقفلة أو المفتاح بعيد.",
        "انحدار أو رياح قوية قد تؤثر على حركة الباب.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not carry unsecured items that can move under braking.",
      ],
      ar: [
        "لا تحمل أغراضا غير مثبتة قد تتحرك عند الفرملة.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["شنطة","trunk","tailgate","باب خلفي","storage"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["spare-wheel-remove","key"],
  },
  {
    id: "screen-map",
    slug: "screen-map",
    categoryId: "screen",
    name: { en: "Infotainment screen map", ar: "خريطة الشاشة" },
    summary: { en: "A visual navigation structure for the main infotainment menus and future screenshot mapping.", ar: "هيكل تنقل مرئي لقوائم الشاشة: السيارة، القيادة، المساعدة، الطاقة، الصوت، الاتصالات، والنظام." },
    location: { en: "15.4-inch center screen.", ar: "الشاشة المركزية 15.4 بوصة." },
    screenPath: ["Home"],
    steps: {
      en: [
        "Start from Home.",
        "Open each menu and record the real options from an Egypt vehicle.",
        "Add a screenshot for each page.",
        "Explain what each toggle changes.",
      ],
      ar: [
        "ابدأ من Home.",
        "افتح كل قائمة وسجل الخيارات الفعلية من سيارة مصر.",
        "أضف لقطة شاشة لكل صفحة.",
        "اربط كل Toggle بشرح ما يحدث عند تشغيله أو إيقافه.",
      ],
    },
    requirements: {
      en: [
        "Screenshots from Play and Wild.",
        "Trim-specific verification.",
      ],
      ar: [
        "لقطات شاشة من Play و Wild.",
        "مصدر يثبت اختلافات التريم.",
      ],
    },
    unavailableWhen: {
      en: [
        "The menu changes by software version or market.",
      ],
      ar: [
        "القائمة مختلفة بسبب إصدار سوفتوير أو سوق السيارة.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not operate screen menus for long periods while driving.",
      ],
      ar: [
        "لا تستخدم الشاشة لفترات طويلة أثناء القيادة.",
      ],
    },
    availability: {
      play: "verify",
      wild: "verify",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["شاشة","infotainment","menu","settings","قائمة","اعدادات"],
    sourceIds: ["icaur-v27-website-master-brief","icaur-v27-infotainment-settings-guide-en-ar"],
    videoIds: ["v27-ui-and-settings-example"],
    related: ["vehicle-control","driver-assistance","charging"],
  },
  {
    id: "reev",
    slug: "reev",
    categoryId: "energy",
    name: { en: "REEV range extender", ar: "ما معنى مدى ممتد" },
    summary: { en: "The vehicle is driven by the electric motor, while the petrol engine works as a generator for longer range.", ar: "السيارة تتحرك بالموتور الكهربائي، بينما محرك البنزين يعمل كمولد كهرباء لمدى أطول." },
    location: { en: "The powertrain and the Energy Flow page.", ar: "نظام الحركة وقائمة Energy Flow." },
    screenPath: ["Home","Energy","Energy Flow"],
    steps: {
      en: [
        "Charge the battery for everyday electric use.",
        "Use petrol to feed the generator on longer trips.",
        "Watch the energy-flow screen to understand the current power source.",
        "Do not assume the petrol engine drives the wheels directly.",
      ],
      ar: [
        "اشحن البطارية للاستخدام الكهربائي اليومي.",
        "استخدم البنزين لتغذية المولد عند الرحلات الأطول.",
        "راقب شاشة تدفق الطاقة لفهم مصدر الطاقة الحالي.",
        "لا تفترض أن محرك البنزين يحرك العجلات مباشرة.",
      ],
    },
    requirements: {
      en: [
        "Suitable fuel for the generator.",
        "Battery and REEV system in normal condition.",
      ],
      ar: [
        "وقود مناسب للمولد.",
        "بطارية ونظام REEV بحالة طبيعية.",
      ],
    },
    unavailableWhen: {
      en: [
        "Fuel level is very low.",
        "Thermal protection or a system fault.",
      ],
      ar: [
        "وقود منخفض جدا.",
        "حماية حرارية أو عطل في النظام.",
      ],
    },
    safetyNotes: {
      en: [
        "Follow the high-voltage warnings and do not open system components yourself.",
      ],
      ar: [
        "اتبع تحذيرات الجهد العالي ولا تفتح مكونات النظام بنفسك.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["reev","range extender","مدى ممتد","مولد","بنزين","كهرباء"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["charging","v2l"],
  },
  {
    id: "driving-modes",
    slug: "driving-modes",
    categoryId: "driving",
    name: { en: "Driving modes", ar: "أوضاع القيادة" },
    summary: { en: "Changes vehicle response, drive, stability, and possibly suspension depending on the mode and the trim.", ar: "تغير استجابة السيارة، الدفع، الثبات، وربما التعليق حسب الوضع والتريم." },
    location: { en: "Driving Control menu or the mode selector on the console.", ar: "قائمة Driving Control أو محدد الأوضاع في الكونسول." },
    screenPath: ["Home","Driving Control","Drive Modes"],
    steps: {
      en: [
        "Choose the mode that suits the road.",
        "Use Eco for quiet, efficient driving.",
        "Use Comfort for everyday driving.",
        "Use Sport when you need sharper response.",
        "Use off-road modes only in a suitable environment.",
      ],
      ar: [
        "اختر الوضع المناسب للطريق.",
        "استخدم Eco للهدوء والكفاءة.",
        "استخدم Comfort للقيادة اليومية.",
        "استخدم Sport عند الحاجة لاستجابة أعلى.",
        "لا تستخدم أوضاع الطرق الوعرة إلا في بيئة مناسبة.",
      ],
    },
    requirements: {
      en: [
        "Confirmation of which modes exist on Play and Wild.",
        "Tires in good condition and correctly inflated.",
      ],
      ar: [
        "تأكيد الأوضاع المتاحة في Play/Wild.",
        "حالة إطارات وضغط مناسب.",
      ],
    },
    unavailableWhen: {
      en: [
        "A stability system or sensor is faulty.",
        "Speed or conditions do not allow a mode change.",
      ],
      ar: [
        "نظام ثبات أو حساس متعطل.",
        "سرعة أو ظروف لا تسمح بتغيير الوضع.",
      ],
    },
    safetyNotes: {
      en: [
        "Choosing a mode that does not suit the road can reduce stability or comfort.",
      ],
      ar: [
        "اختيار وضع غير مناسب للطريق قد يقلل الثبات أو الراحة.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["mode","eco","sport","comfort","اوضاع القيادة","awd"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["reev","driver-assistance"],
  },
  {
    id: "tpms",
    slug: "tpms",
    categoryId: "wheels",
    name: { en: "TPMS", ar: "مراقبة ضغط الإطارات" },
    summary: { en: "Shows tire pressure and temperature and warns when pressure is low or a sensor fault exists.", ar: "يعرض ضغط وحرارة الإطارات ويحذر عند وجود انخفاض أو خلل." },
    location: { en: "Instrument display or vehicle status screen.", ar: "شاشة العدادات أو قائمة حالة السيارة." },
    screenPath: ["Home","Vehicle Status","Tires"],
    steps: {
      en: [
        "Open the tire status page.",
        "Review pressure and temperature for each wheel.",
        "Stop safely if a warning appears.",
        "Set pressure using the vehicle placard or official manual.",
      ],
      ar: [
        "افتح صفحة حالة الإطارات.",
        "راجع الضغط والحرارة لكل عجلة.",
        "إذا ظهر تحذير، توقف في مكان آمن وافحص الإطار.",
        "اضبط الضغط حسب ملصق السيارة أو الدليل الرسمي.",
      ],
    },
    requirements: {
      en: [
        "Working TPMS sensors.",
        "Official Egypt pressure values from placard or manual.",
      ],
      ar: [
        "حساسات TPMS سليمة.",
        "ضغط رسمي من ملصق مصر أو دليل المالك.",
      ],
    },
    unavailableWhen: {
      en: [
        "Sensor is faulty or not programmed.",
        "The system is relearning after a wheel change.",
      ],
      ar: [
        "حساس معطل أو غير مبرمج.",
        "بعد تغيير العجلة حتى يعيد النظام القراءة.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not rely on visual inspection only. Correct pressure must come from the placard or manual.",
      ],
      ar: [
        "لا تعتمد على النظر فقط. الضغط الصحيح يجب أن يأتي من الملصق أو الدليل، وليس تخمينا.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["tpms","ضغط الكاوتش","اطارات","tire pressure","حرارة"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["tire-change","spare-wheel-remove"],
  },
  {
    id: "under-hood",
    slug: "under-hood",
    categoryId: "maintenance",
    name: { en: "Under-hood basics", ar: "منطقة تحت الكبوت" },
    summary: { en: "An initial map of the areas that are safe to check, such as washer fluid, while keeping high-voltage work out of scope.", ar: "خريطة مبدئية لمناطق الفحص الآمن مثل مياه المساحات مع منع التعامل مع الجهد العالي." },
    location: { en: "Under the front bonnet.", ar: "تحت غطاء المحرك الأمامي." },
    steps: {
      en: [
        "Park the vehicle and leave drive mode.",
        "Release the bonnet from the interior handle, then the safety catch.",
        "Identify only the check areas that the owner manual allows.",
        "Top up washer fluid from the correct reservoir only.",
        "Leave brake fluid, coolant, and high-voltage components to the service center.",
      ],
      ar: [
        "اركن السيارة وافصل وضع القيادة.",
        "افتح الكبوت من المقبض الداخلي ثم مزلاج الأمان.",
        "حدد فقط مناطق الفحص المسموحة في دليل المالك.",
        "املأ سائل المساحات فقط من الخزان الصحيح.",
        "اترك سوائل الفرامل والتبريد ومكونات الجهد العالي لمركز الخدمة.",
      ],
    },
    requirements: {
      en: [
        "Official owner manual for the component map.",
        "Good lighting and gloves where needed.",
      ],
      ar: [
        "دليل مالك رسمي للخرائط والمكونات.",
        "إضاءة جيدة وقفازات عند الحاجة.",
      ],
    },
    unavailableWhen: {
      en: [
        "The engine bay is still very hot.",
        "A high-voltage warning or a leak is present.",
      ],
      ar: [
        "الكبوت ساخن جدا.",
        "وجود تحذير جهد عالي أو تسريب.",
      ],
    },
    safetyNotes: {
      en: [
        "Do not touch orange cables or components. Do not open high-voltage cooling caps.",
      ],
      ar: [
        "لا تلمس كابلات أو مكونات برتقالية اللون. لا تفتح أغطية تبريد الجهد العالي.",
      ],
    },
    availability: {
      play: "verify",
      wild: "verify",
      china: "confirmed-export",
      exportOther: "verify",
    },
    lastVerified: "2026-09-22",
    keywords: ["كبوت","under hood","washer fluid","صيانة","coolant"],
    sourceIds: ["icaur-v27-website-master-brief"],
    videoIds: ["under-hood-cover-access-example"],
    related: ["warnings","charging"],
  },
  {
    id: "warnings",
    slug: "warnings",
    categoryId: "troubleshooting",
    name: { en: "Warning messages", ar: "رسائل التحذير" },
    summary: { en: "An expandable dictionary of screen and cluster warnings with first steps and when to call service.", ar: "قاموس قابل للتوسيع لتحذيرات الشاشة والعدادات مع خطوات أولية ومتى تتصل بالخدمة." },
    location: { en: "Instrument cluster and center screen.", ar: "لوحة العدادات والشاشة المركزية." },
    steps: {
      en: [
        "Read the full warning text.",
        "Photograph the message if you can.",
        "Check the easy causes first, such as an open door or a dirty sensor.",
        "If the warning involves brakes, high voltage, or charging, stop safely and call service.",
      ],
      ar: [
        "اقرأ نص التحذير كاملا.",
        "صور الرسالة إذا أمكن.",
        "تحقق من الحالات السهلة مثل باب مفتوح أو حساس متسخ.",
        "إذا كان التحذير يتعلق بالفرامل أو الجهد العالي أو الشحن، توقف بأمان واتصل بالخدمة.",
      ],
    },
    requirements: {
      en: [
        "A message list from the owner manual or an Egypt vehicle.",
        "A clear severity classification.",
      ],
      ar: [
        "قائمة رسائل من دليل المالك أو سيارة مصر.",
        "تصنيف خطورة واضح.",
      ],
    },
    unavailableWhen: {
      en: [
        "The message is not documented yet.",
        "System language or software version differs.",
      ],
      ar: [
        "الرسالة غير موثقة بعد.",
        "اختلاف لغة النظام أو إصدار السوفتوير.",
      ],
    },
    safetyNotes: {
      en: [
        "Brake and high-voltage battery warnings are not for experimenting. Treat them as a safety priority.",
      ],
      ar: [
        "تحذيرات الفرامل والبطارية عالية الجهد ليست للتجربة. تعامل معها كأولوية سلامة.",
      ],
    },
    availability: {
      play: "verify",
      wild: "verify",
      china: "verify",
      exportOther: "verify",
    },
    lastVerified: "2026-09-22",
    keywords: ["warning","تحذير","رسالة","error","عطل"],
    sourceIds: ["icaur-v27-website-master-brief"],
    related: ["under-hood","charging","driver-assistance"],
  },
  {
    id: "mirrors",
    slug: "mirrors",
    categoryId: "exterior",
    name: { en: "Side mirrors", ar: "المرايات الجانبية" },
    summary: { en: "Adjusting, folding, and heating the mirrors depending on equipment and lock settings.", ar: "ضبط وطي وتسخين المرايات حسب التجهيز وإعدادات القفل." },
    location: { en: "Door buttons or the Vehicle Control screen.", ar: "أزرار الباب أو شاشة Vehicle Control." },
    screenPath: ["Home","Vehicle Control","Mirrors"],
    steps: {
      en: [
        "Select the right or left mirror.",
        "Adjust the aim before moving off.",
        "Enable auto-fold on lock if the option exists.",
        "Use mirror heating in rain or fog where fitted.",
      ],
      ar: [
        "اختر المرآة اليمنى أو اليسرى.",
        "اضبط الاتجاه قبل التحرك.",
        "فعل الطي التلقائي عند القفل إذا كان الخيار موجودا.",
        "استخدم التسخين في المطر أو الشبورة إذا كان متاحا.",
      ],
    },
    requirements: {
      en: [
        "Folding or heating equipment fitted to the vehicle.",
        "The vehicle is in a suitable power mode.",
      ],
      ar: [
        "تجهيز الطي أو التسخين مثبت في السيارة.",
        "السيارة في وضع طاقة مناسب.",
      ],
    },
    unavailableWhen: {
      en: [
        "The mirror is frozen or obstructed.",
        "The function is not available on the trim.",
      ],
      ar: [
        "المراية مجمدة أو عليها عائق.",
        "الوظيفة غير متاحة في التريم.",
      ],
    },
    safetyNotes: {
      en: [
        "Set the mirrors before driving to reduce blind spots.",
      ],
      ar: [
        "تأكد من ضبط المرايات قبل القيادة لتقليل النقاط العمياء.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "confirmed-export",
      exportOther: "likely",
    },
    lastVerified: "2026-09-22",
    keywords: ["مرايات","mirror","folding","تسخين مراية"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["vehicle-control","key"],
  },
  {
    id: "carplay-android-auto",
    slug: "carplay-android-auto",
    categoryId: "screen",
    name: { en: "Apple CarPlay and Android Auto", ar: "ربط الهاتف" },
    summary: { en: "Wireless phone projection where it is supported by the market and the software version.", ar: "ربط لاسلكي للهاتف إذا كان مدعوما في السوق وإصدار السوفتوير." },
    location: { en: "Connections or Phone Projection menu.", ar: "قائمة Connections أو Phone Projection." },
    screenPath: ["Home","Connections","Phone projection"],
    steps: {
      en: [
        "Turn on Bluetooth and Wi-Fi on the phone.",
        "Open Connections on the screen.",
        "Choose to add a new device.",
        "Accept the pairing request on both the phone and the screen.",
        "Select CarPlay or Android Auto when it appears.",
      ],
      ar: [
        "شغل Bluetooth و Wi-Fi في الهاتف.",
        "افتح Connections من الشاشة.",
        "اختر إضافة جهاز جديد.",
        "اقبل الاقتران من الهاتف والشاشة.",
        "اختر CarPlay أو Android Auto عند ظهوره.",
      ],
    },
    requirements: {
      en: [
        "A supported phone.",
        "The projection service enabled in the Egypt software.",
        "Bluetooth and Wi-Fi permissions.",
      ],
      ar: [
        "هاتف مدعوم.",
        "خدمة الربط مفعلة في نسخة مصر.",
        "صلاحيات Bluetooth و Wi-Fi.",
      ],
    },
    unavailableWhen: {
      en: [
        "The service is not enabled for the market.",
        "The phone is connected to another vehicle.",
        "The system version needs an update.",
      ],
      ar: [
        "الخدمة غير مفعلة في السوق.",
        "الهاتف متصل بسيارة أخرى.",
        "إصدار النظام يحتاج تحديثا.",
      ],
    },
    safetyNotes: {
      en: [
        "Set your destination or media before setting off.",
      ],
      ar: [
        "اضبط الوجهة أو الوسائط قبل الانطلاق.",
      ],
    },
    availability: {
      play: "confirmed-egypt",
      wild: "confirmed-egypt",
      china: "verify",
      exportOther: "confirmed-export",
    },
    lastVerified: "2026-09-22",
    keywords: ["carplay","android auto","بلوتوث","هاتف","phone"],
    sourceIds: ["icaur-v27-website-master-brief","official-icaur-colombia-v27-page","gb-auto-icaur-egypt-launch","alam-el-syarat-v27-egypt-equipment"],
    related: ["screen-map","ac"],
  },
]
