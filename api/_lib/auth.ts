import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { SignJWT, jwtVerify } from 'jose'
import { ObjectId } from 'mongodb'
import { getDb } from './mongo'
import { HttpError } from './http'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64
const TOKEN_TTL = '7d'

export type Role = 'user' | 'admin'

export type UserDoc = {
  _id: ObjectId
  email: string
  name: string
  passwordHash: string
  role: Role
  status: 'active' | 'blocked'
  createdAt: string
}

export type SessionUser = {
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

export async function issueToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
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

  return { id: user._id.toHexString(), email: user.email, name: user.name, role: user.role }
}

export async function requireAdmin(request: Request): Promise<SessionUser> {
  const user = await requireUser(request)
  if (user.role !== 'admin') throw new HttpError(403, 'Admins only.')
  return user
}
