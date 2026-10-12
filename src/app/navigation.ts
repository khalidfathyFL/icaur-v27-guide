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

/** Research and community pages, grouped under "More" on desktop. */
export const SECONDARY_NAV: NavItem[] = [
  { href: '/compare/play-vs-wild', en: 'Play vs Wild', ar: 'Play vs Wild' },
  { href: '/reviews', en: 'Reviews', ar: 'المراجعات' },
  { href: '/videos', en: 'Videos', ar: 'الفيديوهات' },
  // The catalog lives in the API, so a build without one does not offer it.
  ...(apiConfigured
    ? [
        { href: '/accessories', en: 'Accessories', ar: 'الإكسسوارات' },
        { href: '/protection', en: 'Protection centers', ar: 'مراكز الحماية' },
      ]
    : []),
  { href: '/sources', en: 'Sources', ar: 'المصادر' },
  { href: '/glossary', en: 'Glossary', ar: 'القاموس' },
]

/**
 * "Guides" stays lit on every guide page except the screen guide, which has
 * its own nav entry.
 */
export function isActive(path: string, href: string): boolean {
  if (path === href) return true
  if (href === '/guides') return path.startsWith('/guides/') && path !== '/guides/screen-map'
  return path.startsWith(`${href}/`)
}
