// Answers here follow the site's editorial rule: anything stated as true for
// Egypt comes from egypt.ts or a guide marked confirmed-egypt. Where a guide
// still says "verify", the answer says so too. Edit content here.
import type { FaqEntry, FaqTopic } from './types'

export const faqTopics: FaqTopic[] = [
  { id: 'buying', name: { en: 'Buying in Egypt', ar: 'الشراء في مصر' } },
  { id: 'energy', name: { en: 'Charging and range', ar: 'الشحن والمدى' } },
  { id: 'using', name: { en: 'Using the car', ar: 'استخدام السيارة' } },
  { id: 'service', name: { en: 'Warranty and service', ar: 'الضمان والصيانة' } },
  { id: 'site', name: { en: 'About this guide', ar: 'عن هذا الدليل' } },
]

export const faq: FaqEntry[] = [
  {
    id: 'price',
    topic: 'buying',
    featured: true,
    question: { en: 'How much does the V27 cost in Egypt?', ar: 'كم سعر V27 في مصر؟' },
    answer: {
      en: 'At the GB Auto launch the Play RWD was EGP 1,900,000 and the Wild AWD EGP 2,150,000. Prices change, so the Egypt page shows the current list price of each trim.',
      ar: 'عند إطلاق GB Auto كان سعر Play RWD 1,900,000 جنيه و Wild AWD 2,150,000 جنيه. الأسعار تتغير، لذلك تعرض صفحة مصر السعر الرسمي الحالي لكل فئة.',
    },
    links: [{ href: '#/egypt', label: { en: 'Current prices', ar: 'الأسعار الحالية' } }],
  },
  {
    id: 'distributor',
    topic: 'buying',
    question: { en: 'Who sells the V27 in Egypt?', ar: 'من يبيع V27 في مصر؟' },
    answer: {
      en: 'GB Auto is the exclusive iCAUR distributor in Egypt, and the V27 is the brand’s first model here. The Where to buy page lists dealers owners reported as selling at the official price.',
      ar: 'GB Auto هي الوكيل الحصري لـ iCAUR في مصر، و V27 أول طراز للعلامة هنا. صفحة أين تشتري تعرض الموزعين الذين أفاد الملاك أنهم يبيعون بالسعر الرسمي.',
    },
    links: [{ href: '#/dealers', label: { en: 'Where to buy', ar: 'أين تشتري' } }],
  },
  {
    id: 'play-vs-wild',
    topic: 'buying',
    featured: true,
    question: { en: 'What is the difference between Play and Wild?', ar: 'ما الفرق بين Play و Wild؟' },
    answer: {
      en: 'The Play has one motor driving the rear wheels (248 hp, 20.47 kWh battery, 19-inch wheels). The Wild has two motors and all-wheel drive (449 hp, 34.31 kWh, 21-inch wheels), and adds the panoramic roof, power tailgate, automatic parking, seat memory, ambient lighting, heated mirrors and the 14-speaker Pioneer system.',
      ar: 'Play بموتور واحد يدفع العجلات الخلفية (248 حصان، بطارية 20.47 كيلوواط ساعة، جنوط 19 بوصة). Wild بموتورين ودفع رباعي (449 حصان، 34.31 كيلوواط ساعة، جنوط 21 بوصة)، ويضيف السقف البانوراما والباب الخلفي الكهربائي والركن الأوتوماتيكي وذاكرة المقعد والإضاءة المحيطة والمرايات المدفأة ونظام Pioneer بـ 14 سماعة.',
    },
    links: [{ href: '#/compare/play-vs-wild', label: { en: 'Full comparison', ar: 'المقارنة الكاملة' } }],
  },
  {
    id: 'play-missing',
    topic: 'buying',
    question: {
      en: 'Does the Play have automatic parking or the panoramic roof?',
      ar: 'هل في Play ركن أوتوماتيكي أو سقف بانوراما؟',
    },
    answer: {
      en: 'No. In the Egypt launch equipment both are Wild only. Both trims do have the 540° camera, adaptive cruise with Traffic Jam Assist, and parking sensors.',
      ar: 'لا. في تجهيزات الإطلاق في مصر الاثنان في Wild فقط. لكن الفئتين فيهما كاميرا 540 درجة ومثبت سرعة تكيفي مع مساعد الزحام وحساسات ركن.',
    },
    guides: ['auto-park', 'sunroof'],
  },
  {
    id: 'reev',
    topic: 'energy',
    featured: true,
    question: { en: 'Is the V27 electric or petrol?', ar: 'هل V27 كهربائية أم بنزين؟' },
    answer: {
      en: 'Both, in a specific way: it is a range-extender (REEV). The wheels are always driven by the electric motor; the petrol engine only works as a generator. Charge it for everyday electric driving, and the petrol tank covers longer trips.',
      ar: 'الاثنان بطريقة محددة: هي سيارة بمدى ممتد (REEV). العجلات تتحرك دائما بالموتور الكهربائي، ومحرك البنزين يعمل كمولد فقط. اشحنها للاستخدام اليومي الكهربائي، وخزان البنزين يغطي الرحلات الأطول.',
    },
    guides: ['reev'],
  },
  {
    id: 'charge-time',
    topic: 'energy',
    question: { en: 'How long does it take to charge?', ar: 'كم يستغرق الشحن؟' },
    answer: {
      en: 'The launch figures for AC charging from 0 to 100% are 2.7 hours for the Play and 3.5 hours for the Wild, whose battery is larger. The real time depends on the charger.',
      ar: 'أرقام الإطلاق للشحن المتردد من 0 إلى 100% هي 2.7 ساعة لـ Play و 3.5 ساعة لـ Wild لأن بطاريتها أكبر. الوقت الفعلي يعتمد على الشاحن.',
    },
    guides: ['charging'],
  },
  {
    id: 'charge-stopped',
    topic: 'energy',
    question: { en: 'Why did charging stop or not start?', ar: 'لماذا توقف الشحن أو لم يبدأ؟' },
    answer: {
      en: 'The usual causes are a cable that is not fully latched, a battery temperature outside the allowed range, or a fault or power cut at the charger. Check the status on the screen or the port light.',
      ar: 'الأسباب المعتادة: كابل غير مثبت بالكامل، أو حرارة بطارية خارج النطاق المسموح، أو عطل أو انقطاع كهرباء في الشاحن. راجع الحالة على الشاشة أو لمبة المنفذ.',
    },
    guides: ['charging'],
  },
  {
    id: 'v2l',
    topic: 'energy',
    question: { en: 'Can I power devices from the car (V2L)?', ar: 'هل أستطيع تشغيل أجهزة من السيارة (V2L)؟' },
    answer: {
      en: 'Not confirmed for Egypt yet. It is likely on the Wild and unverified on the Play. Check on your own car, and use only the original or an approved adapter.',
      ar: 'غير مؤكد لمصر حتى الآن. مرجح في Wild وغير متحقق منه في Play. تحقق على سيارتك، واستخدم المحول الأصلي أو المعتمد فقط.',
    },
    guides: ['v2l'],
  },
  {
    id: 'carplay',
    topic: 'using',
    featured: true,
    question: { en: 'Does it have Apple CarPlay and Android Auto?', ar: 'هل فيها أبل كاربلاي وأندرويد أوتو؟' },
    answer: {
      en: 'Yes, on both trims in Egypt. Turn on Bluetooth and Wi-Fi on the phone, open Connections on the screen, add a new device, and accept the pairing on both.',
      ar: 'نعم، في الفئتين في مصر. شغّل البلوتوث والواي فاي في الهاتف، وافتح Connections على الشاشة، وأضف جهازا جديدا، ووافق على الاقتران في الاثنين.',
    },
    guides: ['carplay-android-auto'],
  },
  {
    id: 'spare-wheel',
    topic: 'using',
    featured: true,
    question: { en: 'How do I take the spare wheel off?', ar: 'كيف أفك الاستبن؟' },
    answer: {
      en: 'The spare is on the carrier on the side-hinged tailgate. The guide walks through the observed steps with the original tool kit. Wheel torque and jack points are not published until official documents confirm them.',
      ar: 'الاستبن على الحامل في الباب الخلفي الجانبي. الدليل يشرح الخطوات الملاحظة باستخدام عدة السيارة الأصلية. عزم ربط العجل ونقاط الرفع لا تُنشر حتى تؤكدها وثائق رسمية.',
    },
    guides: ['spare-wheel-remove', 'tire-change'],
  },
  {
    id: 'tailgate',
    topic: 'using',
    question: { en: 'Which way does the tailgate open?', ar: 'كيف يفتح الباب الخلفي؟' },
    answer: {
      en: 'Sideways: it is hinged at the side, not the top. Leave room behind and beside the car when you park. On the Wild it is powered with soft close.',
      ar: 'للجانب: مفصلاته على الجانب وليس من أعلى. اترك مساحة خلف السيارة وبجانبها عند الركن. في Wild يعمل كهربائيا مع الغلق الناعم.',
    },
    guides: ['trunk'],
  },
  {
    id: 'tyre-pressure',
    topic: 'using',
    question: { en: 'What tyre pressure should I use?', ar: 'ما ضغط الإطارات المناسب؟' },
    answer: {
      en: 'Use the values on the car’s tyre placard or in the official manual. The tyre pressure page shows the pressure and temperature of each wheel; stop safely if it warns.',
      ar: 'استخدم القيم المكتوبة على ملصق الإطارات في السيارة أو في الدليل الرسمي. صفحة ضغط الإطارات تعرض ضغط وحرارة كل عجلة؛ توقف بأمان إذا ظهر تحذير.',
    },
    guides: ['tpms'],
  },
  {
    id: 'warning',
    topic: 'using',
    featured: true,
    question: { en: 'A warning came up on the screen. What should I do?', ar: 'ظهر تحذير على الشاشة. ماذا أفعل؟' },
    answer: {
      en: 'Read the whole message and photograph it if you can. Check easy causes first, such as an open door or a dirty sensor. If it is about the brakes, high voltage or charging, stop safely and call service.',
      ar: 'اقرأ الرسالة كاملة وصوّرها إن أمكن. ابدأ بالأسباب السهلة مثل باب مفتوح أو حساس متسخ. إذا كانت عن الفرامل أو الجهد العالي أو الشحن، توقف بأمان واتصل بالصيانة.',
    },
    guides: ['warnings'],
  },
  {
    id: 'warranty',
    topic: 'service',
    featured: true,
    question: { en: 'What warranty does the V27 have in Egypt?', ar: 'ما ضمان V27 في مصر؟' },
    answer: {
      en: 'GB Auto announced 6 years or 200,000 km on the car, and 8 years or 200,000 km on the battery.',
      ar: 'أعلنت GB Auto ضمان 6 سنوات أو 200,000 كم على السيارة، و 8 سنوات أو 200,000 كم على البطارية.',
    },
    links: [{ href: '#/egypt', label: { en: 'Egypt page', ar: 'صفحة مصر' } }],
  },
  {
    id: 'under-hood',
    topic: 'service',
    question: { en: 'What can I check under the bonnet myself?', ar: 'ماذا أستطيع أن أفحص بنفسي تحت الكبوت؟' },
    answer: {
      en: 'Only what the owner manual allows, such as topping up the washer fluid. Leave brake fluid, coolant and every high-voltage part to the service center.',
      ar: 'فقط ما يسمح به دليل المالك، مثل إضافة مياه المساحات. اترك زيت الفرامل وسائل التبريد وكل أجزاء الجهد العالي لمركز الصيانة.',
    },
    guides: ['under-hood'],
  },
  {
    id: 'labels',
    topic: 'site',
    question: { en: 'What do labels like “Confirmed Egypt” mean?', ar: 'ماذا تعني علامات مثل "مؤكد مصر"؟' },
    answer: {
      en: '“Confirmed Egypt” is checked against Egypt-market cars or official Egypt documents. “Likely” has strong evidence but no official confirmation, and “Needs Verification” means check on your own car. Something seen only on Chinese or other export cars is never labelled as confirmed for Egypt.',
      ar: '"مؤكد مصر" تم التحقق منه على سيارات السوق المصري أو من وثائق مصر الرسمية. "مرجح" عليه أدلة قوية بدون تأكيد رسمي، و"يحتاج تحقق" يعني تحقق على سيارتك. ما يظهر فقط في سيارات الصين أو أسواق التصدير لا يوصف أبدا بأنه مؤكد لمصر.',
    },
  },
  {
    id: 'correction',
    topic: 'site',
    question: { en: 'My car is different from what a guide says.', ar: 'سيارتي مختلفة عما يقوله الدليل.' },
    answer: {
      en: 'Tell us. Owners keep the guides accurate: suggest a correction from your account and an admin checks it before the guide changes.',
      ar: 'أخبرنا. الملاك يحافظون على دقة الأدلة: اقترح تصحيحا من حسابك وسيراجعه المشرف قبل تعديل الدليل.',
    },
    links: [{ href: '#/account/suggest', label: { en: 'Suggest a correction', ar: 'اقترح تصحيحا' } }],
  },
  {
    id: 'community-answers',
    topic: 'site',
    question: { en: 'Who answers the community questions?', ar: 'من يجيب على أسئلة المجتمع؟' },
    answer: {
      en: 'Other owners. A moderator checks every question and answer before it appears, but answers are owners’ experience, not official GB Auto advice. The person who asked can mark the answer that solved it.',
      ar: 'ملاك آخرون. يراجع المشرف كل سؤال وإجابة قبل ظهورهما، لكن الإجابات خبرة ملاك وليست نصيحة رسمية من GB Auto. صاحب السؤال يستطيع تعليم الإجابة التي حلّت مشكلته.',
    },
  },
]
