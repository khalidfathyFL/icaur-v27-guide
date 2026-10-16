import { ObjectId } from 'mongodb'
import { requireUser, type SessionUser } from './auth.js'
import { hasPermission, requirePermission, type Permission } from './permissions.js'
import { HttpError, searchParams } from './http.js'
import { getDb } from './mongo.js'

/**
 * "Add, and edit only your own": the contributor half of every catalog.
 *
 * Each catalog has two permissions. `*.manage` covers every item in it.
 * `*.add` lets an account add items and edit the ones it added, which the
 * item remembers as `createdById`, but nobody else's. Removing an item or
 * putting it back stays with `*.manage`.
 *
 * The check re-reads the item on every request, so taking `*.add` away ends
 * the editing on the next request, like any other permission change.
 * Insurers, centers and installers also have merchants; merchants.ts layers
 * those on top of the same two permissions.
 */

export type CatalogAccess = {
  manage: Permission
  add: Permission
  collection: string
  /** Capitalised, for "Dealer not found." */
  noun: string
}

export const CATALOGS = {
  dealer: { manage: 'dealers.manage', add: 'dealers.add', collection: 'dealers', noun: 'Dealer' },
  part: { manage: 'parts.manage', add: 'parts.add', collection: 'parts', noun: 'Accessory' },
  station: { manage: 'charging.manage', add: 'charging.add', collection: 'chargingStations', noun: 'Station' },
} satisfies Record<string, CatalogAccess>

/** Anyone who may add to the catalog: its managers and its contributors. */
export async function requireAdder(request: Request, access: Pick<CatalogAccess, 'manage' | 'add'>): Promise<SessionUser> {
  const user = await requireUser(request)
  if (!hasPermission(user, access.manage) && !hasPermission(user, access.add)) {
    throw new HttpError(403, 'Your account does not have permission to do that.')
  }
  return user
}

/**
 * Who may edit this item: a manager, or the contributor who added it. Anyone
 * else gets the same 404 as a missing item, so the endpoint cannot be used to
 * learn what other people added.
 */
export async function requireItemEditor(
  request: Request,
  access: CatalogAccess,
  id: string,
): Promise<{ user: SessionUser; staff: boolean }> {
  const user = await requireUser(request)
  const notFound = new HttpError(404, `${access.noun} not found.`)
  if (!ObjectId.isValid(id)) throw notFound
  if (hasPermission(user, access.manage)) return { user, staff: true }
  if (!hasPermission(user, access.add)) throw notFound

  const db = await getDb()
  const mine = await db
    .collection(access.collection)
    .countDocuments({ _id: new ObjectId(id), createdById: user.id }, { limit: 1 })
  if (mine === 0) throw notFound

  return { user, staff: false }
}

/**
 * The filter for an admin table. `all=1` is for managers and shows every
 * item; `mine=1` shows what the caller added, removed ones included. `null`
 * means a public request.
 */
export async function ownListFilter(request: Request, access: CatalogAccess): Promise<Record<string, unknown> | null> {
  const params = searchParams(request)
  if (params.get('all') === '1') {
    await requirePermission(request, access.manage)
    return {}
  }
  if (params.get('mine') === '1') {
    const user = await requireUser(request)
    return { createdById: user.id }
  }
  return null
}

/** Taking an item off the site, or putting it back, is the managers' call. */
export function refuseUnlessStaff(staff: boolean): void {
  if (!staff) throw new HttpError(403, 'Only the site team can remove or restore an item.')
}
