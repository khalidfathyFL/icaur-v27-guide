import { ObjectId } from 'mongodb'
import {
  hashPassword,
  issueToken,
  requireUser,
  verifyPassword,
  type Role,
  type UserDoc,
} from '../_lib/auth'
import { HttpError, json, readJsonBody } from '../_lib/http'
import { getDb } from '../_lib/mongo'
import { requireEmail, requirePassword, requireString } from '../_lib/models'

/**
 * The first account to register becomes the admin, which bootstraps the site
 * without shipping a default password. Everyone after that is a contributor
 * until an existing admin promotes them.
 */
async function roleForNewUser(): Promise<Role> {
  const db = await getDb()
  const existing = await db.collection('users').countDocuments({}, { limit: 1 })
  return existing === 0 ? 'admin' : 'user'
}

export async function handleAuth(request: Request, segments: string[]): Promise<Response> {
  const action = segments[0]

  if (action === 'register' && request.method === 'POST') return register(request)
  if (action === 'login' && request.method === 'POST') return login(request)
  if (action === 'me' && request.method === 'GET') return me(request)
  if (action === 'users') return users(request, segments.slice(1))

  throw new HttpError(404, 'Unknown auth endpoint.')
}

async function register(request: Request): Promise<Response> {
  const body = await readJsonBody<Record<string, unknown>>(request)
  const email = requireEmail(body.email)
  const password = requirePassword(body.password)
  const name = requireString(body.name, 'Name', { min: 2, max: 80 })

  const db = await getDb()
  const users = db.collection<UserDoc>('users')

  if (await users.findOne({ email })) {
    throw new HttpError(409, 'An account with that email already exists.')
  }

  const role = await roleForNewUser()
  const doc = {
    email,
    name,
    passwordHash: await hashPassword(password),
    role,
    status: 'active' as const,
    createdAt: new Date().toISOString(),
  }

  const result = await users.insertOne(doc as UserDoc)
  const user = { id: result.insertedId.toHexString(), email, name, role }

  return json(request, { user, token: await issueToken(user) }, 201)
}

async function login(request: Request): Promise<Response> {
  const body = await readJsonBody<Record<string, unknown>>(request)
  const email = requireEmail(body.email)
  const password = requireString(body.password, 'Password', { max: 200 })

  const db = await getDb()
  const found = await db.collection<UserDoc>('users').findOne({ email })

  // Same message either way, so the endpoint cannot be used to discover which
  // email addresses have accounts.
  const invalid = new HttpError(401, 'Email or password is incorrect.')
  if (!found) throw invalid
  if (!(await verifyPassword(password, found.passwordHash))) throw invalid
  if (found.status === 'blocked') throw new HttpError(403, 'This account has been blocked.')

  const user = {
    id: found._id.toHexString(),
    email: found.email,
    name: found.name,
    role: found.role,
  }

  return json(request, { user, token: await issueToken(user) })
}

async function me(request: Request): Promise<Response> {
  return json(request, { user: await requireUser(request) })
}

/** Admin-only: list contributors and change a role or block an account. */
async function users(request: Request, segments: string[]): Promise<Response> {
  const { requireAdmin } = await import('../_lib/auth')
  const admin = await requireAdmin(request)
  const db = await getDb()
  const collection = db.collection<UserDoc>('users')

  if (request.method === 'GET') {
    const list = await collection
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    return json(request, {
      users: list.map((user) => ({
        id: user._id.toHexString(),
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      })),
    })
  }

  if (request.method === 'PATCH') {
    const id = segments[0]
    if (!id || !ObjectId.isValid(id)) throw new HttpError(400, 'Unknown user.')
    if (id === admin.id) throw new HttpError(400, 'You cannot change your own role or status.')

    const body = await readJsonBody<Record<string, unknown>>(request)
    const update: Partial<Pick<UserDoc, 'role' | 'status'>> = {}

    if (body.role === 'admin' || body.role === 'user') update.role = body.role
    if (body.status === 'active' || body.status === 'blocked') update.status = body.status
    if (Object.keys(update).length === 0) throw new HttpError(400, 'Nothing to change.')

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: update })
    if (result.matchedCount === 0) throw new HttpError(404, 'Unknown user.')

    return json(request, { ok: true })
  }

  throw new HttpError(405, 'Method not allowed.')
}
