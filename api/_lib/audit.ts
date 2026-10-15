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
  | 'post.pinned'
  | 'post.unpinned'
  | 'post.deleted'
  | 'comment.created'
  | 'comment.approved'
  | 'comment.rejected'
  | 'comment.deleted'
  | 'question.created'
  | 'question.approved'
  | 'question.rejected'
  | 'question.deleted'
  | 'question.answer_accepted'
  | 'answer.created'
  | 'answer.approved'
  | 'answer.rejected'
  | 'answer.deleted'
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
  | 'center.merchant_added'
  | 'center.merchant_removed'
  | 'center_review.created'
  | 'center_review.approved'
  | 'center_review.rejected'
  | 'center_review.deleted'
  | 'insurer.created'
  | 'insurer.updated'
  | 'insurer.removed'
  | 'insurer.merchant_added'
  | 'insurer.merchant_removed'
  | 'insurer_review.created'
  | 'insurer_review.approved'
  | 'insurer_review.rejected'
  | 'insurer_review.deleted'
  | 'installer.created'
  | 'installer.updated'
  | 'installer.removed'
  | 'installer.merchant_added'
  | 'installer.merchant_removed'
  | 'installer_review.created'
  | 'installer_review.approved'
  | 'installer_review.rejected'
  | 'installer_review.deleted'
  | 'station.created'
  | 'station.updated'
  | 'station.removed'
  | 'station.synced'
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
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
  | 'email.announced'
  | 'email.sent_to_one'
  | 'email.test_sent'

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

type Named = { id: string; name: { en: string; ar: string } }

/**
 * What an edit to a listing actually changed: the fields whose value moved,
 * and the plans or packages added, removed or edited, by name. The log keeps
 * this rather than whole documents, which would fill the cluster.
 */
export function listingChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  itemsKey: 'plans' | 'packages',
): Record<string, unknown> {
  const fields = Object.keys(after).filter(
    (key) => key !== 'updatedAt' && key !== itemsKey && JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null),
  )

  const oldItems = (before[itemsKey] as Named[] | undefined) ?? []
  const newItems = (after[itemsKey] as Named[] | undefined) ?? []
  const label = (item: Named) => item.name.en || item.name.ar
  const oldById = new Map(oldItems.map((item) => [item.id, item]))
  const newIds = new Set(newItems.map((item) => item.id))

  const added = newItems.filter((item) => !oldById.has(item.id)).map(label)
  const removed = oldItems.filter((item) => !newIds.has(item.id)).map(label)
  const edited = newItems
    .filter((item) => oldById.has(item.id) && JSON.stringify(oldById.get(item.id)) !== JSON.stringify(item))
    .map(label)

  return Object.fromEntries(
    Object.entries({ fields, [`${itemsKey}Added`]: added, [`${itemsKey}Removed`]: removed, [`${itemsKey}Edited`]: edited }).filter(
      ([, value]) => (value as unknown[]).length > 0,
    ),
  )
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
