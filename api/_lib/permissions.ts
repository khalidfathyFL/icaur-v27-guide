import { requireUser, type SessionUser } from './auth.js'
import { HttpError } from './http.js'

/**
 * Per-account permissions, following the model the MicroBIM site uses.
 *
 * Before this existed the rules were implied by scattered `requireAdmin`
 * calls, so answering "who can approve a post?" meant reading eight route
 * files. A route now asks for a permission, and this file is the only place
 * that says who holds it.
 *
 * The keys exist for compile-time safety; the labels, blurbs and grouping the
 * admin matrix renders are served from here too, so the screen describing the
 * rules and the gate enforcing them cannot drift apart.
 */

export const PERMISSION_KEYS = [
  'posts.review',
  'posts.edit',
  'posts.publishDirectly',
  'suggestions.review',
  'comments.review',
  'comments.publishDirectly',
  'dealers.manage',
  'pricing.manage',
  'users.manage',
  'audit.read',
  'stats.read',
] as const

export type Permission = (typeof PERMISSION_KEYS)[number]

export type PermissionDefinition = {
  key: Permission
  label: string
  description: string
  group: string
}

/** Display order is the order of this list. */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'posts.review',
    label: 'Approve posts',
    description: 'Decide which contributor posts appear on the site, and reject the ones that do not.',
    group: 'Moderation',
  },
  {
    key: 'posts.edit',
    label: 'Edit any post',
    description:
      "Change the title and text of anyone's post, published ones included. Their edits keep the post's status instead of sending it back to review.",
    group: 'Moderation',
  },
  {
    key: 'suggestions.review',
    label: 'Approve corrections',
    description: 'Decide which suggested corrections to the guides are accepted.',
    group: 'Moderation',
  },
  {
    key: 'comments.review',
    label: 'Approve comments',
    description: 'Decide which comments appear under a post.',
    group: 'Moderation',
  },
  {
    key: 'comments.publishDirectly',
    label: 'Comment without review',
    description:
      'Their own comments appear immediately instead of waiting in the queue. Not permission to approve anybody else.',
    group: 'Moderation',
  },
  {
    key: 'posts.publishDirectly',
    label: 'Publish without review',
    description:
      'Their own posts go live immediately instead of waiting in the queue. An exemption from waiting, not permission to approve anybody else.',
    group: 'Moderation',
  },
  {
    key: 'dealers.manage',
    label: 'Manage dealers',
    description: 'Add, edit and remove the dealers listed as selling at the official price.',
    group: 'Market data',
  },
  {
    key: 'pricing.manage',
    label: 'Manage prices',
    description: 'Change the prices shown on the Egypt page, overriding the launch figures.',
    group: 'Market data',
  },
  {
    key: 'users.manage',
    label: 'Manage accounts',
    description: 'Grant permissions, block accounts, and make other people admins.',
    group: 'Administration',
  },
  {
    key: 'audit.read',
    label: 'Read the activity log',
    description: 'See the record of every change and who made it.',
    group: 'Administration',
  },
  {
    key: 'stats.read',
    label: 'See owner statistics',
    description: 'View the counts of who owns what and where, without seeing individual details.',
    group: 'Administration',
  },
]

export const isPermission = (value: unknown): value is Permission =>
  typeof value === 'string' && (PERMISSION_KEYS as readonly string[]).includes(value)

/**
 * An admin holds every permission by definition, which is what lets the first
 * account grant anything to anyone. Everyone else holds exactly what they have
 * been given.
 */
export function hasPermission(user: SessionUser, permission: Permission): boolean {
  if (user.role === 'admin') return true
  return user.permissions?.includes(permission) ?? false
}

/**
 * The gate every protected route goes through.
 *
 * It re-reads the account rather than trusting the token, so revoking a
 * permission or blocking somebody takes effect on their next request instead
 * of when their token happens to expire.
 */
export async function requirePermission(
  request: Request,
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireUser(request)

  if (!hasPermission(user, permission)) {
    throw new HttpError(403, 'Your account does not have permission to do that.')
  }

  return user
}

/** Normalises whatever an admin submitted into a clean, de-duplicated list. */
export function parsePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) throw new HttpError(400, 'Permissions must be a list.')
  return [...new Set(value.filter(isPermission))]
}
