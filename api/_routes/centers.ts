import { randomBytes } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { auditableChanges, listingChanges, recordAudit } from '../_lib/audit.js'
import { adminListFilter, handleMerchants, merchantsByListing, requireListingAdder, requireListingEditor } from '../_lib/merchants.js'
import {
  compact,
  deleteBlobs,
  optionalLocalized,
  readDayRange,
  requireLocalizedLoose,
  requireName,
  setAndUnset,
} from '../_lib/catalog.js'
import {
  COVERAGE_AREAS,
  PROTECTION_SERVICES,
  optionalMoney,
  optionalNumber,
  optionalPhone,
  optionalString,
  optionalUrl,
  requireBlobImages,
  requireEnum,
  slugify,
  type CenterDoc,
  type CenterPackage,
  type CoverageArea,
} from '../_lib/models.js'

/**
 * Protection centers: the workshops in Egypt that fit PPF, ceramic coating,
 * window film and the like, each with the packages it sells. Editors with
 * `centers.manage` maintain them all; a linked merchant edits its own, and a
 * contributor with `centers.add` the ones they added; owners review them.
 */

const MAX_PACKAGES = 20

/** The cheapest priced package, for "from X EGP" on the list; null when none has a price. */
function fromPrice(packages: CenterPackage[]): number | null {
  const prices = packages.map((item) => item.priceEgp).filter((price): price is number => price !== undefined)
  return prices.length === 0 ? null : Math.min(...prices)
}

function toPublic(center: CenterDoc) {
  return {
    id: center._id.toHexString(),
    slug: center.slug,
    name: center.name,
    description: center.description,
    city: center.city,
    area: center.area,
    address: center.address,
    mapUrl: center.mapUrl,
    phone: center.phone,
    whatsapp: center.whatsapp,
    website: center.website,
    instagram: center.instagram,
    hours: center.hours,
    services: center.services,
    packages: center.packages,
    fromPriceEgp: fromPrice(center.packages),
    images: center.images,
    ratingAvg: center.ratingAvg,
    ratingCount: center.ratingCount,
    active: center.active,
    checkedAt: center.checkedAt,
    updatedAt: center.updatedAt,
  }
}

export async function handleCenters(request: Request, segments: string[]): Promise<Response> {
  const [id, sub, subId] = segments

  if (id && sub === 'merchants') return handleMerchants(request, 'center', id, subId)

  if (!id) {
    if (request.method === 'GET') return listCenters(request)
    if (request.method === 'POST') return createCenter(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (request.method === 'GET') return readCenter(request, id)
  if (request.method === 'PATCH') return updateCenter(request, id)
  if (request.method === 'DELETE') return removeCenter(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/** Public: every active center. `all=1` adds removed ones, for the admin table. */
async function listCenters(request: Request): Promise<Response> {
  const params = searchParams(request)
  // Staff see every listing, a merchant sees their own, and the public sees what is live.
  const scope = await adminListFilter(request, 'center')
  const filter: Record<string, unknown> = scope ?? { active: true }

  const service = params.get('service')
  if (service) filter.services = requireEnum(service, PROTECTION_SERVICES, 'Service')

  const db = await getDb()
  const centers = await db
    .collection<CenterDoc>('centers')
    .find(filter)
    .sort({ city: 1, 'name.en': 1 })
    .limit(300)
    .toArray()

  // Only the staff table names the accounts behind each listing.
  const merchants = params.get('all') === '1' ? await merchantsByListing(centers) : null
  return json(request, {
    centers: centers.map((center) => ({
      ...toPublic(center),
      ...(merchants ? { merchants: merchants.get(center._id.toHexString()) ?? [] } : {}),
    })),
  })
}

async function readCenter(request: Request, idOrSlug: string): Promise<Response> {
  const db = await getDb()
  const collection = db.collection<CenterDoc>('centers')

  const center = ObjectId.isValid(idOrSlug)
    ? ((await collection.findOne({ _id: new ObjectId(idOrSlug) })) ?? (await collection.findOne({ slug: idOrSlug })))
    : await collection.findOne({ slug: idOrSlug })

  if (!center || !center.active) throw new HttpError(404, 'Protection center not found.')

  return json(request, { center: toPublic(center) })
}

/* ---------- validation ---------- */

function readInclusions(value: unknown, label: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, `${label}: what is included must be a list.`)
  if (value.length > 15) throw new HttpError(400, `${label}: list at most 15 inclusions.`)
  return value
    .map((item, index) => optionalString(item, `${label}, inclusion ${index + 1}`, { max: 160 }))
    .filter((item): item is string => Boolean(item))
}

function readCoverage(value: unknown, label: string): CoverageArea[] {
  if (!Array.isArray(value)) return []
  const areas = value.map((item) => requireEnum(item, COVERAGE_AREAS, `${label} coverage`))
  return [...new Set(areas)]
}

function readPackage(value: unknown, index: number, previousIds: Set<string>): CenterPackage {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, `Package ${index + 1} is not valid.`)
  const body = value as Record<string, unknown>
  const label = `Package ${index + 1}`

  const name = requireLocalizedLoose(body.name, `${label} name`, 120)
  if (name.en.length < 2 && name.ar.length < 2) throw new HttpError(400, `Give ${label.toLowerCase()} a name.`)

  // Keep the id an editor's form sent back, so links to a package survive edits.
  const sentId = typeof body.id === 'string' && /^[a-f0-9]{8,24}$/.test(body.id) ? body.id : null
  const id = sentId && !previousIds.has(sentId) ? sentId : randomBytes(6).toString('hex')
  previousIds.add(id)

  const priceEgp = optionalMoney(body.priceEgp, `${label} price`)
  const wildPriceEgp = optionalMoney(body.wildPriceEgp, `${label} Wild price`)

  return compact({
    id,
    name,
    service: requireEnum(body.service, PROTECTION_SERVICES, `${label} service`),
    coverage: readCoverage(body.coverage, label),
    priceEgp,
    // The same figure twice is not a separate Wild price.
    wildPriceEgp: wildPriceEgp === priceEgp ? undefined : wildPriceEgp,
    durationDays: readDayRange(body.durationDays, `${label} time at the center`, { max: 60, whole: false }),
    brand: optionalString(body.brand, `${label} brand`, { max: 80 }),
    product: optionalString(body.product, `${label} product`, { max: 120 }),
    materialType: optionalString(body.materialType, `${label} material`, { max: 80 }),
    thicknessMil: optionalNumber(body.thicknessMil, `${label} thickness`, { min: 0, max: 100 }),
    selfHealing: typeof body.selfHealing === 'boolean' ? body.selfHealing : undefined,
    warrantyYears: optionalNumber(body.warrantyYears, `${label} warranty`, { min: 0, max: 30 }),
    inclusions: readInclusions(body.inclusions, label),
    notes: optionalLocalized(body.notes, `${label} notes`, 2000),
  })
}

function readPackages(value: unknown): CenterPackage[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Packages must be a list.')
  if (value.length > MAX_PACKAGES) throw new HttpError(400, `A center can list at most ${MAX_PACKAGES} packages.`)
  const ids = new Set<string>()
  return value.map((item, index) => readPackage(item, index, ids))
}

/** Every editable field. The admin form always sends the whole center. */
function readCenterBody(body: Record<string, unknown>) {
  const packages = readPackages(body.packages)

  return {
    name: requireName(body.name, 'center'),
    description: optionalLocalized(body.description, 'Description', 5000) ?? { en: '', ar: '' },
    city: optionalString(body.city, 'City', { max: 80 }),
    area: optionalString(body.area, 'Area', { max: 120 }),
    address: optionalString(body.address, 'Address', { max: 300 }),
    mapUrl: optionalUrl(body.mapUrl, 'Map link'),
    phone: optionalPhone(body.phone),
    whatsapp: optionalPhone(body.whatsapp),
    website: optionalUrl(body.website, 'Website'),
    instagram: optionalUrl(body.instagram, 'Instagram link'),
    hours: optionalString(body.hours, 'Working hours', { max: 200 }),
    services: [...new Set(packages.map((item) => item.service))],
    packages,
    images: compact(requireBlobImages(body.images)),
  }
}

/* ---------- writes ---------- */

async function createCenter(request: Request): Promise<Response> {
  const editor = await requireListingAdder(request, 'center')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const fields = readCenterBody(body)

  const now = new Date().toISOString()
  const doc = compact({
    ...fields,
    slug: slugify(fields.name.en || fields.name.ar, 'center'),
    ratingAvg: 0,
    ratingCount: 0,
    active: true,
    checkedAt: now,
    createdBy: editor.name,
    createdById: editor.id,
    createdAt: now,
    updatedAt: now,
  })

  const db = await getDb()
  const result = await db.collection<CenterDoc>('centers').insertOne(doc as CenterDoc)

  await recordAudit(editor, 'center.created', {
    target: { kind: 'center', id: result.insertedId.toHexString(), label: doc.name.en || doc.name.ar },
  })

  return json(request, { center: toPublic({ ...doc, _id: result.insertedId } as CenterDoc) }, 201)
}

async function updateCenter(request: Request, id: string): Promise<Response> {
  // Staff may edit any listing; a merchant or the contributor who added it only their own.
  const { user: editor, staff, merchant } = await requireListingEditor(request, 'center', id)

  const body = await readJsonBody<Record<string, unknown>>(request)
  const db = await getDb()
  const collection = db.collection<CenterDoc>('centers')
  const existing = await collection.findOne({ _id: new ObjectId(id) })
  if (!existing) throw new HttpError(404, 'Protection center not found.')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updatedAt: now }

  // A body with a name is the full form; one without is a toggle such as
  // restoring a removed center or confirming the packages are still right.
  let removedImages: string[] = []
  if (body.name !== undefined) {
    const fields = readCenterBody(body)
    Object.assign(update, fields)

    if (JSON.stringify(fields.packages) !== JSON.stringify(existing.packages)) update.checkedAt = now

    const kept = new Set(fields.images.map((image) => image.url))
    removedImages = existing.images.map((image) => image.url).filter((url) => !kept.has(url))
  }
  if (body.active !== undefined) {
    // Taking a listing off the site, or putting it back, is the site's call.
    if (!staff) throw new HttpError(403, 'Only the site team can remove or restore a listing.')
    update.active = body.active === true
  }
  if (body.checked === true) update.checkedAt = now

  const { set, update: changes } = setAndUnset(update)
  await collection.updateOne({ _id: existing._id }, changes)

  await deleteBlobs(removedImages)

  await recordAudit(editor, 'center.updated', {
    target: { kind: 'center', id, label: existing.name.en || existing.name.ar },
    changes: {
      ...auditableChanges(body.name !== undefined ? listingChanges(existing as unknown as Record<string, unknown>, set, 'packages') : set),
      // A merchant's edit is marked, so staff can tell it from their own.
      ...(merchant ? { byMerchant: true } : {}),
    },
  })

  const saved = await collection.findOne({ _id: existing._id })
  return json(request, { center: saved ? toPublic(saved) : null })
}

/** Soft delete: the photos and reviews stay, in case the center comes back. */
async function removeCenter(request: Request, id: string): Promise<Response> {
  const editor = await requirePermission(request, 'centers.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Protection center not found.')

  const db = await getDb()
  const center = await db
    .collection<CenterDoc>('centers')
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { active: false, updatedAt: new Date().toISOString() } })

  if (!center) throw new HttpError(404, 'Protection center not found.')

  await recordAudit(editor, 'center.removed', { target: { kind: 'center', id, label: center.name.en || center.name.ar } })

  return json(request, { ok: true })
}
