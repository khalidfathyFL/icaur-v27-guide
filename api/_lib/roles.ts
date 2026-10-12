import { ObjectId } from 'mongodb'
import { getDb } from './mongo.js'
import { HttpError } from './http.js'
import type { Permission } from './permissions.js'

/**
 * A named bundle of permissions, so "moderator" is granted once and assigned
 * to people instead of ticking the same five boxes on every account.
 *
 * An account holds its individual grants plus everything its roles hold;
 * `resolveSessionUser` in auth.ts does the merging.
 */
export type RoleDoc = {
  _id: ObjectId
  name: string
  description?: string
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

export function toPublicRole(role: RoleDoc) {
  return {
    id: role._id.toHexString(),
    name: role.name,
    description: role.description,
    permissions: role.permissions,
  }
}

/**
 * Normalises a submitted list of role ids, refusing any that do not exist so
 * an account cannot be pointed at a role that was never created.
 */
export async function parseRoleIds(value: unknown): Promise<string[]> {
  if (!Array.isArray(value)) throw new HttpError(400, 'Roles must be a list.')

  if (!value.every((id) => typeof id === 'string' && ObjectId.isValid(id))) throw new HttpError(400, 'Unknown role.')
  const ids = [...new Set(value as string[])]
  if (ids.length === 0) return []

  const db = await getDb()
  const found = await db
    .collection<RoleDoc>('roles')
    .countDocuments({ _id: { $in: ids.map((id) => new ObjectId(id)) } })

  if (found !== ids.length) throw new HttpError(400, 'Unknown role.')
  return ids
}
