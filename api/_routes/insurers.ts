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
  requireLocalizedLoose,
  requireName,
  setAndUnset,
} from '../_lib/catalog.js'
import {
  INSURANCE_COVERS,
  optionalMoney,
  optionalNumber,
  optionalPhone,
  optionalString,
  optionalUrl,
  requireBlobImages,
  requireEnum,
  slugify,
  type InsurancePlan,
  type InsurerDoc,
} from '../_lib/models.js'

/**
 * Car insurance: the companies selling it in Egypt and their plans, with the
 * rate, what each plan covers, cashback and the terms. Editors with
 * `insurance.manage` maintain them all; contributors with `insurance.add` add
 * companies and edit only their own; owners review the companies.
 */

const MAX_PLANS = 15

/** The lowest yearly rate across the plans, for "from X%" on the list. */
function lowestRate(plans: InsurancePlan[]): number | null {
  const rates = plans.map((plan) => plan.ratePct).filter((rate): rate is number => rate !== undefined)
  return rates.length === 0 ? null : Math.min(...rates)
}

/** The best cashback offered, for the list. */
function bestCashback(plans: InsurancePlan[]): number | null {
  const shares = plans.map((plan) => plan.cashbackPct).filter((pct): pct is number => pct !== undefined && pct > 0)
  return shares.length === 0 ? null : Math.max(...shares)
}

function toPublic(insurer: InsurerDoc) {
  return {
    id: insurer._id.toHexString(),
    slug: insurer.slug,
    name: insurer.name,
    description: insurer.description,
    hotline: insurer.hotline,
    phone: insurer.phone,
    whatsapp: insurer.whatsapp,
    website: insurer.website,
    email: insurer.email,
    branches: insurer.branches,
    plans: insurer.plans,
    lowestRatePct: lowestRate(insurer.plans),
    bestCashbackPct: bestCashback(insurer.plans),
    images: insurer.images,
    ratingAvg: insurer.ratingAvg,
    ratingCount: insurer.ratingCount,
    active: insurer.active,
    checkedAt: insurer.checkedAt,
    updatedAt: insurer.updatedAt,
  }
}

export async function handleInsurers(request: Request, segments: string[]): Promise<Response> {
  const [id, sub, subId] = segments

  if (id && sub === 'merchants') return handleMerchants(request, 'insurer', id, subId)

  if (!id) {
    if (request.method === 'GET') return listInsurers(request)
    if (request.method === 'POST') return createInsurer(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (request.method === 'GET') return readInsurer(request, id)
  if (request.method === 'PATCH') return updateInsurer(request, id)
  if (request.method === 'DELETE') return removeInsurer(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/** Public: every active insurer. `all=1` adds removed ones, for the admin table. */
async function listInsurers(request: Request): Promise<Response> {
  const params = searchParams(request)
  // Staff see every listing, a merchant sees their own, and the public sees what is live.
  const scope = await adminListFilter(request, 'insurer')
  const filter: Record<string, unknown> = scope ?? { active: true }

  const db = await getDb()
  const insurers = await db.collection<InsurerDoc>('insurers').find(filter).sort({ 'name.en': 1 }).limit(100).toArray()

  // Only the staff table names the accounts behind each listing.
  const merchants = params.get('all') === '1' ? await merchantsByListing(insurers) : null
  return json(request, {
    insurers: insurers.map((insurer) => ({
      ...toPublic(insurer),
      ...(merchants ? { merchants: merchants.get(insurer._id.toHexString()) ?? [] } : {}),
    })),
  })
}

async function readInsurer(request: Request, idOrSlug: string): Promise<Response> {
  const db = await getDb()
  const collection = db.collection<InsurerDoc>('insurers')

  const insurer = ObjectId.isValid(idOrSlug)
    ? ((await collection.findOne({ _id: new ObjectId(idOrSlug) })) ?? (await collection.findOne({ slug: idOrSlug })))
    : await collection.findOne({ slug: idOrSlug })

  if (!insurer || !insurer.active) throw new HttpError(404, 'Insurance company not found.')

  return json(request, { insurer: toPublic(insurer) })
}

/* ---------- validation ---------- */

const percent = (value: unknown, field: string) => optionalNumber(value, field, { min: 0, max: 100 })

function readPlan(value: unknown, index: number, previousIds: Set<string>): InsurancePlan {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, `Plan ${index + 1} is not valid.`)
  const body = value as Record<string, unknown>
  const label = `Plan ${index + 1}`

  const name = requireLocalizedLoose(body.name, `${label} name`, 120)
  if (name.en.length < 2 && name.ar.length < 2) throw new HttpError(400, `Give ${label.toLowerCase()} a name.`)

  // Keep the id an editor's form sent back, so links to a plan survive edits.
  const sentId = typeof body.id === 'string' && /^[a-f0-9]{8,24}$/.test(body.id) ? body.id : null
  const id = sentId && !previousIds.has(sentId) ? sentId : randomBytes(6).toString('hex')
  previousIds.add(id)

  const covers = Array.isArray(body.covers)
    ? [...new Set(body.covers.map((item) => requireEnum(item, INSURANCE_COVERS, `${label} cover`)))]
    : []

  return compact({
    id,
    name,
    // A rate above 20% a year is a typo for a car, not a price.
    ratePct: optionalNumber(body.ratePct, `${label} yearly rate`, { min: 0, max: 20 }),
    minPremiumEgp: optionalMoney(body.minPremiumEgp, `${label} minimum premium`),
    covers,
    agencyRepairYears: optionalNumber(body.agencyRepairYears, `${label} agency repair`, { min: 0, max: 15 }),
    cashbackPct: percent(body.cashbackPct, `${label} cashback`),
    cashbackCondition: optionalLocalized(body.cashbackCondition, `${label} cashback condition`, 500),
    noClaimsDiscountPct: percent(body.noClaimsDiscountPct, `${label} no-claims discount`),
    deductiblePct: percent(body.deductiblePct, `${label} deductible`),
    deductibleEgp: optionalMoney(body.deductibleEgp, `${label} deductible amount`),
    maxCarAgeYears: optionalNumber(body.maxCarAgeYears, `${label} maximum car age`, { min: 0, max: 40 }),
    installments: optionalLocalized(body.installments, `${label} installments`, 500),
    notes: optionalLocalized(body.notes, `${label} notes`, 3000),
  })
}

function readPlans(value: unknown): InsurancePlan[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Plans must be a list.')
  if (value.length > MAX_PLANS) throw new HttpError(400, `An insurer can list at most ${MAX_PLANS} plans.`)
  const ids = new Set<string>()
  return value.map((item, index) => readPlan(item, index, ids))
}

/** Every editable field. The admin form always sends the whole insurer. */
function readInsurerBody(body: Record<string, unknown>) {
  return {
    name: requireName(body.name, 'insurance company'),
    description: optionalLocalized(body.description, 'Description', 5000) ?? { en: '', ar: '' },
    hotline: optionalString(body.hotline, 'Hotline', { max: 20 }),
    phone: optionalPhone(body.phone),
    whatsapp: optionalPhone(body.whatsapp),
    website: optionalUrl(body.website, 'Website'),
    email: optionalString(body.email, 'Email', { max: 200 }),
    branches: optionalString(body.branches, 'Branches', { max: 300 }),
    plans: readPlans(body.plans),
    images: compact(requireBlobImages(body.images)),
  }
}

/* ---------- writes ---------- */

async function createInsurer(request: Request): Promise<Response> {
  const editor = await requireListingAdder(request, 'insurer')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const fields = readInsurerBody(body)

  const now = new Date().toISOString()
  const doc = compact({
    ...fields,
    slug: slugify(fields.name.en || fields.name.ar, 'insurer'),
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
  const result = await db.collection<InsurerDoc>('insurers').insertOne(doc as InsurerDoc)

  await recordAudit(editor, 'insurer.created', {
    target: { kind: 'insurer', id: result.insertedId.toHexString(), label: doc.name.en || doc.name.ar },
  })

  return json(request, { insurer: toPublic({ ...doc, _id: result.insertedId } as InsurerDoc) }, 201)
}

async function updateInsurer(request: Request, id: string): Promise<Response> {
  // Staff may edit any listing; a merchant or the contributor who added it only their own.
  const { user: editor, staff, merchant } = await requireListingEditor(request, 'insurer', id)

  const body = await readJsonBody<Record<string, unknown>>(request)
  const db = await getDb()
  const collection = db.collection<InsurerDoc>('insurers')
  const existing = await collection.findOne({ _id: new ObjectId(id) })
  if (!existing) throw new HttpError(404, 'Insurance company not found.')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updatedAt: now }

  // A body with a name is the full form; one without is a toggle such as
  // restoring a removed insurer or confirming the plans are still right.
  let removedImages: string[] = []
  if (body.name !== undefined) {
    const fields = readInsurerBody(body)
    Object.assign(update, fields)

    if (JSON.stringify(fields.plans) !== JSON.stringify(existing.plans)) update.checkedAt = now

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

  await recordAudit(editor, 'insurer.updated', {
    target: { kind: 'insurer', id, label: existing.name.en || existing.name.ar },
    changes: {
      ...auditableChanges(body.name !== undefined ? listingChanges(existing as unknown as Record<string, unknown>, set, 'plans') : set),
      // A merchant's edit is marked, so staff can tell it from their own.
      ...(merchant ? { byMerchant: true } : {}),
    },
  })

  const saved = await collection.findOne({ _id: existing._id })
  return json(request, { insurer: saved ? toPublic(saved) : null })
}

/** Soft delete: the plans, photos and reviews stay, in case the insurer comes back. */
async function removeInsurer(request: Request, id: string): Promise<Response> {
  const editor = await requirePermission(request, 'insurance.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Insurance company not found.')

  const db = await getDb()
  const insurer = await db
    .collection<InsurerDoc>('insurers')
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { active: false, updatedAt: new Date().toISOString() } })

  if (!insurer) throw new HttpError(404, 'Insurance company not found.')

  await recordAudit(editor, 'insurer.removed', { target: { kind: 'insurer', id, label: insurer.name.en || insurer.name.ar } })

  return json(request, { ok: true })
}
