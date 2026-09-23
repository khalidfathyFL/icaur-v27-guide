import { categories } from './categories'
import { features } from './features'
import { glossary } from './glossary'
import { reviews } from './reviews'
import { sources } from './sources'
import { comparison, specs } from './specs'
import * as egypt from './egypt'
import { videos } from './videos'
import type { Category, CategoryId, Feature, Source, Video } from './types'

export { categories, comparison, features, glossary, reviews, sources, specs, videos }
export { egypt }
export * from './types'
export { imageUrls } from './images'

const byKey = <T,>(items: T[], key: (item: T) => string) =>
  new Map(items.map((item) => [key(item), item]))

const featuresBySlug = byKey(features, (feature) => feature.slug)
const categoriesById = byKey(categories, (category) => category.id)
const sourcesById = byKey(sources, (source) => source.id)
const videosById = byKey(videos, (video) => video.id)

export const getFeature = (slug: string): Feature | undefined => featuresBySlug.get(slug)

export const getCategory = (id: CategoryId): Category | undefined => categoriesById.get(id)

/** Resolves ids to records, silently dropping ids with no match. */
const resolve = <T,>(map: Map<string, T>, ids: readonly string[] = []): T[] =>
  ids.map((id) => map.get(id)).filter((item): item is T => item !== undefined)

export const getSources = (ids: readonly string[]): Source[] => resolve(sourcesById, ids)

export const getVideos = (ids: readonly string[] = []): Video[] => resolve(videosById, ids)

export const getFeatures = (slugs: readonly string[]): Feature[] =>
  resolve(featuresBySlug, slugs)

/** Features grouped in the category order defined by `categories`. */
export const featuresByCategory = (): { category: Category; features: Feature[] }[] =>
  categories
    .map((category) => ({
      category,
      features: features.filter((feature) => feature.categoryId === category.id),
    }))
    .filter((group) => group.features.length > 0)

/** Slugs promoted on the home page, in the order owners ask about them. */
export const POPULAR_SLUGS = [
  'spare-wheel-remove',
  'charging',
  'driver-assistance',
  'screen-map',
  'auto-park',
  'tpms',
] as const
