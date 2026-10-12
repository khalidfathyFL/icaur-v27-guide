import { ObjectId } from 'mongodb'
import type { UserDoc } from '../_lib/auth.js'
import { parsePermissions, requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { auditableChanges, recordAudit } from '../_lib/audit.js'
import { optionalString, requireString } from '../_lib/models.js'
import { toPublicRole, type RoleDoc } from '../_lib/roles.js'

/**
 * Roles are part of account control, so every endpoint here asks for
 * `users.manage`: whoever may grant a permission directly may also put it in
 * a role.
 */
export async function handleRoles(request: Request, segments: string[]): Promise<Response> {
  const [id] = segments

  if (!id) {
    if (request.method === 'GET') return listRoles(request)
    if (request.method === 'POST') return createRole(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Role not found.')
  if (request.method === 'PATCH') return updateRole(request, id)
  if (request.method === 'DELETE') return deleteRole(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

async function listRoles(request: Request): Promise<Response> {
  await requirePermission(request, 'users.manage')
  const db = await getDb()
  const roles = await db.collection<RoleDoc>('roles').find({}).sort({ name: 1 }).toArray()

  // Member counts let the screen warn before a role that people hold is deleted.
  const counts = await db
    .collection<UserDoc>('users')
    .aggregate<{ _id: string; count: number }>([
      { $match: { roleIds: { $exists: true, $ne: [] } } },
      { $unwind: '$roleIds' },
      { $group: { _id: '$roleIds', count: { $sum: 1 } } },
    ])
    .toArray()
  const members = new Map(counts.map((row) => [row._id, row.count]))

  return json(request, {
    roles: roles.map((role) => ({ ...toPublicRole(role), members: members.get(role._id.toHexString()) ?? 0 })),
  })
}

/** Names are unique, ignoring case, so two roles cannot be confused in a list. */
async function assertNameFree(name: string, exceptId?: string) {
  const db = await getDb()
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const clash = await db.collection<RoleDoc>('roles').findOne({
    name: { $regex: `^${escaped}$`, $options: 'i' },
    ...(exceptId ? { _id: { $ne: new ObjectId(exceptId) } } : {}),
  })
  if (clash) throw new HttpError(409, 'A role with that name already exists.')
}

async function createRole(request: Request): Promise<Response> {
  const admin = await requirePermission(request, 'users.manage')
  const body = await readJsonBody<Record<string, unknown>>(request)

  const name = requireString(body.name, 'Role name', { min: 2, max: 60 })
  await assertNameFree(name)

  const now = new Date().toISOString()
  const doc = {
    name,
    description: optionalString(body.description, 'Description', { max: 300 }),
    permissions: parsePermissions(body.permissions ?? []),
    createdAt: now,
    updatedAt: now,
  }

  const db = await getDb()
  const result = await db.collection<RoleDoc>('roles').insertOne(doc as RoleDoc)

  await recordAudit(admin, 'role.created', {
    target: { kind: 'role', id: result.insertedId.toHexString(), label: name },
    changes: { permissions: doc.permissions },
  })

  return json(request, { role: toPublicRole({ ...doc, _id: result.insertedId } as RoleDoc) }, 201)
}

async function updateRole(request: Request, id: string): Promise<Response> {
  const admin = await requirePermission(request, 'users.manage')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (body.name !== undefined) {
    update.name = requireString(body.name, 'Role name', { min: 2, max: 60 })
    await assertNameFree(update.name as string, id)
  }
  if (body.description !== undefined) update.description = optionalString(body.description, 'Description', { max: 300 })
  if (body.permissions !== undefined) update.permissions = parsePermissions(body.permissions)

  const db = await getDb()
  const result = await db.collection<RoleDoc>('roles').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: 'after' },
  )
  if (!result) throw new HttpError(404, 'Role not found.')

  await recordAudit(admin, 'role.updated', {
    target: { kind: 'role', id, label: result.name },
    changes: auditableChanges(update),
  })

  return json(request, { role: toPublicRole(result) })
}

/** Deleting a role takes it off everyone who held it, along with its permissions. */
async function deleteRole(request: Request, id: string): Promise<Response> {
  const admin = await requirePermission(request, 'users.manage')
  const db = await getDb()

  const role = await db.collection<RoleDoc>('roles').findOneAndDelete({ _id: new ObjectId(id) })
  if (!role) throw new HttpError(404, 'Role not found.')

  const { modifiedCount } = await db
    .collection<UserDoc>('users')
    .updateMany({ roleIds: id }, { $pull: { roleIds: id } })

  await recordAudit(admin, 'role.deleted', {
    target: { kind: 'role', id, label: role.name },
    changes: { removedFrom: modifiedCount },
  })

  return json(request, { ok: true })
}
