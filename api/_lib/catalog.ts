import { del } from '@vercel/blob'
import { HttpError } from './http.js'
import { optionalNumber, type Localized } from './models.js'

/** Helpers shared by the editor-maintained listings: accessories and protection centers. */

/**
 * The driver stores `undefined` as `null`, which would turn every empty
 * optional field into a null the client then has to guard against. A JSON
 * round trip drops them; everything here is plain data, so nothing is lost.
 */
export const compact = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Like `requireLocalized`, but either side may be the one written. */
export function requireLocalizedLoose(value: unknown, field: string, max: number): Localized {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, `${field} must have en and ar text.`)
  const candidate = value as Record<string, unknown>
  const side = (text: unknown) => (typeof text === 'string' ? text.trim().slice(0, max) : '')
  return { en: side(candidate.en), ar: side(candidate.ar) }
}

export function optionalLocalized(value: unknown, field: string, max: number): Localized | undefined {
  if (value === undefined || value === null) return undefined
  const text = requireLocalizedLoose(value, field, max)
  return text.en || text.ar ? text : undefined
}

/** A name in English, Arabic or both, like posts. */
export function requireName(value: unknown, noun: string): Localized {
  const name = requireLocalizedLoose(value, 'Name', 160)
  if (name.en.length < 2 && name.ar.length < 2) throw new HttpError(400, `Give the ${noun} a name.`)
  return name
}

/** "3–5 days". One end filled in means a fixed figure. */
export function readDayRange(
  value: unknown,
  label: string,
  { max = 365, whole = true }: { max?: number; whole?: boolean } = {},
): { min: number; max: number } | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object') throw new HttpError(400, `${label} is not valid.`)
  const body = value as Record<string, unknown>

  const low = optionalNumber(body.min, `${label}, shortest`, { min: 0, max })
  const high = optionalNumber(body.max, `${label}, longest`, { min: 0, max })
  if (low === undefined && high === undefined) return undefined

  const tidy = (days: number) => (whole ? Math.round(days) : Math.round(days * 2) / 2)
  const range = { min: tidy(low ?? high ?? 0), max: tidy(high ?? low ?? 0) }
  if (range.min > range.max) throw new HttpError(400, `${label}: the shortest cannot be longer than the longest.`)
  return range
}

/**
 * Splits a form's fields into `$set` and `$unset`, so clearing an optional
 * field removes it instead of storing a null.
 */
export function setAndUnset(update: Record<string, unknown>) {
  const set = Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined))
  const unset = Object.fromEntries(
    Object.entries(update)
      .filter(([, value]) => value === undefined)
      .map(([key]) => [key, ''] as const),
  )
  return { set, update: Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set } }
}

/**
 * Removing a photo deletes the file, so the free Blob quota is not spent on
 * images nothing shows. A failure here is logged, not raised: the record was
 * saved, and an orphaned file costs less than a failed save.
 */
export async function deleteBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0 || !process.env.BLOB_READ_WRITE_TOKEN) return
  try {
    await del(urls)
  } catch (error) {
    console.error('Failed to delete removed photos:', error)
  }
}
