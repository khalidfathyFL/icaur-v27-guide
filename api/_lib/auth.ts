import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { SignJWT, jwtVerify } from 'jose'
import { ObjectId } from 'mongodb'
import { getDb } from './mongo.js'
import { HttpError } from './http.js'
import type { Permission } from './permissions.js'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64
/** "Remember me" keeps a browser signed in for a month; otherwise half a day. */
const REMEMBERED_TOKEN_TTL = '30d'
const SESSION_TOKEN_TTL = '12h'

export type Role = 'user' | 'admin'

/** What an owner can tell us about themselves and their car. All optional. */
export type UserProfile = {
  /**
   * Asked at sign-up. Accounts created before the question existed have none,
   * which is reported as unknown rather than guessed.
   */
  ownership?: 'owner' | 'interested'
  /** Mobile number, stored as the owner typed it. */
  phone?: string
  country?: string
  /** Governorate, only meaningful when country is Egypt. */
  city?: string
  /** Which trim they actually own, which tailors what the site shows them. */
  trim?: 'play' | 'wild'
  /** Body colour, from the launch palette. */
  colour?: string
}

export type UserDoc = UserProfile & {
  /** Granted individually; an admin holds every permission regardless. */
  permissions?: Permission[]
  /** Roles assigned to the account; each contributes its permissions. */
  roleIds?: string[]
  _id: ObjectId
  email: string
  name: string
  passwordHash: string
  role: Role
  status: 'active' | 'blocked'
  createdAt: string
  updatedAt?: string
}

export type SessionUser = UserProfile & {
  /** Effective: individual grants plus everything the account's roles hold. */
  permissions?: Permission[]
  roleIds?: string[]
  id: string
  email: string
  name: string
  role: Role
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters.')
  }
  return new TextEncoder().encode(secret)
}

/** scrypt with a per-password salt, stored as `salt:hash` in hex. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH)
  const expected = Buffer.from(hashHex, 'hex')

  // Length check first: timingSafeEqual throws on a length mismatch.
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

export async function issueToken(user: SessionUser, remember = true): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(remember ? REMEMBERED_TOKEN_TTL : SESSION_TOKEN_TTL)
    .sign(secretKey())
}

/** Reads the bearer token, or null when the request is anonymous. */
export async function readSession(request: Request): Promise<SessionUser | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null

  try {
    const { payload } = await jwtVerify(header.slice(7), secretKey())
    if (!payload.sub) return null

    return {
      id: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: payload.role === 'admin' ? 'admin' : 'user',
    }
  } catch {
    // Expired or tampered tokens are simply anonymous.
    return null
  }
}

/**
 * The role in the token is a snapshot from login time, so anything that
 * depends on it re-reads the user. That way a blocked or demoted account
 * loses access immediately rather than when its token expires.
 */
export async function requireUser(request: Request): Promise<SessionUser> {
  const session = await readSession(request)
  if (!session) throw new HttpError(401, 'Sign in to continue.')

  const db = await getDb()
  const user = await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(session.id) })

  if (!user) throw new HttpError(401, 'This account no longer exists.')
  if (user.status === 'blocked') throw new HttpError(403, 'This account has been blocked.')

  return resolveSessionUser(user)
}

/**
 * The session with its roles folded in. Roles are read on every request, like
 * the account itself, so editing a role changes what its members can do on
 * their next request.
 */
export async function resolveSessionUser(user: UserDoc): Promise<SessionUser> {
  const session = toSessionUser(user)
  const roleIds = (user.roleIds ?? []).filter((id) => ObjectId.isValid(id))
  if (roleIds.length === 0) return session

  const db = await getDb()
  const roles = await db
    .collection<{ _id: ObjectId; permissions: Permission[] }>('roles')
    .find({ _id: { $in: roleIds.map((id) => new ObjectId(id)) } }, { projection: { permissions: 1 } })
    .toArray()

  session.permissions = [...new Set([...(session.permissions ?? []), ...roles.flatMap((role) => role.permissions)])]
  return session
}

/**
 * The shape the browser sees: everything except the password hash. Its
 * permissions are the individual grants only; `resolveSessionUser` adds roles.
 */
export function toSessionUser(user: UserDoc): SessionUser {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name,
    role: user.role,
    ownership: user.ownership,
    phone: user.phone,
    country: user.country,
    city: user.city,
    trim: user.trim,
    colour: user.colour,
    permissions: user.permissions ?? [],
    roleIds: user.roleIds ?? [],
  }
}

export async function requireAdmin(request: Request): Promise<SessionUser> {
  const user = await requireUser(request)
  if (user.role !== 'admin') throw new HttpError(403, 'Admins only.')
  return user
}
