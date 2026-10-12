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
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const suffix = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${suffix}` : `post-${suffix}`
}
