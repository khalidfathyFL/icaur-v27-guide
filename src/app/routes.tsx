import { getFeature } from '../content'
import { Redirect } from '../components/Redirect'
import { AccessoriesPage, AccessoryPage } from '../pages/AccessoriesPage'
import { AdminPage } from '../pages/AdminPage'
import { CartPage } from '../pages/CartPage'
import { InsurancePage, InsurerPage } from '../pages/InsurancePage'
import { ProtectionCenterPage, ProtectionPage } from '../pages/ProtectionPage'
import { SignInPage } from '../pages/AccountPage'
import { AccountPanel } from '../pages/account/AccountPanel'
import { BlogPage, PostPage } from '../pages/BlogPage'
import { EgyptPage } from '../pages/EgyptPage'
import { GuidesPage } from '../pages/GuidesPage'
import { HomePage } from '../pages/HomePage'
import { FeaturePage } from '../pages/FeaturePage'
import { ComparePage, SpecsPage } from '../pages/SpecsPage'
import {
  GlossaryPage,
  NotFoundPage,
  ReviewsPage,
  SourcesPage,
  VideosPage,
} from '../pages/LibraryPages'

const GUIDE_PREFIX = '/guides/'
const BLOG_PREFIX = '/blog/'
const ACCESSORY_PREFIX = '/accessories/'
const PROTECTION_PREFIX = '/protection/'
const INSURANCE_PREFIX = '/insurance/'

const STATIC_ROUTES: Record<string, (params: URLSearchParams) => React.ReactElement> = {
  '/': () => <HomePage />,
  '/guides': (params) => <GuidesPage topic={params.get('topic')} query={params.get('q') ?? ''} />,
  '/egypt': () => <EgyptPage />,
  '/specs': () => <SpecsPage />,
  '/compare/play-vs-wild': () => <ComparePage />,
  '/reviews': () => <ReviewsPage />,
  '/videos': () => <VideosPage />,
  '/sources': () => <SourcesPage />,
  '/glossary': () => <GlossaryPage />,
  '/blog': () => <BlogPage />,
  '/accessories': (params) => <AccessoriesPage params={params} />,
  '/protection': (params) => <ProtectionPage params={params} />,
  '/cart': () => <CartPage />,
  '/insurance': () => <InsurancePage />,
  '/signin': (params) => <SignInPage next={params.get('next')} />,
  // Both moved into the account panel; old links and bookmarks still land.
  '/contribute': () => <Redirect to="/account/new-post" />,
  '/profile': () => <Redirect to="/account/profile" />,
}

const PANELS = ['/admin', '/account'] as const

/** The panel a path belongs to and the section within it, e.g. `/admin/posts`. */
export function panelOf(path: string): { panel: (typeof PANELS)[number]; section: string } | null {
  for (const panel of PANELS) {
    if (path === panel || path.startsWith(`${panel}/`)) {
      return { panel, section: path.slice(panel.length + 1).split('/')[0] ?? '' }
    }
  }
  return null
}

/** The admin and account panels render full-screen, outside the site header and footer. */
export function resolvePanelRoute(path: string, params: URLSearchParams, route: string): React.ReactElement | null {
  const match = panelOf(path)
  if (!match) return null
  return match.panel === '/admin' ? (
    <AdminPage section={match.section} params={params} routeKey={route} />
  ) : (
    <AccountPanel section={match.section} routeKey={route} />
  )
}

/**
 * Arabic post slugs reach the address bar percent-encoded (`%D8%A7…`), and
 * `location.hash` hands them back that way. Without decoding, the API is asked
 * for a slug no post has.
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    // A malformed escape: let the API answer "not found" for it as typed.
    return slug
  }
}

export function resolveRoute(path: string, params: URLSearchParams): React.ReactElement {
  const staticRoute = STATIC_ROUTES[path]
  if (staticRoute) return staticRoute(params)

  if (path.startsWith(GUIDE_PREFIX)) {
    const feature = getFeature(path.slice(GUIDE_PREFIX.length))
    if (feature) return <FeaturePage feature={feature} />
  }

  if (path.startsWith(BLOG_PREFIX)) {
    return <PostPage slug={decodeSlug(path.slice(BLOG_PREFIX.length))} />
  }

  if (path.startsWith(ACCESSORY_PREFIX)) {
    return <AccessoryPage slug={decodeSlug(path.slice(ACCESSORY_PREFIX.length))} />
  }

  if (path.startsWith(PROTECTION_PREFIX)) {
    return <ProtectionCenterPage slug={decodeSlug(path.slice(PROTECTION_PREFIX.length))} />
  }

  if (path.startsWith(INSURANCE_PREFIX)) {
    return <InsurerPage slug={decodeSlug(path.slice(INSURANCE_PREFIX.length))} />
  }

  return <NotFoundPage />
}
