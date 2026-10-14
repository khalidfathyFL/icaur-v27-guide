import {
  BookOpen,
  Clapperboard,
  FileText,
  GitCompareArrows,
  Package,
  ShieldHalf,
  ShieldPlus,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { apiConfigured } from '../lib/api'

export type NavItem = { href: string; en: string; ar: string }

/** Always visible in the desktop header: the pages owners reach for most. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/guides', en: 'Guides', ar: 'الأدلة' },
  { href: '/guides/screen-map', en: 'Screen', ar: 'الشاشة' },
  { href: '/egypt', en: 'Egypt Prices', ar: 'أسعار مصر' },
  { href: '/specs', en: 'Specs', ar: 'المواصفات' },
  // The community is the point of the site, so it earns a top-level slot
  // rather than sitting behind "More".
  { href: '/blog', en: 'Owner Posts', ar: 'مقالات الملاك' },
]

/** A page in the "More" menu, with an icon and a line saying what is there. */
export type NavLink = NavItem & {
  icon: LucideIcon
  hint: { en: string; ar: string }
  /** Recently added, so it carries a "New" tag until it is familiar. */
  isNew?: boolean
}

export type NavGroup = { key: string; en: string; ar: string; items: NavLink[] }

/**
 * Everything beyond the main links, in three groups so a reader scanning the
 * menu finds the kind of page first: about the car, about owning one, and
 * the reference material behind the guides.
 */
export const SECONDARY_GROUPS: NavGroup[] = [
  {
    key: 'car',
    en: 'Your V27',
    ar: 'سيارتك V27',
    items: [
      { href: '/compare/play-vs-wild', en: 'Play vs Wild', ar: 'Play vs Wild', icon: GitCompareArrows, hint: { en: 'Which trim suits you', ar: 'أي فئة تناسبك' } },
      { href: '/reviews', en: 'Reviews', ar: 'المراجعات', icon: Star, hint: { en: 'What reviewers and owners say', ar: 'ماذا يقول المراجعون والملاك' } },
      { href: '/videos', en: 'Videos', ar: 'الفيديوهات', icon: Clapperboard, hint: { en: 'Walkarounds and tests', ar: 'جولات واختبارات' } },
    ],
  },
  {
    key: 'own',
    en: 'Own & protect',
    ar: 'الملكية والحماية',
    // The catalog lives in the API, so a build without one does not offer it.
    items: apiConfigured
      ? [
          { href: '/accessories', en: 'Accessories', ar: 'الإكسسوارات', icon: Package, hint: { en: 'Parts and upgrades, ordered for you', ar: 'قطع وإضافات نطلبها لك' } },
          { href: '/protection', en: 'Protection centers', ar: 'مراكز الحماية', icon: ShieldPlus, hint: { en: 'PPF, ceramic and tint', ar: 'حماية ونانو وأفلام' } },
          { href: '/insurance', en: 'Car insurance', ar: 'تأمين السيارة', icon: ShieldHalf, hint: { en: 'Plans, yearly cost and cashback', ar: 'الخطط والتكلفة السنوية والاسترداد' }, isNew: true },
        ]
      : [],
  },
  {
    key: 'reference',
    en: 'Reference',
    ar: 'المراجع',
    items: [
      { href: '/sources', en: 'Sources', ar: 'المصادر', icon: FileText, hint: { en: 'Manuals and official documents', ar: 'الأدلة والوثائق الرسمية' } },
      { href: '/glossary', en: 'Glossary', ar: 'القاموس', icon: BookOpen, hint: { en: 'Terms explained', ar: 'شرح المصطلحات' } },
    ],
  },
].filter((group) => group.items.length > 0)

/** The same pages as one list, for places that do not group them. */
export const SECONDARY_NAV: NavLink[] = SECONDARY_GROUPS.flatMap((group) => group.items)

/**
 * "Guides" stays lit on every guide page except the screen guide, which has
 * its own nav entry.
 */
export function isActive(path: string, href: string): boolean {
  if (path === href) return true
  if (href === '/guides') return path.startsWith('/guides/') && path !== '/guides/screen-map'
  return path.startsWith(`${href}/`)
}
