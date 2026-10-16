import { ObjectId } from 'mongodb'
import { CATALOGS, ownListFilter, refuseUnlessStaff, requireAdder, requireItemEditor } from '../_lib/ownership.js'
import { requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { auditableChanges, recordAudit } from '../_lib/audit.js'
import {
  compact,
  deleteBlobs,
  optionalLocalized,
  readDayRange,
  requireName,
  setAndUnset,
} from '../_lib/catalog.js'
import {
  IMPORT_CURRENCIES,
  PART_AVAILABILITY,
  PART_CATEGORIES,
  PART_SOURCES,
  optionalMoney,
  optionalNumber,
  optionalPhone,
  optionalString,
  optionalUrl,
  requireBlobImages,
  requireEnum,
  requireString,
  slugify,
  type PartDoc,
  type PartPrice,
  type PartSpecs,
  type PartSupplier,
} from '../_lib/models.js'

/**
 * What the part costs to have on the car: the item, getting it here, and
 * fitting it. Null when the item has no price yet ("price on request").
 */
export function landedCostEgp(price: PartPrice): number | null {
  if (price.amountEgp === undefined) return null
  return price.amountEgp + (price.shippingEgp ?? 0) + (price.customsEgp ?? 0) + (price.installEgp ?? 0)
}

function toPublic(part: PartDoc) {
  return {
    id: part._id.toHexString(),
    slug: part.slug,
    name: part.name,
    description: part.description,
    category: part.category,
    subcategory: part.subcategory,
    source: part.source,
    price: part.price,
    landedEgp: landedCostEgp(part.price),
    availability: part.availability,
    leadTimeDays: part.leadTimeDays,
    suppliers: part.suppliers,
    specs: part.specs,
    images: part.images,
    ratingAvg: part.ratingAvg,
    ratingCount: part.ratingCount,
    active: part.active,
    priceCheckedAt: part.priceCheckedAt,
    updatedAt: part.updatedAt,
  }
}

export async function handleParts(request: Request, segments: string[]): Promise<Response> {
  const [id] = segments

  if (!id) {
    if (request.method === 'GET') return listParts(request)
    if (request.method === 'POST') return createPart(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (request.method === 'GET') return readPart(request, id)
  if (request.method === 'PATCH') return updatePart(request, id)
  if (request.method === 'DELETE') return removePart(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Public: the catalog. `all=1` also returns removed parts, for the admin
 * table, and needs the permission; `mine=1` is a contributor's table, the
 * parts they added.
 */
async function listParts(request: Request): Promise<Response> {
  const params = searchParams(request)
  const filter: Record<string, unknown> = (await ownListFilter(request, CATALOGS.part)) ?? { active: true }

  const category = params.get('category')
  if (category) filter.category = requireEnum(category, PART_CATEGORIES, 'Category')

  const source = params.get('source')
  if (source) filter.source = requireEnum(source, PART_SOURCES, 'Source')

  // An empty trim list means the part fits both.
  const trim = params.get('trim')
  if (trim === 'play' || trim === 'wild') {
    filter['specs.fitsTrims'] = { $in: [trim, []] }
  }

  const query = params.get('q')?.trim().slice(0, 80)
  if (query) {
    const pattern = new RegExp(escapeRegex(query), 'i')
    filter.$or = [{ 'name.en': pattern }, { 'name.ar': pattern }, { subcategory: pattern }]
  }

  const db = await getDb()
  const parts = await db
    .collection<PartDoc>('parts')
    .find(filter)
    .sort({ category: 1, 'name.en': 1 })
    .limit(500)
    .toArray()

  return json(request, { parts: parts.map(toPublic) })
}

async function readPart(request: Request, idOrSlug: string): Promise<Response> {
  const db = await getDb()
  const collection = db.collection<PartDoc>('parts')

  const part = ObjectId.isValid(idOrSlug)
    ? ((await collection.findOne({ _id: new ObjectId(idOrSlug) })) ?? (await collection.findOne({ slug: idOrSlug })))
    : await collection.findOne({ slug: idOrSlug })

  // A removed part is history for the admin table, not a page anyone can open.
  if (!part || !part.active) throw new HttpError(404, 'Accessory not found.')

  return json(request, { part: toPublic(part) })
}

/* ---------- validation ---------- */

/** Every figure is optional: a part with no price is listed as "price on request". */
function readPrice(value: unknown, isImport: boolean): PartPrice {
  const body = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>

  const price: PartPrice = {
    amountEgp: optionalMoney(body.amountEgp, 'Price'),
    installEgp: optionalMoney(body.installEgp, 'Installation cost'),
  }

  // Import costs mean nothing for a part bought down the road, so they are
  // dropped rather than stored and shown by mistake.
  if (isImport) {
    price.originalAmount = optionalNumber(body.originalAmount, 'Seller price', { min: 0.01, max: 10_000_000 })
    price.originalCurrency =
      price.originalAmount === undefined ? undefined : requireEnum(body.originalCurrency, IMPORT_CURRENCIES, 'Seller currency')
    price.shippingEgp = optionalMoney(body.shippingEgp, 'Shipping')
    price.customsEgp = optionalMoney(body.customsEgp, 'Customs')
  }

  return price
}

function readSuppliers(value: unknown): PartSupplier[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Suppliers must be a list.')
  if (value.length > 5) throw new HttpError(400, 'List at most 5 suppliers.')

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) throw new HttpError(400, `Supplier ${index + 1} is not valid.`)
    const supplier = item as Record<string, unknown>
    const label = `Supplier ${index + 1}`

    return {
      name: requireString(supplier.name, `${label} name`, { min: 2, max: 160 }),
      kind: requireEnum(supplier.kind, ['shop', 'online'] as const, `${label} type`),
      city: optionalString(supplier.city, `${label} city`, { max: 120 }),
      phone: optionalPhone(supplier.phone),
      whatsapp: optionalPhone(supplier.whatsapp),
      url: optionalUrl(supplier.url, `${label} link`),
    }
  })
}

function readSpecs(value: unknown, isImport: boolean): PartSpecs {
  const body = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const trims = Array.isArray(body.fitsTrims) ? body.fitsTrims : []

  return {
    material: optionalString(body.material, 'Material', { max: 160 }),
    color: optionalString(body.color, 'Colour', { max: 120 }),
    dimensions: optionalString(body.dimensions, 'Dimensions', { max: 160 }),
    weightKg: optionalNumber(body.weightKg, 'Weight', { min: 0, max: 2000 }),
    warrantyMonths: optionalNumber(body.warrantyMonths, 'Warranty', { min: 0, max: 240 }),
    fitsTrims: [...new Set(trims.filter((trim): trim is 'play' | 'wild' => trim === 'play' || trim === 'wild'))],
    importNotes: isImport ? optionalLocalized(body.importNotes, 'Import notes', 2000) : undefined,
  }
}

/** Every editable field. The admin form always sends the whole part. */
function readPartBody(body: Record<string, unknown>) {
  const source = requireEnum(body.source, PART_SOURCES, 'Source')
  const isImport = source === 'china'
  // Like posts, a part may be written up in English, Arabic or both.
  const name = requireName(body.name, 'accessory')
  const description = optionalLocalized(body.description, 'Description', 5000) ?? { en: '', ar: '' }

  return {
    name,
    description,
    category: requireEnum(body.category, PART_CATEGORIES, 'Category'),
    subcategory: optionalString(body.subcategory, 'Type', { max: 80 }),
    source,
    price: compact(readPrice(body.price, isImport)),
    availability: requireEnum(body.availability, PART_AVAILABILITY, 'Availability'),
    leadTimeDays: readDayRange(body.leadTimeDays, 'Lead time'),
    suppliers: compact(readSuppliers(body.suppliers)),
    specs: compact(readSpecs(body.specs, isImport)),
    images: compact(requireBlobImages(body.images)),
  }
}

/* ---------- writes ---------- */

async function createPart(request: Request): Promise<Response> {
  const editor = await requireAdder(request, CATALOGS.part)
  const body = await readJsonBody<Record<string, unknown>>(request)
  const fields = readPartBody(body)

  const now = new Date().toISOString()
  const doc = compact({
    ...fields,
    slug: slugify(fields.name.en || fields.name.ar, 'part'),
    ratingAvg: 0,
    ratingCount: 0,
    active: true,
    priceCheckedAt: now,
    createdBy: editor.name,
    createdById: editor.id,
    createdAt: now,
    updatedAt: now,
  })

  const db = await getDb()
  const result = await db.collection<PartDoc>('parts').insertOne(doc as PartDoc)

  await recordAudit(editor, 'part.created', {
    target: { kind: 'part', id: result.insertedId.toHexString(), label: doc.name.en || doc.name.ar },
  })

  return json(request, { part: toPublic({ ...doc, _id: result.insertedId } as PartDoc) }, 201)
}

async function updatePart(request: Request, id: string): Promise<Response> {
  // Managers may edit any part; a contributor only the ones they added.
  const { user: editor, staff } = await requireItemEditor(request, CATALOGS.part, id)

  const body = await readJsonBody<Record<string, unknown>>(request)
  const db = await getDb()
  const collection = db.collection<PartDoc>('parts')
  const existing = await collection.findOne({ _id: new ObjectId(id) })
  if (!existing) throw new HttpError(404, 'Accessory not found.')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updatedAt: now }

  // A body with a name is the full form; one without is a toggle such as
  // restoring a removed part or confirming the price is still right.
  let removedImages: string[] = []
  if (body.name !== undefined) {
    const fields = readPartBody(body)
    Object.assign(update, fields)

    if (JSON.stringify(fields.price) !== JSON.stringify(existing.price)) update.priceCheckedAt = now

    const kept = new Set(fields.images.map((image) => image.url))
    removedImages = existing.images.map((image) => image.url).filter((url) => !kept.has(url))
  }
  if (body.active !== undefined) {
    refuseUnlessStaff(staff)
    update.active = body.active === true
  }
  if (body.priceChecked === true) update.priceCheckedAt = now

  // Unset what the form cleared, so an optional field can be emptied.
  const { set, update: changes } = setAndUnset(update)
  await collection.updateOne({ _id: existing._id }, changes)

  await deleteBlobs(removedImages)

  await recordAudit(editor, 'part.updated', {
    target: { kind: 'part', id, label: existing.name.en || existing.name.ar },
    // The full form re-sends every field; logging the names keeps the entry
    // small enough for the free cluster.
    changes: auditableChanges(
      body.name !== undefined
        ? { fields: Object.keys(set).filter((key) => key !== 'updatedAt'), active: set.active }
        : set,
    ),
  })

  const saved = await collection.findOne({ _id: existing._id })
  return json(request, { part: saved ? toPublic(saved) : null })
}

/** Soft delete, like dealers: the photos and reviews stay, in case it comes back. */
async function removePart(request: Request, id: string): Promise<Response> {
  const editor = await requirePermission(request, 'parts.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Accessory not found.')

  const db = await getDb()
  const part = await db
    .collection<PartDoc>('parts')
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { active: false, updatedAt: new Date().toISOString() } })

  if (!part) throw new HttpError(404, 'Accessory not found.')

  await recordAudit(editor, 'part.removed', { target: { kind: 'part', id, label: part.name.en || part.name.ar } })

  return json(request, { ok: true })
}
