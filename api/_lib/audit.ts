import type { ObjectId } from 'mongodb'
import { getDb } from './mongo.js'
import type { SessionUser } from './auth.js'

/**
 * An append-only record of every change.
 *
 * Nothing in the API updates or deletes an entry, not even for an admin: a log
 * an admin can edit is not evidence. It is written on the server rather than
 * requested by the client, so it cannot be skipped by calling an endpoint
 * directly, and it stores changed fields rather than whole documents, because
 * snapshots of every edit would fill a 512 MB cluster quickly.
 */

export type AuditAction =
  | 'post.created'
  | 'post.updated'
  | 'post.approved'
  | 'post.rejected'
  | 'post.deleted'
  | 'comment.created'
  | 'comment.approved'
  | 'comment.rejected'
  | 'comment.deleted'
  | 'suggestion.created'
  | 'suggestion.approved'
  | 'suggestion.rejected'
  | 'dealer.created'
  | 'dealer.updated'
  | 'dealer.removed'
  | 'pricing.updated'
  | 'part.created'
  | 'part.updated'
  | 'part.removed'
  | 'part_review.created'
  | 'part_review.approved'
  | 'part_review.rejected'
  | 'part_review.deleted'
  | 'center.created'
  | 'center.updated'
  | 'center.removed'
  | 'center_review.created'
  | 'center_review.approved'
  | 'center_review.rejected'
  | 'center_review.deleted'
  | 'user.registered'
  | 'user.role_changed'
  | 'user.permissions_changed'
  | 'user.roles_changed'
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'user.status_changed'
  | 'user.password_changed'
  | 'user.profile_updated'

export type AuditEntry = {
  _id: ObjectId
  action: AuditAction
  actorId: string
  actorName: string
  actorRole: 'user' | 'admin'
  /** What it affected: collection plus id. */
  target?: { kind: string; id: string; label?: string }
  /** Changed fields only, never whole documents. */
  changes?: Record<string, unknown>
  /** A review note, where the action had one. */
  note?: string
  at: string
}

/**
 * Recording must never break the thing being recorded, so a failure here is
 * logged and swallowed rather than failing the caller's request.
 */
export async function recordAudit(
  actor: SessionUser,
  action: AuditAction,
  detail: {
    target?: AuditEntry['target']
    changes?: Record<string, unknown>
    note?: string
  } = {},
): Promise<void> {
  try {
    const db = await getDb()
    await db.collection('audit').insertOne({
      action,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      ...detail,
      at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to write audit entry:', action, error)
  }
}

/** Keeps a password or hash from ever reaching the log. */
const REDACTED = new Set(['password', 'passwordHash', 'currentPassword', 'newPassword'])

export function auditableChanges(update: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(update)
      .filter(([key]) => !REDACTED.has(key) && key !== 'updatedAt')
      .map(([key, value]) => [key, value]),
  )
}
