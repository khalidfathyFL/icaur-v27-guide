import {
  BadgeDollarSign,
  FileEdit,
  FilePlus2,
  FileText,
  History,
  KeyRound,
  KeySquare,
  Mail,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Newspaper,
  Package,
  PenLine,
  ShieldCheck,
  ShieldHalf,
  ShieldPlus,
  ShoppingBag,
  Star,
  Store,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * The sections of the two panels. The admin sections each name the
 * permission the server checks for them, so the sidebar only offers what
 * the signed-in person can actually use.
 */

type Text = { en: string; ar: string }

export type PanelSection = {
  key: string
  label: Text
  /** Shown under the page title in the topbar. */
  description: Text
  icon: LucideIcon
  group: string
  permission?: string
  /** Also shown to merchants of this kind, who see only their own listings in it. */
  merchant?: string
}

export type PanelGroupDef = { key: string; label: Text; icon: LucideIcon }

export const ADMIN_GROUPS: PanelGroupDef[] = [
  { key: 'overview', label: { en: 'Overview', ar: 'نظرة عامة' }, icon: LayoutDashboard },
  { key: 'moderation', label: { en: 'Moderation', ar: 'المراجعة' }, icon: ShieldCheck },
  { key: 'market', label: { en: 'Market data', ar: 'بيانات السوق' }, icon: Wrench },
  { key: 'orders', label: { en: 'Orders', ar: 'الطلبات' }, icon: ShoppingBag },
  { key: 'people', label: { en: 'People', ar: 'الأشخاص' }, icon: Users },
]

export const ADMIN_SECTIONS: PanelSection[] = [
  {
    key: 'dashboard',
    group: 'overview',
    icon: LayoutDashboard,
    permission: 'stats.read',
    label: { en: 'Dashboard', ar: 'لوحة التحكم' },
    description: { en: 'What needs attention, and who owns what', ar: 'ما يحتاج انتباهك، ومن يملك ماذا' },
  },
  {
    key: 'activity',
    group: 'overview',
    icon: History,
    permission: 'audit.read',
    label: { en: 'Activity log', ar: 'سجل النشاط' },
    description: { en: 'Every change, newest first', ar: 'كل تغيير، الأحدث أولا' },
  },
  {
    key: 'posts',
    group: 'moderation',
    icon: Newspaper,
    permission: 'posts.review',
    label: { en: 'Posts', ar: 'المقالات' },
    description: { en: 'Owner posts waiting for a decision', ar: 'مقالات الملاك في انتظار القرار' },
  },
  {
    key: 'suggestions',
    group: 'moderation',
    icon: FileEdit,
    permission: 'suggestions.review',
    label: { en: 'Corrections', ar: 'التصحيحات' },
    description: { en: 'Suggested fixes to the guides and specs', ar: 'تصحيحات مقترحة للأدلة والمواصفات' },
  },
  {
    key: 'comments',
    group: 'moderation',
    icon: MessageSquare,
    permission: 'comments.review',
    label: { en: 'Comments', ar: 'التعليقات' },
    description: { en: 'Comments on owner posts', ar: 'التعليقات على مقالات الملاك' },
  },
  {
    key: 'part-reviews',
    group: 'moderation',
    icon: Star,
    // The same moderators as comments: one trust, two kinds of owner writing.
    permission: 'comments.review',
    label: { en: 'Accessory reviews', ar: 'مراجعات الإكسسوارات' },
    description: { en: 'Owner ratings of accessories', ar: 'تقييمات الملاك للإكسسوارات' },
  },
  {
    key: 'center-reviews',
    group: 'moderation',
    icon: Star,
    permission: 'comments.review',
    label: { en: 'Center reviews', ar: 'مراجعات المراكز' },
    description: { en: 'Owner ratings of protection centers', ar: 'تقييمات الملاك لمراكز الحماية' },
  },
  {
    key: 'insurer-reviews',
    group: 'moderation',
    icon: Star,
    permission: 'comments.review',
    label: { en: 'Insurer reviews', ar: 'مراجعات التأمين' },
    description: { en: 'Owner ratings of insurance companies', ar: 'تقييمات الملاك لشركات التأمين' },
  },
  {
    key: 'dealers',
    group: 'market',
    icon: Store,
    permission: 'dealers.manage',
    label: { en: 'Dealers', ar: 'الوكلاء' },
    description: { en: 'The dealer list shown on the Egypt page', ar: 'قائمة الوكلاء في صفحة مصر' },
  },
  {
    key: 'pricing',
    group: 'market',
    icon: BadgeDollarSign,
    permission: 'pricing.manage',
    label: { en: 'Prices', ar: 'الأسعار' },
    description: { en: 'Current list price of each trim', ar: 'السعر الرسمي الحالي لكل فئة' },
  },
  {
    key: 'accessories',
    group: 'market',
    icon: Package,
    permission: 'parts.manage',
    label: { en: 'Accessories', ar: 'الإكسسوارات' },
    description: {
      en: 'Accessories and protection parts, local and imported',
      ar: 'الإكسسوارات وقطع الحماية، المحلية والمستوردة',
    },
  },
  {
    key: 'insurance',
    group: 'market',
    icon: ShieldHalf,
    permission: 'insurance.manage',
    merchant: 'merchant.insurer',
    label: { en: 'Car insurance', ar: 'تأمين السيارة' },
    description: { en: 'Insurers, their plans, rates, cover and cashback', ar: 'شركات التأمين وخططها ونسبها وتغطيتها والاسترداد' },
  },
  {
    key: 'orders',
    group: 'orders',
    icon: ShoppingBag,
    permission: 'orders.manage',
    label: { en: 'Order requests', ar: 'طلبات الشراء' },
    description: { en: 'Accessories users asked us to order for them', ar: 'الإكسسوارات التي طلبها المستخدمون' },
  },
  {
    key: 'protection',
    group: 'market',
    icon: ShieldPlus,
    permission: 'centers.manage',
    merchant: 'merchant.center',
    label: { en: 'Protection centers', ar: 'مراكز الحماية' },
    description: {
      en: 'Where to fit PPF, ceramic and film, with each package',
      ar: 'أماكن تركيب الحماية والنانو والأفلام، بكل باقة',
    },
  },
  {
    key: 'emails',
    group: 'people',
    icon: Mail,
    permission: 'emails.send',
    label: { en: 'Emails', ar: 'البريد' },
    description: {
      en: 'Preview what the site sends, test it, and write announcements',
      ar: 'معاينة رسائل الموقع وتجربتها وكتابة الإعلانات',
    },
  },
  {
    key: 'users',
    group: 'people',
    icon: Users,
    permission: 'users.manage',
    label: { en: 'Accounts', ar: 'الحسابات' },
    description: { en: 'Roles, blocking and individual permissions', ar: 'الأدوار والحظر والصلاحيات الفردية' },
  },
  {
    key: 'roles',
    group: 'people',
    icon: KeySquare,
    permission: 'users.manage',
    label: { en: 'Roles', ar: 'الأدوار' },
    description: { en: 'Named sets of permissions to give to people', ar: 'مجموعات صلاحيات مسماة تُمنح للأشخاص' },
  },
  {
    key: 'permissions',
    group: 'people',
    icon: KeyRound,
    permission: 'users.manage',
    label: { en: 'Permissions', ar: 'الصلاحيات' },
    description: { en: 'Who can do what, at a glance', ar: 'من يستطيع فعل ماذا، بنظرة واحدة' },
  },
]

export const ACCOUNT_GROUPS: PanelGroupDef[] = [
  { key: 'home', label: { en: 'Overview', ar: 'نظرة عامة' }, icon: LayoutDashboard },
  { key: 'contribute', label: { en: 'Contributions', ar: 'المساهمات' }, icon: PenLine },
  { key: 'account', label: { en: 'Account', ar: 'الحساب' }, icon: UserCog },
]

export const ACCOUNT_SECTIONS: PanelSection[] = [
  {
    key: 'dashboard',
    group: 'home',
    icon: LayoutDashboard,
    label: { en: 'Dashboard', ar: 'لوحة التحكم' },
    description: { en: 'Your contributions at a glance', ar: 'مساهماتك بنظرة واحدة' },
  },
  {
    key: 'posts',
    group: 'contribute',
    icon: FileText,
    label: { en: 'My posts', ar: 'مقالاتي' },
    description: { en: 'Everything you have written, and its review status', ar: 'كل ما كتبته وحالة مراجعته' },
  },
  {
    key: 'suggestions',
    group: 'contribute',
    icon: ListChecks,
    label: { en: 'My corrections', ar: 'تصحيحاتي' },
    description: { en: 'Corrections you suggested', ar: 'التصحيحات التي اقترحتها' },
  },
  {
    key: 'new-post',
    group: 'contribute',
    icon: FilePlus2,
    label: { en: 'Write a post', ar: 'اكتب مقالا' },
    description: { en: 'An admin reviews it before it goes live', ar: 'يراجعه المشرف قبل نشره' },
  },
  {
    key: 'suggest',
    group: 'contribute',
    icon: FileEdit,
    label: { en: 'Suggest a correction', ar: 'اقترح تصحيحا' },
    description: { en: 'Point out something the site gets wrong', ar: 'أشر إلى خطأ في الموقع' },
  },
  {
    key: 'orders',
    group: 'home',
    icon: ShoppingBag,
    label: { en: 'My orders', ar: 'طلباتي' },
    description: { en: 'Accessory requests you sent, and where they are', ar: 'طلبات الإكسسوارات التي أرسلتها وحالتها' },
  },
  {
    key: 'profile',
    group: 'account',
    icon: UserCog,
    label: { en: 'Profile', ar: 'الملف الشخصي' },
    description: { en: 'Your details and which V27 you own', ar: 'بياناتك وأي V27 تملك' },
  },
  {
    key: 'security',
    group: 'account',
    icon: KeyRound,
    label: { en: 'Security', ar: 'الأمان' },
    description: { en: 'Password and sign-in', ar: 'كلمة المرور وتسجيل الدخول' },
  },
]

/** The admin sections this person may open, in sidebar order. */
export function visibleAdminSections(can: (permission: string) => boolean): PanelSection[] {
  return ADMIN_SECTIONS.filter(
    (section) => !section.permission || can(section.permission) || (section.merchant !== undefined && can(section.merchant)),
  )
}
