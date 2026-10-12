import { ObjectId, type Db } from 'mongodb'
import { requireUser } from '../_lib/auth.js'
import { HttpError, json, readJsonBody } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { compact } from '../_lib/catalog.js'
import { landedCostEgp } from './parts.js'
import { optionalString, type CartDoc, type CartItem, type PartDoc } from '../_lib/models.js'

/**
 * The request list: accessories a signed-in user wants ordered for them. It
 * lives on the account rather than in the browser, so it is the same list on
 * their phone and laptop and is still there next week.
 */

export const MAX_CART_ITEMS = 30
export const MAX_QUANTITY = 20

/** What the cart page needs to show a line, read fresh from the accessory. */
function partSummary(part: PartDoc) {
  return {
    id: part._id.toHexString(),
    slug: part.slug,
    name: part.name,
    source: part.source,
    availability: part.availability,
    active: part.active,
    /** Item, shipping and customs per unit; fitting is separate. */
    unitPriceEgp: landedCostEgp({ ...part.price, installEgp: undefined }),
    installEgp: part.price.installEgp,
    leadTimeDays: part.leadTimeDays,
    image: part.images[0],
  }
}

/** The cart's lines with each accessory as it is now; a removed one comes back as `part: null`. */
export async function resolveCart(db: Db, items: CartItem[]) {
  const ids = items.filter((item) => ObjectId.isValid(item.partId)).map((item) => new ObjectId(item.partId))
  const parts = await db
    .collection<PartDoc>('parts')
    .find({ _id: { $in: ids } })
    .toArray()
  const byId = new Map(parts.map((part) => [part._id.toHexString(), part]))

  return items.map((item) => {
    const part = byId.get(item.partId)
    return { ...item, part: part && part.active ? partSummary(part) : null, partDoc: part && part.active ? part : null }
  })
}

async function cartResponse(request: Request, db: Db, items: CartItem[], updatedAt?: string) {
  const lines = await resolveCart(db, items)
  return json(request, {
    cart: { items: lines.map(({ partDoc: _unused, ...line }) => line), updatedAt: updatedAt ?? null },
  })
}

export async function handleCart(request: Request, segments: string[]): Promise<Response> {
  if (segments.length > 0) throw new HttpError(404, 'Unknown endpoint.')

  if (request.method === 'GET') return readCart(request)
  if (request.method === 'PUT') return saveCart(request)
  if (request.method === 'DELETE') return clearCart(request)

  throw new HttpError(405, 'Method not allowed.')
}

async function readCart(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const db = await getDb()
  const cart = await db.collection<CartDoc>('carts').findOne({ userId: user.id })
  return cartResponse(request, db, cart?.items ?? [], cart?.updatedAt)
}

function readItems(value: unknown, previous: CartItem[]): CartItem[] {
  if (!Array.isArray(value)) throw new HttpError(400, 'Items must be a list.')
  if (value.length > MAX_CART_ITEMS) throw new HttpError(400, `A request can hold at most ${MAX_CART_ITEMS} accessories.`)

  const added = new Map(previous.map((item) => [item.partId, item.addedAt]))
  const seen = new Set<string>()
  const now = new Date().toISOString()
  const items: CartItem[] = []

  for (const [index, raw] of value.entries()) {
    if (typeof raw !== 'object' || raw === null) throw new HttpError(400, `Line ${index + 1} is not valid.`)
    const body = raw as Record<string, unknown>

    const partId = typeof body.partId === 'string' ? body.partId : ''
    if (!ObjectId.isValid(partId)) throw new HttpError(400, `Line ${index + 1} has no accessory.`)
    // The same accessory twice is one line; the first one wins.
    if (seen.has(partId)) continue
    seen.add(partId)

    const quantity = typeof body.quantity === 'number' ? body.quantity : Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new HttpError(400, `Quantity must be a whole number from 1 to ${MAX_QUANTITY}.`)
    }

    items.push(
      compact({
        partId,
        quantity,
        note: optionalString(body.note, 'Note', { max: 300 }),
        fitting: body.fitting === true,
        addedAt: added.get(partId) ?? now,
      }),
    )
  }

  return items
}

/** Replaces the whole list: the page edits it locally and sends it back. */
async function saveCart(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const db = await getDb()
  const carts = db.collection<CartDoc>('carts')
  const existing = await carts.findOne({ userId: user.id })
  const items = readItems(body.items, existing?.items ?? [])

  // New lines must point at an accessory that is listed now. Lines already in
  // the cart are kept even if their accessory has since gone, so the page can
  // say so instead of the line silently vanishing.
  const known = new Set((existing?.items ?? []).map((item) => item.partId))
  const fresh = items.filter((item) => !known.has(item.partId))
  if (fresh.length > 0) {
    const listed = await db.collection<PartDoc>('parts').countDocuments({
      _id: { $in: fresh.map((item) => new ObjectId(item.partId)) },
      active: true,
      availability: { $ne: 'unavailable' },
    })
    if (listed !== fresh.length) throw new HttpError(409, 'One of these accessories is not available to request.')
  }

  const updatedAt = new Date().toISOString()
  await carts.updateOne({ userId: user.id }, { $set: { items, updatedAt } }, { upsert: true })

  return cartResponse(request, db, items, updatedAt)
}

async function clearCart(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const db = await getDb()
  await db.collection<CartDoc>('carts').deleteOne({ userId: user.id })
  return cartResponse(request, db, [])
}
