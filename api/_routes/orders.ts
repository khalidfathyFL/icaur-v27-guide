import { ObjectId } from 'mongodb'
import { requireUser } from '../_lib/auth.js'
import { hasPermission, requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { recordAudit } from '../_lib/audit.js'
import { compact, setAndUnset } from '../_lib/catalog.js'
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  optionalMoney,
  optionalPhone,
  optionalString,
  requireEnum,
  requireString,
  type CartDoc,
  type OrderDoc,
  type OrderEvent,
  type OrderItem,
} from '../_lib/models.js'
import { resolveCart } from './cart.js'

/**
 * Order requests. A user sends their request list with how to reach them;
 * whoever holds `orders.manage` buys the parts, moves the request through its
 * statuses and records payment, which happens off the site.
 *
 * A request holds a phone number and an address, so only its owner and the
 * order handlers can read it, and the activity log records numbers and
 * statuses, never contact details.
 */

/** Requests waiting for a first answer, per person; beyond this they are asked to wait. */
const MAX_OPEN_REQUESTS = 3

type Viewer = 'owner' | 'staff'

function toPublic(order: OrderDoc, viewer: Viewer) {
  return {
    id: order._id.toHexString(),
    number: order.number,
    contact: order.contact,
    note: order.note,
    items: order.items,
    estimatedTotalEgp: order.estimatedTotalEgp,
    finalTotalEgp: order.finalTotalEgp,
    status: order.status,
    history: order.history,
    payment: order.payment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    ...(viewer === 'staff' ? { userId: order.userId, userEmail: order.userEmail, staffNote: order.staffNote } : {}),
  }
}

export async function handleOrders(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return listOrders(request)
    if (request.method === 'POST') return createOrder(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'cancel' && request.method === 'POST') return cancelOrder(request, id)
  if (!action && request.method === 'GET') return readOrder(request, id)
  if (!action && request.method === 'PATCH') return updateOrder(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/** `mine=1`: the caller's own requests. Otherwise the handling queue, which needs the permission. */
async function listOrders(request: Request): Promise<Response> {
  const params = searchParams(request)

  // Who is asking is settled before the database is touched.
  if (params.get('mine') === '1') {
    const user = await requireUser(request)
    const db = await getDb()
    const list = await db
      .collection<OrderDoc>('orders')
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return json(request, { orders: list.map((order) => toPublic(order, 'owner')) })
  }

  await requirePermission(request, 'orders.manage')
  const db = await getDb()
  const orders = db.collection<OrderDoc>('orders')
  const status = params.get('status')
  const filter =
    !status || status === 'all'
      ? {}
      : status === 'open'
        ? { status: { $nin: ['delivered', 'cancelled'] as const } }
        : { status: requireEnum(status, ORDER_STATUSES, 'Status') }

  const list = await orders.find(filter).sort({ createdAt: -1 }).limit(300).toArray()
  return json(request, { orders: list.map((order) => toPublic(order, 'staff')) })
}

async function findVisibleOrder(request: Request, id: string) {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Request not found.')
  const user = await requireUser(request)
  const db = await getDb()
  const order = await db.collection<OrderDoc>('orders').findOne({ _id: new ObjectId(id) })

  const staff = hasPermission(user, 'orders.manage')
  // Someone else's request is reported as missing, not forbidden, so ids cannot be probed.
  if (!order || (!staff && order.userId !== user.id)) throw new HttpError(404, 'Request not found.')

  return { user, db, order, viewer: (staff ? 'staff' : 'owner') as Viewer }
}

async function readOrder(request: Request, id: string): Promise<Response> {
  const { order, viewer } = await findVisibleOrder(request, id)
  return json(request, { order: toPublic(order, viewer) })
}

function readContact(value: unknown) {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, 'Tell us how to reach you.')
  const body = value as Record<string, unknown>

  const phone = optionalPhone(body.phone)
  if (!phone) throw new HttpError(400, 'Enter a phone number we can call you on.')

  return compact({
    name: requireString(body.name, 'Name', { min: 2, max: 120 }),
    phone,
    whatsapp: optionalPhone(body.whatsapp),
    city: optionalString(body.city, 'City', { max: 80 }),
    address: optionalString(body.address, 'Address', { max: 400 }),
  })
}

/** Next request number, from a counter rather than a count, so a deleted request never frees its number. */
async function nextNumber(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const counter = await db
    .collection<{ _id: string; seq: number }>('counters')
    .findOneAndUpdate({ _id: 'orders' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })
  return `IC-${String(counter?.seq ?? 1).padStart(4, '0')}`
}

/** Sends the caller's request list: copies it into a request and empties it. */
async function createOrder(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)
  const contact = readContact(body.contact)
  const note = optionalString(body.note, 'Note', { max: 1500 })

  const db = await getDb()
  const orders = db.collection<OrderDoc>('orders')

  const waiting = await orders.countDocuments({ userId: user.id, status: 'new' })
  if (waiting >= MAX_OPEN_REQUESTS) {
    throw new HttpError(429, `You have ${waiting} requests waiting for an answer. Please wait for those first.`)
  }

  const cart = await db.collection<CartDoc>('carts').findOne({ userId: user.id })
  if (!cart || cart.items.length === 0) throw new HttpError(400, 'Your request list is empty.')

  const lines = await resolveCart(db, cart.items)
  const blocked = lines.filter((line) => !line.partDoc || line.partDoc.availability === 'unavailable')
  if (blocked.length > 0) {
    throw new HttpError(409, 'Some accessories in your list are no longer available. Remove them and send again.')
  }

  const items: OrderItem[] = lines.map(({ partDoc, ...line }) => {
    const part = partDoc!
    return compact({
      partId: line.partId,
      slug: part.slug,
      name: part.name,
      source: part.source,
      quantity: line.quantity,
      note: line.note,
      fitting: line.fitting,
      unitPriceEgp:
        part.price.amountEgp === undefined
          ? undefined
          : part.price.amountEgp + (part.price.shippingEgp ?? 0) + (part.price.customsEgp ?? 0),
      installEgp: line.fitting ? part.price.installEgp : undefined,
    })
  })

  // Lines with no price are left out; the team prices them when confirming.
  const estimatedTotalEgp = items.reduce(
    (sum, item) => sum + (item.unitPriceEgp ?? 0) * item.quantity + (item.installEgp ?? 0),
    0,
  )
  const now = new Date().toISOString()

  const doc = compact({
    number: await nextNumber(db),
    userId: user.id,
    userEmail: user.email,
    contact,
    note,
    items,
    estimatedTotalEgp,
    status: 'new' as const,
    history: [{ status: 'new' as const, at: now, by: user.name }],
    payment: { status: 'unpaid' as const },
    createdAt: now,
    updatedAt: now,
  })

  const result = await orders.insertOne(doc as OrderDoc)
  await db.collection<CartDoc>('carts').deleteOne({ userId: user.id })

  await recordAudit(user, 'order.created', {
    target: { kind: 'order', id: result.insertedId.toHexString(), label: doc.number },
  })

  return json(request, { order: toPublic({ ...doc, _id: result.insertedId } as OrderDoc, 'owner') }, 201)
}

/** The customer may withdraw a request nobody has acted on yet. */
async function cancelOrder(request: Request, id: string): Promise<Response> {
  const { user, db, order } = await findVisibleOrder(request, id)
  if (order.userId !== user.id) throw new HttpError(404, 'Request not found.')
  if (order.status !== 'new') {
    throw new HttpError(409, 'This request is already being handled. Contact us to change or cancel it.')
  }

  const now = new Date().toISOString()
  const event: OrderEvent = { status: 'cancelled', at: now, by: user.name, note: 'Cancelled by the customer.' }
  await db
    .collection<OrderDoc>('orders')
    .updateOne({ _id: order._id, status: 'new' }, { $set: { status: 'cancelled', updatedAt: now }, $push: { history: event } })

  await recordAudit(user, 'order.cancelled', { target: { kind: 'order', id, label: order.number } })

  return json(request, { ok: true })
}

/** Status, payment, the agreed price and notes, all optional, from the handling screen. */
async function updateOrder(request: Request, id: string): Promise<Response> {
  const handler = await requirePermission(request, 'orders.manage')
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Request not found.')

  const body = await readJsonBody<Record<string, unknown>>(request)
  const db = await getDb()
  const orders = db.collection<OrderDoc>('orders')
  const order = await orders.findOne({ _id: new ObjectId(id) })
  if (!order) throw new HttpError(404, 'Request not found.')

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updatedAt: now }
  const logged: Record<string, unknown> = {}
  let event: OrderEvent | null = null

  if (body.status !== undefined) {
    const status = requireEnum(body.status, ORDER_STATUSES, 'Status')
    const note = optionalString(body.statusNote, 'Message to the customer', { max: 1000 })
    // A message without a new status is still a step in the history.
    if (status !== order.status || note) {
      update.status = status
      event = compact({ status, at: now, by: handler.name, note })
      logged.status = status
    }
  }

  if (body.payment !== undefined) {
    if (typeof body.payment !== 'object' || body.payment === null) throw new HttpError(400, 'Payment is not valid.')
    const payment = body.payment as Record<string, unknown>
    update.payment = compact({
      status: requireEnum(payment.status, PAYMENT_STATUSES, 'Payment status'),
      amountEgp: optionalMoney(payment.amountEgp, 'Amount paid'),
      note: optionalString(payment.note, 'Payment note', { max: 300 }),
    })
    logged.payment = (update.payment as { status: string }).status
  }

  if (body.finalTotalEgp !== undefined) {
    update.finalTotalEgp = optionalMoney(body.finalTotalEgp, 'Agreed total')
    logged.finalTotalEgp = update.finalTotalEgp ?? null
  }

  if (body.staffNote !== undefined) update.staffNote = optionalString(body.staffNote, 'Staff note', { max: 2000 })

  const { update: changes } = setAndUnset(update)
  await orders.updateOne({ _id: order._id }, event ? { ...changes, $push: { history: event } } : changes)

  if (Object.keys(logged).length > 0) {
    await recordAudit(handler, 'order.updated', {
      target: { kind: 'order', id, label: order.number },
      changes: logged,
      note: event?.note,
    })
  }

  const saved = await orders.findOne({ _id: order._id })
  return json(request, { order: saved ? toPublic(saved, 'staff') : null })
}
