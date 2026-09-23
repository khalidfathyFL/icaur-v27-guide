import { features } from '../../content'
import type { Feature } from '../../content/types'

const MAX_RESULTS = 8

/** Field weights: a name match should always outrank a body match. */
const WEIGHT = {
  name: 6,
  keyword: 4,
  summary: 2,
  body: 1,
} as const

const includes = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle)

/**
 * Ranked feature search across both languages. Owners type Arabic and English
 * interchangeably ("استبن", "spare"), so every field is searched in both.
 */
export function searchFeatures(rawQuery: string): Feature[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []

  return features
    .map((feature) => {
      const names = [feature.name.en, feature.name.ar]
      const summaries = [feature.summary.en, feature.summary.ar]
      const body = [
        feature.location.en,
        feature.location.ar,
        ...feature.steps.en,
        ...feature.steps.ar,
      ]

      const score =
        (names.some((value) => includes(value, query)) ? WEIGHT.name : 0) +
        (feature.keywords.some((keyword) => includes(keyword, query)) ? WEIGHT.keyword : 0) +
        (summaries.some((value) => includes(value, query)) ? WEIGHT.summary : 0) +
        (body.some((value) => includes(value, query)) ? WEIGHT.body : 0)

      return { feature, score }
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((result) => result.feature)
}
