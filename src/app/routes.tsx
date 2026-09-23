import { getFeature } from '../content'
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
}

export function resolveRoute(route: string): React.ReactElement {
  const staticRoute = STATIC_ROUTES[route]
  if (staticRoute) return staticRoute()

  if (route.startsWith(GUIDE_PREFIX)) {
    const feature = getFeature(route.slice(GUIDE_PREFIX.length))
    if (feature) return <FeaturePage feature={feature} />
  }

  return <NotFoundPage />
}
