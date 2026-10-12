import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody } from '../_lib/http.js'

/**
 * Issues short-lived tokens for the browser to upload accessory photos straight
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

export async function handleUploads(request: Request, segments: string[]): Promise<Response> {
  if (segments.length > 0 || request.method !== 'POST') throw new HttpError(405, 'Method not allowed.')

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new HttpError(503, 'Photo uploads are not set up on the server yet.')
  }

  const body = await readJsonBody<HandleUploadBody>(request)

  // Only token requests are expected. Completion callbacks are not requested,
  // since the form saves the photo's address with the part itself.
  if (body?.type !== 'blob.generate-client-token') throw new HttpError(400, 'Unexpected upload request.')

  const editor = await requirePermission(request, 'parts.manage')

  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      if (!/^parts\/[A-Za-z0-9._-]{1,120}$/.test(pathname)) {
        throw new HttpError(400, 'Photos are stored under parts/ with a plain file name.')
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
