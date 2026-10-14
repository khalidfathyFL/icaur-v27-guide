import type { ObjectId } from 'mongodb'
import { HttpError } from './http.js'

/** Mirrors the site's bilingual content shape. */
export type Localized = { en: string; ar: string }

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type PostDoc = {
  _id: ObjectId
  slug: string
  title: Localized
  /** Markdown, written by a contributor. */
  body: Localized
  excerpt: Localized
  authorId: string
  authorName: string
  status: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  /** Pinned posts head the public list, the most recently pinned first. */
  pinnedAt?: string
  /** When everyone was emailed about it; set once, so a re-approval never announces it again. */
  announcedAt?: string
  createdAt: string
  updatedAt: string
}

/** What a suggested edit points at. */
export type SuggestionTarget = {
  kind: 'feature' | 'spec' | 'equipment' | 'dealer' | 'other'
  /** Slug or id of the thing being corrected; free text for `other`. */
  id: string
  /** Which field the contributor is correcting, when they know. */
  field?: string
}

export type SuggestionDoc = {
  _id: ObjectId
  target: SuggestionTarget
  /** What the site says now, as the contributor sees it. */
  current: string
  /** What they say it should be. */
  proposed: string
  reason: string
  authorId: string
  authorName: string
  status: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
}

export type CommentDoc = {
  _id: ObjectId
  postId: string
  /** Denormalised so the moderation queue reads without joining to posts. */
  postTitle: string
  body: string
  authorId: string
  authorName: string
  status: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
}

export type DealerDoc = {
  _id: ObjectId
  name: string
  area: string
  phone?: string
  /** Whether they were reported as selling at the official list price. */
  sellsAtListPrice: boolean
  notes?: string
  active: boolean
  verifiedAt: string
  createdAt: string
  updatedAt: string
}

export type PricingDoc = {
  _id: ObjectId
  trim: 'play' | 'wild'
  priceEgp: number
  note?: string
  updatedAt: string
  updatedBy: string
}

export const PART_CATEGORIES = [
  'protection',
  'exterior',
  'interior',
  'electronics',
  'lighting',
  'cargo-roof',
  'offroad',
  'maintenance',
] as const
export type PartCategory = (typeof PART_CATEGORIES)[number]

/** Bought from a shop in Egypt, or imported from a Chinese seller. */
export const PART_SOURCES = ['local', 'china'] as const
export type PartSource = (typeof PART_SOURCES)[number]

export const PART_AVAILABILITY = ['in_stock', 'on_order', 'unavailable'] as const
export type PartAvailability = (typeof PART_AVAILABILITY)[number]

export const IMPORT_CURRENCIES = ['CNY', 'USD'] as const
export type ImportCurrency = (typeof IMPORT_CURRENCIES)[number]

export type PartPrice = {
  /** The item itself, in EGP. For an import, what it costs converted. */
  amountEgp: number
  installEgp?: number
  /** Imports only: the price as the seller lists it. */
  originalAmount?: number
  originalCurrency?: ImportCurrency
  shippingEgp?: number
  customsEgp?: number
}

export type PartSupplier = {
  name: string
  kind: 'shop' | 'online'
  city?: string
  phone?: string
  whatsapp?: string
  url?: string
}

export type PartSpecs = {
  material?: string
  color?: string
  dimensions?: string
  weightKg?: number
  warrantyMonths?: number
  /** Empty means it fits both trims. */
  fitsTrims: ('play' | 'wild')[]
  /** Customs, shipping and anything else worth knowing before ordering. */
  importNotes?: Localized
}

/** A photo in Vercel Blob; `pathname` is kept so the file can be deleted. */
export type PartImage = { url: string; pathname: string; alt?: string }

export type PartDoc = {
  _id: ObjectId
  slug: string
  name: Localized
  description: Localized
  category: PartCategory
  /** Free text inside the category, e.g. "PPF" or "Skid plate". */
  subcategory?: string
  source: PartSource
  price: PartPrice
  availability: PartAvailability
  leadTimeDays?: { min: number; max: number }
  suppliers: PartSupplier[]
  specs: PartSpecs
  images: PartImage[]
  /** Denormalised from approved reviews so the list sorts without a join. */
  ratingAvg: number
  ratingCount: number
  active: boolean
  /** When someone last confirmed the price, which drifts fast for imports. */
  priceCheckedAt: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** What a protection center does. A package is one of these. */
export const PROTECTION_SERVICES = [
  'ppf',
  'ceramic',
  'tint',
  'windshield',
  'interior',
  'underbody',
  'paint-correction',
  'wrap',
] as const
export type ProtectionService = (typeof PROTECTION_SERVICES)[number]

/** The parts of the car a package can cover. */
export const COVERAGE_AREAS = [
  'full-body',
  'full-front',
  'front-bumper',
  'hood',
  'fenders',
  'mirrors',
  'headlights',
  'a-pillars',
  'roof',
  'doors',
  'door-edges',
  'door-cups',
  'rocker-panels',
  'rear-bumper',
  'trunk-ledge',
  'windows',
  'windshield',
  'sunroof',
  'interior-screens',
  'interior-trim',
  'wheels',
  'underbody',
] as const
export type CoverageArea = (typeof COVERAGE_AREAS)[number]

export type CenterPackage = {
  /** Stable within the center, so the page can link to one package. */
  id: string
  name: Localized
  service: ProtectionService
  coverage: CoverageArea[]
  priceEgp: number
  /** Only when the Wild is charged differently from the Play. */
  wildPriceEgp?: number
  durationDays?: { min: number; max: number }
  /** Film or coating maker, e.g. XPEL, 3M, Gyeon. */
  brand?: string
  /** The maker's product line, e.g. Ultimate Plus. */
  product?: string
  /** TPU, TPH, ceramic, graphene… */
  materialType?: string
  thicknessMil?: number
  selfHealing?: boolean
  warrantyYears?: number
  /** Short lines: "Paint correction", "Two follow-up washes". */
  inclusions: string[]
  notes?: Localized
}

export type CenterDoc = {
  _id: ObjectId
  slug: string
  name: Localized
  description: Localized
  city: string
  area?: string
  address?: string
  /** A Google Maps (or similar) link to the workshop. */
  mapUrl?: string
  phone?: string
  whatsapp?: string
  website?: string
  instagram?: string
  hours?: string
  /** Derived from the packages, so the list can filter without unwinding them. */
  services: ProtectionService[]
  packages: CenterPackage[]
  images: PartImage[]
  ratingAvg: number
  ratingCount: number
  active: boolean
  /** When someone last confirmed the packages and prices. */
  checkedAt: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** One accessory a signed-in user wants, before they send the request. */
export type CartItem = {
  partId: string
  quantity: number
  /** Colour, size, "for the Wild"… */
  note?: string
  /** They want it fitted, not only delivered. */
  fitting: boolean
  addedAt: string
}

/** The request list, saved per account so it survives devices and sign-outs. */
export type CartDoc = {
  _id: ObjectId
  userId: string
  items: CartItem[]
  updatedAt: string
}

export const ORDER_STATUSES = ['new', 'confirmed', 'ordered', 'arrived', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['unpaid', 'deposit', 'paid'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/**
 * A line as it was when the request was sent. Prices and names are copied,
 * because the accessory's own record keeps changing after the order exists.
 */
export type OrderItem = {
  partId: string
  slug: string
  name: Localized
  source: PartSource
  quantity: number
  note?: string
  fitting: boolean
  /** Item plus shipping and customs, per unit. */
  unitPriceEgp: number
  /** Fitting for the whole line, when asked for and known. */
  installEgp?: number
}

export type OrderContact = {
  name: string
  phone: string
  whatsapp?: string
  city: string
  address?: string
}

export type OrderEvent = {
  status: OrderStatus
  at: string
  by: string
  /** Shown to the customer with the status change. */
  note?: string
}

export type OrderDoc = {
  _id: ObjectId
  /** Human-friendly and sequential, e.g. IC-0007, for phone calls and WhatsApp. */
  number: string
  userId: string
  userEmail: string
  contact: OrderContact
  note?: string
  items: OrderItem[]
  estimatedTotalEgp: number
  /** The price agreed with the customer, once there is one. */
  finalTotalEgp?: number
  status: OrderStatus
  history: OrderEvent[]
  payment: { status: PaymentStatus; amountEgp?: number; note?: string }
  /** For whoever handles orders; never sent to the customer. */
  staffNote?: string
  createdAt: string
  updatedAt: string
}

/* ---------- validation ---------- */

const bad = (message: string): never => {
  throw new HttpError(400, message)
}

export function requireString(
  value: unknown,
  field: string,
  { min = 1, max = 4000 }: { min?: number; max?: number } = {},
): string {
  if (typeof value !== 'string') return bad(`${field} must be text.`)

  const trimmed = value.trim()
  if (trimmed.length < min) return bad(`${field} must be at least ${min} characters.`)
  if (trimmed.length > max) return bad(`${field} must be at most ${max} characters.`)

  return trimmed
}

export function optionalString(
  value: unknown,
  field: string,
  options?: { max?: number },
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requireString(value, field, { min: 1, max: options?.max ?? 4000 })
}

/**
 * Either side may be empty: contributors write in English, Arabic or both.
 * At least one side must have text.
 */
export function requireLocalized(value: unknown, field: string, max = 20000): Localized {
  if (typeof value !== 'object' || value === null) return bad(`${field} must have en or ar text.`)

  const candidate = value as Record<string, unknown>
  const side = (text: unknown, label: string): string => {
    if (text === undefined || text === null) return ''
    if (typeof text !== 'string') return bad(`${field} (${label}) must be text.`)
    const trimmed = text.trim()
    if (trimmed.length > max) return bad(`${field} (${label}) must be at most ${max} characters.`)
    return trimmed
  }

  const localized = { en: side(candidate.en, 'English'), ar: side(candidate.ar, 'Arabic') }
  if (!localized.en && !localized.ar) return bad(`${field} needs English or Arabic text.`)

  return localized
}

/** A one-line label for logs and lists, from whichever language was written. */
export const firstWritten = (value: Localized): string => value.en || value.ar

export function requireEmail(value: unknown): string {
  const email = requireString(value, 'Email', { max: 200 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a valid email address.')
  return email
}

/**
 * Matches the rule the MicroBIM site enforces, so a contributor who has an
 * account on either site meets the same bar. The client mirrors this regex for
 * an instant message; this copy is the one that actually protects the account,
 * because the endpoint can be called without the form.
 */
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,50}$/

export function requirePassword(value: unknown): string {
  const password = requireString(value, 'Password', { min: 8, max: 50 })

  if (!STRONG_PASSWORD.test(password)) {
    return bad(
      'Password needs 8+ characters with an uppercase letter, a lowercase letter, a number and a symbol.',
    )
  }

  return password
}

/** Loose on purpose: owners write numbers with +, spaces and dashes. */
export function optionalPhone(value: unknown): string | undefined {
  const phone = optionalString(value, 'Phone number', { max: 32 })
  if (phone === undefined) return undefined

  if (!/^[+]?[\d\s()-]{6,32}$/.test(phone)) {
    return bad('Enter a phone number using digits, spaces, brackets, + or -.')
  }

  return phone
}

export function optionalTrim(value: unknown): 'play' | 'wild' | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (value === 'play' || value === 'wild') return value
  return bad('Trim must be play or wild.')
}

export type Ownership = 'owner' | 'interested'

export function requireOwnership(value: unknown): Ownership {
  if (value === 'owner' || value === 'interested') return value
  return bad('Tell us whether you own a V27 or are just interested.')
}

export function requireReviewStatus(value: unknown): Exclude<ReviewStatus, 'pending'> {
  if (value === 'approved' || value === 'rejected') return value
  return bad('Decision must be approved or rejected.')
}

export function requireTarget(value: unknown): SuggestionTarget {
  if (typeof value !== 'object' || value === null) return bad('Tell us what this edit is about.')

  const candidate = value as Record<string, unknown>
  const kinds = ['feature', 'spec', 'equipment', 'dealer', 'other'] as const
  const kind = kinds.find((item) => item === candidate.kind)
  if (!kind) return bad('Pick what the edit applies to.')

  return {
    kind,
    id: requireString(candidate.id, 'Target', { max: 200 }),
    field: optionalString(candidate.field, 'Field', { max: 200 }),
  }
}

/** URL-safe slug, with a short random suffix so titles can repeat. */
export function slugify(title: string, fallback = 'post'): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const suffix = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${suffix}` : `${fallback}-${suffix}`
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const match = allowed.find((item) => item === value)
  if (match === undefined) return bad(`${field} must be one of: ${allowed.join(', ')}.`)
  return match
}

/** Same bounds as the trim prices: positive, finite, under 100 million, whole pounds. */
export function requireMoneyEgp(value: unknown, field: string): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    return bad(`${field} must be a positive amount in EGP.`)
  }
  return Math.round(amount)
}

export function optionalMoney(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requireMoneyEgp(value, field)
}

export function optionalNumber(
  value: unknown,
  field: string,
  { min = 0, max = 1_000_000 }: { min?: number; max?: number } = {},
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || number < min || number > max) {
    return bad(`${field} must be a number between ${min} and ${max}.`)
  }
  return number
}

/** Only http(s), so a supplier link can never be a javascript: URL. */
export function optionalUrl(value: unknown, field: string): string | undefined {
  const url = optionalString(value, field, { max: 1000 })
  if (url === undefined) return undefined

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error()
    return parsed.toString()
  } catch {
    return bad(`${field} must be a web address starting with https://.`)
  }
}

/**
 * Photos must live in this project's Blob store. Accepting any URL would let a
 * part show images hot-linked from anywhere, which break or change silently.
 */
const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/

/** True for an https address in this project's Blob store. Post images use it too. */
export function isBlobUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && BLOB_HOST.test(parsed.hostname)
  } catch {
    return false
  }
}

export function requireBlobImages(value: unknown): PartImage[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return bad('Photos must be a list.')
  if (value.length > 8) return bad('A part can have at most 8 photos.')

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) return bad(`Photo ${index + 1} is not valid.`)
    const candidate = item as Record<string, unknown>
    const url = requireString(candidate.url, `Photo ${index + 1}`, { max: 1000 })

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return bad(`Photo ${index + 1} is not a valid address.`)
    }
    if (parsed.protocol !== 'https:' || !BLOB_HOST.test(parsed.hostname)) {
      return bad('Photos must be uploaded through the form, not linked from another site.')
    }

    return {
      url: parsed.toString(),
      pathname: requireString(candidate.pathname, `Photo ${index + 1} path`, { max: 500 }),
      alt: optionalString(candidate.alt, `Photo ${index + 1} description`, { max: 200 }),
    }
  })
}
