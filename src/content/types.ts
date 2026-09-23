/**
 * Content model for the iCAUR V27 owner knowledge base.
 *
 * Every piece of owner-facing copy is stored bilingually so the UI never has to
 * look a translation up by its Arabic string. Anything market-specific carries a
 * `Verification` status, because the editorial rule for this site is that
 * evidence from China or another export market is never presented as an Egypt fact.
 */

export type Trim = 'play' | 'wild'

/** Confidence that a feature exists on a given market/trim. */
export type Verification =
  | 'confirmed-egypt'
  | 'confirmed-export'
  | 'likely'
  | 'verify'
  | 'not-available'

/** A string that exists in both site languages. */
export type Localized = {
  en: string
  ar: string
}

/** A list that exists in both site languages. The two sides are parallel, not zipped. */
export type LocalizedList = {
  en: string[]
  ar: string[]
}

export type CategoryId =
  | 'screen'
  | 'adas'
  | 'energy'
  | 'wheels'
  | 'comfort'
  | 'exterior'
  | 'storage'
  | 'driving'
  | 'maintenance'
  | 'troubleshooting'

export type Category = {
  id: CategoryId
  name: Localized
}

/** Per-market verification status for one feature. */
export type Availability = {
  play: Verification
  wild: Verification
  china: Verification
  exportOther: Verification
}

export type Market = 'Egypt' | 'Global' | 'Colombia' | 'China' | 'Other export'

export type Source = {
  id: string
  title: string
  /** Absolute URL, or a path relative to the site base for bundled documents. */
  url: string
  market: Market
  /** ISO date the source was last checked. */
  checked: string
}

export type Video = {
  id: string
  title: string
  platform: string
  url: string
  language: string
  featureTags: string[]
  marketShown: string
  notes: string
}

export type Feature = {
  id: string
  slug: string
  categoryId: CategoryId
  name: Localized
  summary: Localized
  location: Localized
  /** Breadcrumb through the infotainment menus, where the feature lives on screen. */
  screenPath?: string[]
  steps: LocalizedList
  requirements: LocalizedList
  unavailableWhen: LocalizedList
  safetyNotes: LocalizedList
  availability: Availability
  lastVerified: string
  /** Free-text search terms in either language. */
  keywords: string[]
  sourceIds: string[]
  videoIds?: string[]
  /** Slugs of related features. */
  related: string[]
}

export type Spec = {
  id: string
  label: Localized
  value: Localized
  note: Localized
}

export type Comparison = {
  label: Localized
  play: string
  wild: string
}

export type GlossaryEntry = {
  term: string
  definition: Localized
}

export type Review = {
  id: string
  title: string
  outlet: string
  url: string
  date: string
  market: 'UAE' | 'Qatar' | 'China' | 'Australia' | 'GCC' | 'Owner community'
  language: 'English' | 'Arabic' | 'Other'
  verdict: Localized
  positives: LocalizedList
  watchouts: LocalizedList
}
