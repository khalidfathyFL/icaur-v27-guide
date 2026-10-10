import type { Localized } from './types'

/**
 * What Egyptian owners have established in use, which the official material
 * does not cover.
 *
 * These are deliberately kept separate from the manufacturer and launch data.
 * They are consistent reports from people driving the car here, not statements
 * from GB Auto or iCAUR, and the site says so rather than blurring the two.
 * Nothing here identifies anybody.
 */

export type OwnerReportKind = 'behaviour' | 'service' | 'software' | 'issue'

export type OwnerReport = {
  id: string
  kind: OwnerReportKind
  title: Localized
  detail: Localized
  /** When owners were last discussing it. */
  asOf: string
}

export const OWNER_REPORT_KINDS: { id: OwnerReportKind; name: Localized }[] = [
  { id: 'behaviour', name: { en: 'How the car behaves', ar: 'سلوك السيارة' } },
  { id: 'service', name: { en: 'Service and maintenance', ar: 'الصيانة والخدمة' } },
  { id: 'software', name: { en: 'Software and app', ar: 'السوفتوير والتطبيق' } },
  { id: 'issue', name: { en: 'Open issues', ar: 'مشاكل قائمة' } },
]

export const ownerReports: OwnerReport[] = [
  {
    id: 'force-charge-below-80',
    kind: 'behaviour',
    asOf: '2026-09',
    title: {
      en: 'Forced charging will not start above 80% battery',
      ar: 'الشحن الإجباري لا يعمل والبطارية أعلى من 80%',
    },
    detail: {
      en: 'Owners report that Force Range Extender simply will not engage while the battery is above about 80%. It has to be lower before the generator will run to build charge. This is not in the settings guide, and it is the usual reason the option appears to do nothing.',
      ar: 'يذكر الملاك أن الشحن الإجباري لا يعمل إطلاقا والبطارية أعلى من 80% تقريبا. يجب أن تكون أقل من ذلك حتى يعمل المولد لبناء شحن. هذه المعلومة غير موجودة في دليل الإعدادات، وهي السبب المعتاد في أن الخيار يبدو وكأنه لا يفعل شيئا.',
    },
  },
  {
    id: 'real-consumption',
    kind: 'behaviour',
    asOf: '2026-09',
    title: {
      en: 'Around 8.1 L/100km once the battery is empty',
      ar: 'نحو 8.1 لتر/100كم بعد نفاد البطارية',
    },
    detail: {
      en: 'One detailed owner test recorded 8.1 L/100km driving between 80 and 120 km/h with the generator running in hybrid and forced-charge modes. The very low advertised figure assumes you start every journey on a full battery; once you are running on petrol alone, expect ordinary SUV consumption. Owners also agree hybrid mode with a full battery is the most economical way to start a long trip.',
      ar: 'سجل اختبار تفصيلي لأحد الملاك استهلاك 8.1 لتر/100كم بالقيادة بين 80 و120 كم/س مع عمل المولد في وضعي الهجين والشحن الإجباري. الرقم المنخفض المعلن يفترض أنك تبدأ كل رحلة ببطارية ممتلئة، وبمجرد الاعتماد على البنزين وحده توقع استهلاك SUV عادية. ويتفق الملاك أيضا أن وضع الهجين ببطارية ممتلئة هو الأوفر لبدء رحلة طويلة.',
    },
  },
  {
    id: 'obour-only-service',
    kind: 'service',
    asOf: '2026-09',
    title: {
      en: 'Only the Obour branch services the car',
      ar: 'فرع العبور وحده هو الذي يخدم السيارة',
    },
    detail: {
      en: 'Owners consistently report that the Obour branch is the only one working on iCAUR so far. Being sent to the nearest Chery branch has not worked in practice. Call ahead before driving to any other branch.',
      ar: 'يذكر الملاك باستمرار أن فرع العبور هو الوحيد الذي يعمل على iCAUR حتى الآن. التوجه إلى أقرب فرع شيري لم ينجح عمليا. اتصل قبل أن تذهب إلى أي فرع آخر.',
    },
  },
  {
    id: 'first-service-interval',
    kind: 'service',
    asOf: '2026-09',
    title: {
      en: 'First service at 10,000 km or 12 months, on the total odometer',
      ar: 'أول صيانة عند 10,000 كم أو 12 شهرا، على العداد الكلي',
    },
    detail: {
      en: 'The schedule owners received puts the first service at 10,000 km or 12 months, whichever comes first — and the distance counts the total odometer, not the distance driven on petrol. Worth knowing before the conversation at the service desk.',
      ar: 'الجدول الذي حصل عليه الملاك يحدد أول صيانة عند 10,000 كم أو 12 شهرا أيهما أقرب، والمسافة محسوبة على العداد الكلي وليس المسافة المقطوعة بالبنزين. من المفيد معرفة ذلك قبل النقاش في مركز الخدمة.',
    },
  },
  {
    id: 'app-not-activated',
    kind: 'software',
    asOf: '2026-10',
    title: {
      en: 'The phone app is not activated in Egypt yet',
      ar: 'تطبيق الهاتف غير مفعل في مصر حتى الآن',
    },
    detail: {
      en: 'The companion app works in Gulf markets but has not been switched on for Egyptian cars. Owners are asking the distributor to enable accounts for vehicles sold here.',
      ar: 'التطبيق المرافق يعمل في أسواق الخليج لكنه لم يُفعّل للسيارات المصرية. يطالب الملاك الوكيل بتفعيل حسابات للسيارات المباعة هنا.',
    },
  },
  {
    id: 'software-v2-pending',
    kind: 'software',
    asOf: '2026-09',
    title: {
      en: 'Software 2.0 exists but has not been rolled out here',
      ar: 'السوفتوير 2.0 موجود لكنه لم يُطرح هنا',
    },
    detail: {
      en: 'Owners report a 2.0 release with a large number of fixes that has not reached Egyptian cars. Updates currently need the service centre rather than arriving over the air.',
      ar: 'يذكر الملاك وجود إصدار 2.0 بعدد كبير من الإصلاحات لم يصل للسيارات المصرية. التحديثات حاليا تحتاج مركز الخدمة بدل أن تصل لاسلكيا.',
    },
  },
  {
    id: 'screen-cutout',
    kind: 'issue',
    asOf: '2026-09',
    title: {
      en: 'Centre screen cutting out while driving',
      ar: 'انطفاء الشاشة المركزية أثناء القيادة',
    },
    detail: {
      en: 'Several owners have had the centre screen drop out, in some cases while moving. A system restart has recovered it each time, but it has happened to more than one car and owners are raising it formally with the distributor. Report it to the service centre so there is a record against your vehicle.',
      ar: 'واجه عدة ملاك انطفاء الشاشة المركزية، وفي بعض الحالات أثناء السير. إعادة تشغيل النظام أعادتها في كل مرة، لكنها تكررت في أكثر من سيارة ويطرحها الملاك رسميا مع الوكيل. أبلغ مركز الخدمة ليكون هناك سجل على سيارتك.',
    },
  },
  {
    id: 'over-price',
    kind: 'issue',
    asOf: '2026-09',
    title: {
      en: 'Over-price of up to EGP 60,000 above list',
      ar: 'أوفر برايس يصل إلى 60,000 جنيه فوق السعر الرسمي',
    },
    detail: {
      en: 'Cars have been offered well above the official launch price, with owners reporting margins up to EGP 60,000. The official prices are on this page; use them as your reference before agreeing anything.',
      ar: 'عُرضت سيارات بأسعار أعلى بكثير من سعر الإطلاق الرسمي، ويذكر الملاك فروقا تصل إلى 60,000 جنيه. الأسعار الرسمية موجودة في هذه الصفحة، فاجعلها مرجعك قبل الاتفاق على أي شيء.',
    },
  },
  {
    id: 'seats-cooling-only',
    kind: 'behaviour',
    asOf: '2026-10',
    title: {
      en: 'The seats cool but do not massage',
      ar: 'المقاعد مبردة لكن بدون مساج',
    },
    detail: {
      en: 'A common question in the owners group: the front seats are ventilated, and there is no massage function on the Egyptian cars.',
      ar: 'سؤال متكرر بين الملاك: المقاعد الأمامية مهواة، ولا توجد وظيفة مساج في السيارات المصرية.',
    },
  },
]
