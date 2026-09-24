import { ObjectId } from 'mongodb'
import { requireAdmin } from '../_lib/auth'
import { HttpError, json, readJsonBody } from '../_lib/http'
import { getDb } from '../_lib/mongo'
import { optionalString, requireString, type DealerDoc } from '../_lib/models'

function toPublic(dealer: DealerDoc) {
  return {
    id: dealer._id.toHexString(),
    name: dealer.name,
    area: dealer.area,
    phone: dealer.phone,
    sellsAtListPrice: dealer.sellsAtListPrice,
    notes: dealer.notes,
    verifiedAt: dealer.verifiedAt,
  }
}

export async function handleDealers(request: Request, segments: string[]): Promise<Response> {
  const [id] = segments

  if (!id) {
    if (request.method === 'GET') return listDealers(request)
    if (request.method === 'POST') return createDealer(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (request.method === 'PATCH') return updateDealer(request, id)
  if (request.method === 'DELETE') return deleteDealer(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/** Public: the site reads this to show who sells at the official price. */
async function listDealers(request: Request): Promise<Response> {
  const db = await getDb()
  const dealers = await db
    .collection<DealerDoc>('dealers')
    .find({ active: true })
    .sort({ sellsAtListPrice: -1, name: 1 })
    .limit(200)
    .toArray()

  return json(request, { dealers: dealers.map(toPublic) })
}

/** Dealer records are facts about the market, so only admins write them. */
function readDealerBody(body: Record<string, unknown>) {
  return {
    name: requireString(body.name, 'Dealer name', { min: 2, max: 160 }),
    area: requireString(body.area, 'Area', { min: 2, max: 160 }),
    phone: optionalString(body.phone, 'Phone', { max: 60 }),
    sellsAtListPrice: body.sellsAtListPrice === true,
    notes: optionalString(body.notes, 'Notes', { max: 1000 }),
  }
}

async function createDealer(request: Request): Promise<Response> {
  await requireAdmin(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const now = new Date().toISOString()
  const doc = {
    ...readDealerBody(body),
    active: true,
    verifiedAt: now,
    createdAt: now,
    updatedAt: now,
  }

  const db = await getDb()
  const result = await db.collection<DealerDoc>('dealers').insertOne(doc as DealerDoc)

  return json(request, { dealer: toPublic({ ...doc, _id: result.insertedId } as DealerDoc) }, 201)
}

async function updateDealer(request: Request, id: string): Promise<Response> {
  await requireAdmin(request)
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Dealer not found.')

  const body = await readJsonBody<Record<string, unknown>>(request)
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (body.name !== undefined) update.name = requireString(body.name, 'Dealer name', { min: 2, max: 160 })
  if (body.area !== undefined) update.area = requireString(body.area, 'Area', { min: 2, max: 160 })
  if (body.phone !== undefined) update.phone = optionalString(body.phone, 'Phone', { max: 60 })
  if (body.notes !== undefined) update.notes = optionalString(body.notes, 'Notes', { max: 1000 })
  if (body.sellsAtListPrice !== undefined) update.sellsAtListPrice = body.sellsAtListPrice === true
  if (body.active !== undefined) update.active = body.active === true
  if (body.verified === true) update.verifiedAt = new Date().toISOString()

  const db = await getDb()
  const result = await db
    .collection<DealerDoc>('dealers')
    .updateOne({ _id: new ObjectId(id) }, { $set: update })

  if (result.matchedCount === 0) throw new HttpError(404, 'Dealer not found.')

  return json(request, { ok: true })
}

async function deleteDealer(request: Request, id: string): Promise<Response> {
  await requireAdmin(request)
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Dealer not found.')

  const db = await getDb()
  // Soft delete: a dealer that stops honouring list price is history worth keeping.
  const result = await db
    .collection<DealerDoc>('dealers')
    .updateOne({ _id: new ObjectId(id) }, { $set: { active: false, updatedAt: new Date().toISOString() } })

  if (result.matchedCount === 0) throw new HttpError(404, 'Dealer not found.')

  return json(request, { ok: true })
}
