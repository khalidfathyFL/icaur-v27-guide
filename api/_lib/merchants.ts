import { ObjectId } from 'mongodb'
import { requireUser, type SessionUser, type UserDoc } from './auth.js'
import { hasPermission, requirePermission, type Permission } from './permissions.js'
import { HttpError, json, readJsonBody, searchParams } from './http.js'
import { getDb } from './mongo.js'
import { recordAudit, type AuditAction } from './audit.js'
import { requireEmail } from './models.js'

/**
 * Merchant accounts: an insurance company or a protection center editing its
 * own listing.
 *
 * Staff with `insurance.manage` or `centers.manage` look after every listing
 * of that kind. A merchant is an ordinary account that staff have linked to
 * one or more listings; it may edit those, and only those. The link lives on
 * the listing (`merchantIds`), so removing an account from a listing takes
 * effect on its next request, like any other permission change.
 *
 * What only staff may do: add or remove listings, take one off the site or
 * put it back, and decide who its merchants are.
 */

export type MerchantKind = 'insurer' | 'center'

type KindConfig = {
  collection: string
  permission: Permission
  noun: string
  actions: { added: AuditAction; removed: AuditAction }
}

export const MERCHANT_KINDS: Record<MerchantKind, KindConfig> = {
  insurer: {
    collection: 'insurers',
    permission: 'insurance.manage',
    noun: 'Insurance company',
    actions: { added: 'insurer.merchant_added', removed: 'insurer.merchant_removed' },
  },
  center: {
    collection: 'centers',
    permission: 'centers.manage',
    noun: 'Protection center',
    actions: { added: 'center.merchant_added', removed: 'center.merchant_removed' },
  },
}

type MerchantListing = { _id: ObjectId; name: { en: string; ar: string }; merchantIds?: string[] }

/** The listings an account is the merchant of, by kind. */
export async function managedListings(userId: string): Promise<{ insurers: string[]; centers: string[] }> {
  const db = await getDb()
  const ids = async (kind: MerchantKind) =>
    (
      await db
        .collection<MerchantListing>(MERCHANT_KINDS[kind].collection)
        .find({ merchantIds: userId }, { projection: { _id: 1 } })
        .toArray()
    ).map((doc) => doc._id.toHexString())

  const [insurers, centers] = await Promise.all([ids('insurer'), ids('center')])
  return { insurers, centers }
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
 * Who may edit this listing: staff for the kind, or one of its merchants.
 * Anyone else gets the same 404 as a listing that does not exist, so the
 * endpoint cannot be used to discover other merchants' listings.
 */
export async function requireListingEditor(
  request: Request,
  kind: MerchantKind,
  id: string,
): Promise<{ user: SessionUser; staff: boolean }> {
  const config = MERCHANT_KINDS[kind]
  const user = await requireUser(request)
  if (hasPermission(user, config.permission)) return { user, staff: true }

  const notFound = new HttpError(404, `${config.noun} not found.`)
  if (!ObjectId.isValid(id)) throw notFound

  const db = await getDb()
  const mine = await db
    .collection<MerchantListing>(config.collection)
    .countDocuments({ _id: new ObjectId(id), merchantIds: user.id }, { limit: 1 })
  if (mine === 0) throw notFound

  return { user, staff: false }
}

/**
 * The filter for the admin table. `all=1` is staff only and shows every
 * listing; `mine=1` shows the caller's own, removed ones included. `null`
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
    return { merchantIds: user.id }
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
