import { ObjectId } from 'mongodb'
import { requireUser, type SessionUser, type UserDoc } from './auth.js'
import { hasPermission, requirePermission, type Permission } from './permissions.js'
import { HttpError, json, readJsonBody, searchParams } from './http.js'
import { getDb } from './mongo.js'
import { recordAudit, type AuditAction } from './audit.js'
import { requireEmail } from './models.js'
import { requireAdder } from './ownership.js'

/**
 * Merchant accounts: an insurance company, a protection center or a charger
 * installer editing its own listing.
 *
 * Staff with `insurance.manage` or `centers.manage` look after every listing
 * of that kind. A merchant is an ordinary account that staff have linked to
 * one or more listings; it may edit those, and only those. The link lives on
 * the listing (`merchantIds`), so removing an account from a listing takes
 * effect on its next request, like any other permission change.
 *
 * A contributor holds the kind's `addPermission`: they may add listings and
 * edit the ones they added (`createdById`), but not anybody else's.
 *
 * What only staff may do: remove listings, take one off the site or put it
 * back, and decide who its merchants are.
 */

export type MerchantKind = 'insurer' | 'center' | 'installer'

type KindConfig = {
  collection: string
  permission: Permission
  /** Lets an account add listings of this kind and edit only its own (see ownership.ts). */
  addPermission: Permission
  noun: string
  actions: { added: AuditAction; removed: AuditAction }
}

export const MERCHANT_KINDS: Record<MerchantKind, KindConfig> = {
  insurer: {
    collection: 'insurers',
    permission: 'insurance.manage',
    addPermission: 'insurance.add',
    noun: 'Insurance company',
    actions: { added: 'insurer.merchant_added', removed: 'insurer.merchant_removed' },
  },
  center: {
    collection: 'centers',
    permission: 'centers.manage',
    addPermission: 'centers.add',
    noun: 'Protection center',
    actions: { added: 'center.merchant_added', removed: 'center.merchant_removed' },
  },
  installer: {
    collection: 'installers',
    permission: 'installers.manage',
    addPermission: 'installers.add',
    noun: 'Charger installer',
    actions: { added: 'installer.merchant_added', removed: 'installer.merchant_removed' },
  },
}

type MerchantListing = { _id: ObjectId; name: { en: string; ar: string }; merchantIds?: string[]; createdById?: string }

/** True when the account may add listings of this kind without managing them all. */
function canContribute(user: SessionUser, kind: MerchantKind): boolean {
  return hasPermission(user, MERCHANT_KINDS[kind].addPermission)
}

/** Anyone who may add a listing of this kind: staff, or a contributor. */
export function requireListingAdder(request: Request, kind: MerchantKind): Promise<SessionUser> {
  const config = MERCHANT_KINDS[kind]
  return requireAdder(request, { manage: config.permission, add: config.addPermission })
}

/** The listings an account may edit without staff rights: the ones it runs, and the ones it added. */
function ownListings(user: SessionUser, kind: MerchantKind): Record<string, unknown> {
  return canContribute(user, kind)
    ? { $or: [{ merchantIds: user.id }, { createdById: user.id }] }
    : { merchantIds: user.id }
}

/** The listings an account is the merchant of, by kind. */
export async function managedListings(userId: string): Promise<{ insurers: string[]; centers: string[]; installers: string[] }> {
  const db = await getDb()
  const ids = async (kind: MerchantKind) =>
    (
      await db
        .collection<MerchantListing>(MERCHANT_KINDS[kind].collection)
        .find({ merchantIds: userId }, { projection: { _id: 1 } })
        .toArray()
    ).map((doc) => doc._id.toHexString())

  const [insurers, centers, installers] = await Promise.all([ids('insurer'), ids('center'), ids('installer')])
  return { insurers, centers, installers }
}

/** True when the account manages at least one listing of this kind. */
export async function isMerchantOf(user: SessionUser, kind: MerchantKind): Promise<boolean> {
  const db = await getDb()
  const count = await db
    .collection<MerchantListing>(MERCHANT_KINDS[kind].collection)
    .countDocuments({ merchantIds: user.id }, { limit: 1 })
  return count > 0
}

/**
 * Who may edit this listing: staff for the kind, one of its merchants, or the
 * contributor who added it.
 * Anyone else gets the same 404 as a listing that does not exist, so the
 * endpoint cannot be used to discover other merchants' listings.
 */
export async function requireListingEditor(
  request: Request,
  kind: MerchantKind,
  id: string,
): Promise<{ user: SessionUser; staff: boolean; merchant: boolean }> {
  const config = MERCHANT_KINDS[kind]
  const user = await requireUser(request)
  if (hasPermission(user, config.permission)) return { user, staff: true, merchant: false }

  const notFound = new HttpError(404, `${config.noun} not found.`)
  if (!ObjectId.isValid(id)) throw notFound

  const db = await getDb()
  const mine = await db
    .collection<MerchantListing>(config.collection)
    .findOne({ _id: new ObjectId(id), ...ownListings(user, kind) }, { projection: { merchantIds: 1 } })
  if (!mine) throw notFound

  return { user, staff: false, merchant: mine.merchantIds?.includes(user.id) ?? false }
}

/**
 * The filter for the admin table. `all=1` is staff only and shows every
 * listing; `mine=1` shows the caller's own (run or added), removed ones included. `null`
 * means a public request.
 */
export async function adminListFilter(request: Request, kind: MerchantKind): Promise<Record<string, unknown> | null> {
  const params = searchParams(request)
  if (params.get('all') === '1') {
    await requirePermission(request, MERCHANT_KINDS[kind].permission)
    return {}
  }
  if (params.get('mine') === '1') {
    const user = await requireUser(request)
    return ownListings(user, kind)
  }
  return null
}

export type MerchantSummary = { id: string; name: string; email: string }

/** Names and addresses of the accounts behind each listing, for the staff table. */
export async function merchantsByListing(listings: MerchantListing[]): Promise<Map<string, MerchantSummary[]>> {
  const ids = [...new Set(listings.flatMap((listing) => listing.merchantIds ?? []))].filter((id) => ObjectId.isValid(id))
  const db = await getDb()
  const users = ids.length
    ? await db
        .collection<UserDoc>('users')
        .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { name: 1, email: 1 } })
        .toArray()
    : []
  const byId = new Map(users.map((user) => [user._id.toHexString(), { id: user._id.toHexString(), name: user.name, email: user.email }]))

  return new Map(
    listings.map((listing) => [
      listing._id.toHexString(),
      (listing.merchantIds ?? []).map((id) => byId.get(id)).filter((user): user is MerchantSummary => Boolean(user)),
    ]),
  )
}

/**
 * `POST {kind}/:id/merchants` with `{ email }` links an account;
 * `DELETE {kind}/:id/merchants/:userId` unlinks it. Staff only.
 */
export async function handleMerchants(request: Request, kind: MerchantKind, listingId: string, userId?: string): Promise<Response> {
  const config = MERCHANT_KINDS[kind]
  const staff = await requirePermission(request, config.permission)
  if (!ObjectId.isValid(listingId)) throw new HttpError(404, `${config.noun} not found.`)

  const db = await getDb()
  const listings = db.collection<MerchantListing>(config.collection)
  const listing = await listings.findOne({ _id: new ObjectId(listingId) }, { projection: { name: 1, merchantIds: 1 } })
  if (!listing) throw new HttpError(404, `${config.noun} not found.`)
  const label = listing.name.en || listing.name.ar

  if (request.method === 'POST' && !userId) {
    const body = await readJsonBody<Record<string, unknown>>(request)
    const email = requireEmail(body.email)
    const account = await db.collection<UserDoc>('users').findOne({ email }, { projection: { name: 1, email: 1, status: 1 } })
    if (!account) {
      throw new HttpError(404, 'No account uses that email. Ask them to sign up on the site first, then add them here.')
    }
    if (account.status === 'blocked') throw new HttpError(409, 'That account is blocked.')

    const id = account._id.toHexString()
    await listings.updateOne({ _id: listing._id }, { $addToSet: { merchantIds: id } })
    await recordAudit(staff, config.actions.added, { target: { kind, id: listingId, label }, changes: { merchant: account.email } })

    return json(request, { merchant: { id, name: account.name, email: account.email } }, 201)
  }

  if (request.method === 'DELETE' && userId) {
    const account = ObjectId.isValid(userId)
      ? await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(userId) }, { projection: { email: 1 } })
      : null
    await listings.updateOne({ _id: listing._id }, { $pull: { merchantIds: userId } })
    await recordAudit(staff, config.actions.removed, {
      target: { kind, id: listingId, label },
      changes: { merchant: account?.email ?? userId },
    })
    return json(request, { ok: true })
  }

  throw new HttpError(405, 'Method not allowed.')
}
