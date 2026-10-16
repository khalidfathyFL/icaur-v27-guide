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
  'dealers.add',
  'pricing.manage',
  'parts.manage',
  'parts.add',
  'centers.manage',
  'centers.add',
  'insurance.manage',
  'insurance.add',
  'installers.manage',
  'installers.add',
  'charging.manage',
  'charging.add',
  'orders.manage',
  'users.manage',
  'emails.send',
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
    description: 'Add, edit and remove any of the dealers listed as selling at the official price.',
    group: 'Market data',
  },
  {
    key: 'dealers.add',
    label: 'Add dealers',
    description:
      'Add new dealers and edit the ones they added. They cannot change or remove a dealer somebody else added.',
    group: 'Market data',
  },
  {
    key: 'pricing.manage',
    label: 'Manage prices',
    description: 'Change the prices shown on the Egypt page, overriding the launch figures.',
    group: 'Market data',
  },
  {
    key: 'parts.manage',
    label: 'Manage accessories',
    description: 'Add, edit and remove any accessory or protection part, with its prices, suppliers and photos.',
    group: 'Market data',
  },
  {
    key: 'parts.add',
    label: 'Add accessories',
    description:
      'Add new accessories and edit the ones they added. They cannot change or remove an accessory somebody else added.',
    group: 'Market data',
  },
  {
    key: 'centers.manage',
    label: 'Manage protection centers',
    description: 'Add, edit and remove any protection center and its packages, prices and photos.',
    group: 'Market data',
  },
  {
    key: 'centers.add',
    label: 'Add protection centers',
    description:
      'Add new protection centers and edit the ones they added. They cannot change or remove a center somebody else added.',
    group: 'Market data',
  },
  {
    key: 'insurance.manage',
    label: 'Manage insurance',
    description: 'Add, edit and remove any insurance company and its plans, rates, coverage and cashback.',
    group: 'Market data',
  },
  {
    key: 'insurance.add',
    label: 'Add insurance companies',
    description:
      'Add new insurance companies and edit the ones they added. They cannot change or remove a company somebody else added.',
    group: 'Market data',
  },
  {
    key: 'installers.manage',
    label: 'Manage charger installers',
    description: 'Add, edit and remove any of the companies that install home chargers, with their packages, prices and photos.',
    group: 'Market data',
  },
  {
    key: 'installers.add',
    label: 'Add charger installers',
    description:
      'Add new charger installers and edit the ones they added. They cannot change or remove an installer somebody else added.',
    group: 'Market data',
  },
  {
    key: 'charging.manage',
    label: 'Manage charging stations',
    description: 'Add, correct and remove any public charging station on the map, and run the Open Charge Map import.',
    group: 'Market data',
  },
  {
    key: 'charging.add',
    label: 'Add charging stations',
    description:
      'Add new charging stations and correct the ones they added. They cannot change or remove a station somebody else added or one that was imported.',
    group: 'Market data',
  },
  {
    key: 'orders.manage',
    label: 'Handle order requests',
    description:
      "See accessory requests with the customer's phone and address, and move them through ordering, payment and delivery.",
    group: 'Orders',
  },
  {
    key: 'users.manage',
    label: 'Manage accounts',
    description: 'Grant permissions, block accounts, and make other people admins.',
    group: 'Administration',
  },
  {
    key: 'emails.send',
    label: 'Send emails',
    description:
      'Preview the emails the site sends, send test emails, and write announcements to every user or to one person.',
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
