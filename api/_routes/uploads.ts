import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requireUser } from '../_lib/auth.js'
import { hasPermission, type Permission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody } from '../_lib/http.js'
import { isMerchantOf, type MerchantKind } from '../_lib/merchants.js'

/**
 * Issues short-lived tokens for the browser to upload listing and post photos straight
 * to Vercel Blob. The file never passes through this function, which keeps it
 * clear of the 4.5 MB request limit; this route only decides who may upload
 * and what.
 *
 * The browser shrinks photos to about 200 KB before sending them. The size cap
 * here is the backstop for when it does not, because the free Blob allowance
 * is shared with the whole project and running out blocks it for 30 days.
 */

const MAX_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Each folder belongs to one kind of content. Listing folders are open only to
 * that listing's editors; `posts` is open to any signed-in account, because
 * anyone may write a post, and the post itself is still reviewed.
 */
/** A merchant may upload photos for their own listing, so these folders also open to them. */
const MERCHANT_FOLDERS: Record<string, MerchantKind> = { centers: 'center', insurers: 'insurer', installers: 'installer' }

/** Any one of the listed permissions opens the folder; `*.add` lets a contributor add photos to a new item. */
const FOLDERS: Record<string, Permission[] | 'signedIn'> = {
  parts: ['parts.manage', 'parts.add'],
  centers: ['centers.manage', 'centers.add'],
  insurers: ['insurance.manage', 'insurance.add'],
  installers: ['installers.manage', 'installers.add'],
  posts: 'signedIn',
}

export async function handleUploads(request: Request, segments: string[]): Promise<Response> {
  if (segments.length > 0 || request.method !== 'POST') throw new HttpError(405, 'Method not allowed.')

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new HttpError(503, 'Photo uploads are not set up on the server yet.')
  }

  const body = await readJsonBody<HandleUploadBody>(request)

  // Only token requests are expected. Completion callbacks are not requested,
  // since the form saves the photo's address with the listing itself.
  if (body?.type !== 'blob.generate-client-token') throw new HttpError(400, 'Unexpected upload request.')

  const editor = await requireUser(request)

  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      const match = /^([a-z]+)\/[A-Za-z0-9._-]{1,120}$/.exec(pathname)
      const permissions = match ? FOLDERS[match[1] ?? ''] : undefined
      if (!permissions) {
        throw new HttpError(400, 'Photos are stored under parts/, centers/, insurers/, installers/ or posts/ with a plain file name.')
      }
      // requireUser above has already established the account is signed in.
      if (permissions !== 'signedIn' && !permissions.some((permission) => hasPermission(editor, permission))) {
        const merchantKind = MERCHANT_FOLDERS[match?.[1] ?? '']
        if (!merchantKind || !(await isMerchantOf(editor, merchantKind))) {
          throw new HttpError(403, 'Your account does not have permission to do that.')
        }
      }

      return {
        allowedContentTypes: IMAGE_TYPES,
        maximumSizeInBytes: MAX_BYTES,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ uploadedBy: editor.id }),
      }
    },
  })

  return json(request, result)
}
