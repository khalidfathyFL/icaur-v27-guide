import { Binary } from 'mongodb'
import { recordAudit } from '../_lib/audit.js'
import { HttpError, corsHeaders, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { requirePermission } from '../_lib/permissions.js'

/**
 * The owner manual behind the admin "Manual assistant": its search index and
 * page images. The manual is copyrighted and not cleared for owners, so it is
 * kept out of git and out of public storage. It lives in the database and
 * every read checks `assistant.use`.
 *
 *   GET  manual/status     what has been uploaded
 *   GET  manual/index      sections and search vectors
 *   GET  manual/page?n=40  one page image (PDF page number)
 *   PUT  manual/index      replace the index (account managers only)
 *   PUT  manual/page?n=40  store one page image (account managers only)
 *
 * The files come from scripts/manual/ and are uploaded from the admin screen.
 */

type ManualIndexDoc = {
  _id: 'index'
  model: string
  dimensions: number
  sections: unknown[]
  sectionCount: number
  vectors: Binary
  uploadedAt: string
  uploadedBy: string
}

type ManualPageDoc = { _id: number; image: Binary; uploadedAt: string }

/** Comfortably above the 349 pages of the V27 manual. */
const MAX_PAGE = 800
/** Vercel caps a request body at 4.5 MB; base64 adds a third. */
const MAX_IMAGE_BYTES = 2_500_000
const MAX_VECTOR_BYTES = 3_000_000

export async function handleManual(request: Request, segments: string[]): Promise<Response> {
  // The router has already taken off the leading "manual".
  const [action] = segments
  if (request.method === 'GET' && action === 'status') return status(request)
  if (request.method === 'GET' && action === 'index') return readIndex(request)
  if (request.method === 'GET' && action === 'page') return readPage(request)
  if (request.method === 'PUT' && action === 'index') return writeIndex(request)
  if (request.method === 'PUT' && action === 'page') return writePage(request)

  throw new HttpError(404, 'Not found.')
}

function pageNumber(request: Request): number {
  const page = Number(searchParams(request).get('n'))
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) throw new HttpError(400, 'Give a page number.')
  return page
}

async function status(request: Request): Promise<Response> {
  await requirePermission(request, 'assistant.use')
  const db = await getDb()
  const [index, pages] = await Promise.all([
    db.collection<ManualIndexDoc>('manual').findOne({ _id: 'index' }, { projection: { vectors: 0, sections: 0 } }),
    db.collection<ManualPageDoc>('manualPages').countDocuments(),
  ])

  return json(request, {
    uploaded: Boolean(index),
    sections: index?.sectionCount ?? 0,
    pages,
    uploadedAt: index?.uploadedAt,
    uploadedBy: index?.uploadedBy,
  })
}

async function readIndex(request: Request): Promise<Response> {
  await requirePermission(request, 'assistant.use')
  const db = await getDb()
  const index = await db.collection<ManualIndexDoc>('manual').findOne({ _id: 'index' })
  if (!index) throw new HttpError(404, 'The manual has not been uploaded yet.')

  return json(request, {
    model: index.model,
    dimensions: index.dimensions,
    sections: index.sections,
    vectors: Buffer.from(index.vectors.buffer).toString('base64'),
  })
}

async function readPage(request: Request): Promise<Response> {
  await requirePermission(request, 'assistant.use')
  const page = pageNumber(request)
  const db = await getDb()
  const doc = await db.collection<ManualPageDoc>('manualPages').findOne({ _id: page })
  if (!doc) throw new HttpError(404, 'That page has not been uploaded.')

  return new Response(Buffer.from(doc.image.buffer), {
    headers: {
      'Content-Type': 'image/jpeg',
      // Private: a shared cache must not hand the page to someone without the permission.
      'Cache-Control': 'private, max-age=86400',
      ...corsHeaders(request),
    },
  })
}

function decodeBase64(value: unknown, field: string, max: number): Buffer {
  if (typeof value !== 'string' || !value) throw new HttpError(400, `${field} is missing.`)
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length === 0 || bytes.length > max) throw new HttpError(400, `${field} is too large.`)
  return bytes
}

async function writeIndex(request: Request): Promise<Response> {
  const admin = await requirePermission(request, 'users.manage')
  const body = await readJsonBody<Record<string, unknown>>(request)

  const model = typeof body.model === 'string' ? body.model.slice(0, 200) : ''
  const dimensions = Number(body.dimensions)
  const sections = Array.isArray(body.sections) ? body.sections : null
  if (!model || !Number.isInteger(dimensions) || dimensions < 1 || dimensions > 4096 || !sections?.length) {
    throw new HttpError(400, 'That is not a manual index from scripts/manual/build-index.mjs.')
  }
  const vectors = decodeBase64(body.vectors, 'Vectors', MAX_VECTOR_BYTES)
  if (vectors.length !== sections.length * dimensions * 4) {
    throw new HttpError(400, 'The vectors do not match the sections. Upload sections.json and vectors.bin from the same build.')
  }

  const db = await getDb()
  await db.collection<ManualIndexDoc>('manual').replaceOne(
    { _id: 'index' },
    { model, dimensions, sections, sectionCount: sections.length, vectors: new Binary(vectors), uploadedAt: new Date().toISOString(), uploadedBy: admin.name },
    { upsert: true },
  )
  await recordAudit(admin, 'manual.uploaded', { target: { kind: 'manual', id: 'index' }, changes: { sections: sections.length } })

  return json(request, { ok: true, sections: sections.length })
}

async function writePage(request: Request): Promise<Response> {
  await requirePermission(request, 'users.manage')
  const page = pageNumber(request)
  const body = await readJsonBody<Record<string, unknown>>(request)
  const image = decodeBase64(body.image, 'Image', MAX_IMAGE_BYTES)
  // JPEG files start FF D8 FF; anything else is not one of the rendered pages.
  if (image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) throw new HttpError(400, 'Pages must be JPEG images.')

  const db = await getDb()
  await db
    .collection<ManualPageDoc>('manualPages')
    .replaceOne({ _id: page }, { image: new Binary(image), uploadedAt: new Date().toISOString() }, { upsert: true })

  return json(request, { ok: true })
}
