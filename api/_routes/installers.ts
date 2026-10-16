import { randomBytes } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { hasPermission, requirePermission } from '../_lib/permissions.js'
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
  CHARGER_CONNECTORS,
  CHARGER_PHASES,
  INSTALL_SERVICES,
  optionalMoney,
  optionalNumber,
  optionalPhone,
  optionalString,
  optionalUrl,
  requireBlobImages,
  requireEnum,
  slugify,
  type InstallerDoc,
  type InstallerPackage,
} from '../_lib/models.js'

/**
 * Charger installers: the companies that sell and fit home chargers in Egypt,
 * with their packages, prices and the governorates they cover. Editors with
 * `installers.manage` maintain them all; a linked merchant edits its own, and
 * a contributor with `installers.add` the ones they added; owners review the
 * companies.
 */

const MAX_PACKAGES = 15
const MAX_GOVERNORATES = 30

/** The cheapest package price, for "from X EGP" on the list. */
function lowestPrice(packages: InstallerPackage[]): number | null {
  const prices = packages.map((item) => item.priceEgp).filter((price): price is number => price !== undefined)
  return prices.length === 0 ? null : Math.min(...prices)
}

/** The most powerful charger on offer, for the list. */
function maxPower(packages: InstallerPackage[]): number | null {
  const powers = packages.map((item) => item.powerKw).filter((kw): kw is number => kw !== undefined)
  return powers.length === 0 ? null : Math.max(...powers)
}

function toPublic(installer: InstallerDoc) {
  return {
    id: installer._id.toHexString(),
    slug: installer.slug,
    name: installer.name,
    description: installer.description,
    hotline: installer.hotline,
    phone: installer.phone,
    whatsapp: installer.whatsapp,
    website: installer.website,
    email: installer.email,
    governorates: installer.governorates,
    licensed: installer.licensed,
    services: installer.services,
    packages: installer.packages,
    lowestPriceEgp: lowestPrice(installer.packages),
    maxPowerKw: maxPower(installer.packages),
    images: installer.images,
    ratingAvg: installer.ratingAvg,
    ratingCount: installer.ratingCount,
    active: installer.active,
    checkedAt: installer.checkedAt,
    updatedAt: installer.updatedAt,
  }
}

export async function handleInstallers(request: Request, segments: string[]): Promise<Response> {
  const [id, sub, subId] = segments

  if (id && sub === 'merchants') return handleMerchants(request, 'installer', id, subId)

  if (!id) {
    if (request.method === 'GET') return listInstallers(request)
    if (request.method === 'POST') return createInstaller(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (request.method === 'GET') return readInstaller(request, id)
  if (request.method === 'PATCH') return updateInstaller(request, id)
  if (request.method === 'DELETE') return removeInstaller(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/** Public: every active installer. `all=1` adds removed ones, for the admin table. */
async function listInstallers(request: Request): Promise<Response> {
  const params = searchParams(request)
  // Staff see every listing, a merchant sees their own, and the public sees what is live.
  const scope = await adminListFilter(request, 'installer')
  const filter: Record<string, unknown> = scope ?? { active: true }

  const db = await getDb()
  const installers = await db.collection<InstallerDoc>('installers').find(filter).sort({ 'name.en': 1 }).limit(100).toArray()

  // Only the staff table names the accounts behind each listing.
  const merchants = params.get('all') === '1' ? await merchantsByListing(installers) : null
  return json(request, {
    installers: installers.map((installer) => ({
      ...toPublic(installer),
      ...(merchants ? { merchants: merchants.get(installer._id.toHexString()) ?? [] } : {}),
    })),
  })
}

async function readInstaller(request: Request, idOrSlug: string): Promise<Response> {
  const db = await getDb()
  const collection = db.collection<InstallerDoc>('installers')

  const installer = ObjectId.isValid(idOrSlug)
    ? ((await collection.findOne({ _id: new ObjectId(idOrSlug) })) ?? (await collection.findOne({ slug: idOrSlug })))
    : await collection.findOne({ slug: idOrSlug })

  if (!installer || !installer.active) throw new HttpError(404, 'Charger installer not found.')

  return json(request, { installer: toPublic(installer) })
}

/* ---------- validation ---------- */

function readPackage(value: unknown, index: number, previousIds: Set<string>): InstallerPackage {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, `Package ${index + 1} is not valid.`)
  const body = value as Record<string, unknown>
  const label = `Package ${index + 1}`

  const name = requireLocalizedLoose(body.name, `${label} name`, 120)
  if (name.en.length < 2 && name.ar.length < 2) throw new HttpError(400, `Give ${label.toLowerCase()} a name.`)

  // Keep the id an editor's form sent back, so links to a package survive edits.
  const sentId = typeof body.id === 'string' && /^[a-f0-9]{8,24}$/.test(body.id) ? body.id : null
  const id = sentId && !previousIds.has(sentId) ? sentId : randomBytes(6).toString('hex')
  previousIds.add(id)

  const services = Array.isArray(body.services)
    ? [...new Set(body.services.map((item) => requireEnum(item, INSTALL_SERVICES, `${label} service`)))]
    : []

  return compact({
    id,
    name,
    chargerBrand: optionalString(body.chargerBrand, `${label} charger`, { max: 120 }),
    // Home wall boxes stop at 22 kW; anything above is a public DC unit.
    powerKw: optionalNumber(body.powerKw, `${label} power`, { min: 0, max: 400 }),
    phase: body.phase === undefined || body.phase === null || body.phase === '' ? undefined : requireEnum(body.phase, CHARGER_PHASES, `${label} phase`),
    connector:
      body.connector === undefined || body.connector === null || body.connector === ''
        ? undefined
        : requireEnum(body.connector, CHARGER_CONNECTORS, `${label} connector`),
    priceEgp: optionalMoney(body.priceEgp, `${label} price`),
    installIncluded: typeof body.installIncluded === 'boolean' ? body.installIncluded : undefined,
    cableMetersIncluded: optionalNumber(body.cableMetersIncluded, `${label} cable included`, { min: 0, max: 500 }),
    extraMeterEgp: optionalMoney(body.extraMeterEgp, `${label} price per extra metre`),
    warrantyYears: optionalNumber(body.warrantyYears, `${label} warranty`, { min: 0, max: 15 }),
    services,
    installments: optionalLocalized(body.installments, `${label} installments`, 500),
    notes: optionalLocalized(body.notes, `${label} notes`, 3000),
  })
}

function readPackages(value: unknown): InstallerPackage[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Packages must be a list.')
  if (value.length > MAX_PACKAGES) throw new HttpError(400, `An installer can list at most ${MAX_PACKAGES} packages.`)
  const ids = new Set<string>()
  return value.map((item, index) => readPackage(item, index, ids))
}

function readGovernorates(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'Governorates must be a list.')
  if (value.length > MAX_GOVERNORATES) throw new HttpError(400, 'Too many governorates.')
  const names = value.map((item) => optionalString(item, 'Governorate', { max: 60 })).filter((name): name is string => Boolean(name))
  return [...new Set(names)]
}

/** Every editable field. The admin form always sends the whole installer. */
function readInstallerBody(body: Record<string, unknown>) {
  const packages = readPackages(body.packages)
  return {
    name: requireName(body.name, 'charger installer'),
    description: optionalLocalized(body.description, 'Description', 5000) ?? { en: '', ar: '' },
    hotline: optionalString(body.hotline, 'Hotline', { max: 20 }),
    phone: optionalPhone(body.phone),
    whatsapp: optionalPhone(body.whatsapp),
    website: optionalUrl(body.website, 'Website'),
    email: optionalString(body.email, 'Email', { max: 200 }),
    governorates: readGovernorates(body.governorates),
    licensed: body.licensed === true,
    services: [...new Set(packages.flatMap((item) => item.services))],
    packages,
    images: compact(requireBlobImages(body.images)),
  }
}

/* ---------- writes ---------- */

async function createInstaller(request: Request): Promise<Response> {
  const editor = await requireListingAdder(request, 'installer')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const fields = readInstallerBody(body)
  // Whether a company is licensed is the site's to confirm, so a contributor's listing starts unconfirmed.
  if (!hasPermission(editor, 'installers.manage')) fields.licensed = false

  const now = new Date().toISOString()
  const doc = compact({
    ...fields,
    slug: slugify(fields.name.en || fields.name.ar, 'installer'),
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
  const result = await db.collection<InstallerDoc>('installers').insertOne(doc as InstallerDoc)

  await recordAudit(editor, 'installer.created', {
    target: { kind: 'installer', id: result.insertedId.toHexString(), label: doc.name.en || doc.name.ar },
  })

  return json(request, { installer: toPublic({ ...doc, _id: result.insertedId } as InstallerDoc) }, 201)
}

async function updateInstaller(request: Request, id: string): Promise<Response> {
  // Staff may edit any listing; a merchant or the contributor who added it only their own.
  const { user: editor, staff, merchant } = await requireListingEditor(request, 'installer', id)

  const body = await readJsonBody<Record<string, unknown>>(request)
  const db = await getDb()
  const collection = db.collection<InstallerDoc>('installers')
  const existing = await collection.findOne({ _id: new ObjectId(id) })
  if (!existing) throw new HttpError(404, 'Charger installer not found.')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updatedAt: now }

  // A body with a name is the full form; one without is a toggle such as
  // restoring a removed installer or confirming the prices are still right.
  let removedImages: string[] = []
  if (body.name !== undefined) {
    const fields = readInstallerBody(body)
    // Whether a company is licensed is the site's to confirm, not the company's.
    if (!staff) fields.licensed = existing.licensed
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

  await recordAudit(editor, 'installer.updated', {
    target: { kind: 'installer', id, label: existing.name.en || existing.name.ar },
    changes: {
      ...auditableChanges(body.name !== undefined ? listingChanges(existing as unknown as Record<string, unknown>, set, 'packages') : set),
      // A merchant's edit is marked, so staff can tell it from their own.
      ...(merchant ? { byMerchant: true } : {}),
    },
  })

  const saved = await collection.findOne({ _id: existing._id })
  return json(request, { installer: saved ? toPublic(saved) : null })
}

/** Soft delete: the packages, photos and reviews stay, in case the installer comes back. */
async function removeInstaller(request: Request, id: string): Promise<Response> {
  const editor = await requirePermission(request, 'installers.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Charger installer not found.')

  const db = await getDb()
  const installer = await db
    .collection<InstallerDoc>('installers')
    .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { active: false, updatedAt: new Date().toISOString() } })

  if (!installer) throw new HttpError(404, 'Charger installer not found.')

  await recordAudit(editor, 'installer.removed', { target: { kind: 'installer', id, label: installer.name.en || installer.name.ar } })

  return json(request, { ok: true })
}
