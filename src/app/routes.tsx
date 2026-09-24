import { getFeature } from '../content'
import { AdminPage } from '../pages/AdminPage'
import { SignInPage } from '../pages/AccountPage'
import { BlogPage, PostPage } from '../pages/BlogPage'
import { ContributePage } from '../pages/ContributePage'
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

const STATIC_ROUTES: Record<string, () => React.ReactElement> = {
  '/': () => <HomePage />,
  '/guides': () => <GuidesPage />,
  '/egypt': () => <EgyptPage />,
  '/specs': () => <SpecsPage />,
  '/compare/play-vs-wild': () => <ComparePage />,
  '/reviews': () => <ReviewsPage />,
  '/videos': () => <VideosPage />,
  '/sources': () => <SourcesPage />,
  '/glossary': () => <GlossaryPage />,
  '/blog': () => <BlogPage />,
  '/contribute': () => <ContributePage />,
  '/signin': () => <SignInPage />,
  '/admin': () => <AdminPage />,
}

export function resolveRoute(route: string): React.ReactElement {
  const staticRoute = STATIC_ROUTES[route]
  if (staticRoute) return staticRoute()

  if (route.startsWith(GUIDE_PREFIX)) {
    const feature = getFeature(route.slice(GUIDE_PREFIX.length))
    if (feature) return <FeaturePage feature={feature} />
  }

  if (route.startsWith(BLOG_PREFIX)) {
    return <PostPage slug={route.slice(BLOG_PREFIX.length)} />
  }

  return <NotFoundPage />
}
