import { MongoServerError, ObjectId, type Db } from 'mongodb'
import { requireUser } from '../_lib/auth.js'
import { hasPermission, requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { recordAudit } from '../_lib/audit.js'
import { requireReviewStatus, requireString, type PartDoc, type PartReviewDoc } from '../_lib/models.js'
import { toPlainText } from '../_lib/sanitize.js'

/**
 * Owner reviews of accessories. They follow the comment rules exactly — the
 * same queue permission, the same exemption from review — so a moderator
 * trusted with comments needs no second grant to look after these.
 */

const PAGE_SIZE = 50

function toPublic(review: PartReviewDoc) {
  return {
    id: review._id.toHexString(),
    partId: review.partId,
    partName: review.partName,
    partSlug: review.partSlug,
    rating: review.rating,
    body: review.body,
    authorName: review.authorName,
    status: review.status,
    reviewNote: review.reviewNote,
    createdAt: review.createdAt,
  }
}

export async function handlePartReviews(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return listReviews(request)
    if (request.method === 'POST') return createReview(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'review' && request.method === 'POST') return decideReview(request, id)
  if (request.method === 'DELETE') return deleteReview(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/**
 * Readers see approved reviews of one part. `mine=1` returns the caller's own
 * review of it whatever its status, so the page can say it is waiting. The
 * queue across every part needs the permission.
 */
async function listReviews(request: Request): Promise<Response> {
  const params = searchParams(request)
  const queue = params.get('queue') === '1'
  let filter: Record<string, unknown>

  if (queue) {
    await requirePermission(request, 'comments.review')
    const status = params.get('status') ?? 'pending'
    filter = status === 'all' ? {} : { status }
  } else {
    const partId = params.get('partId')
    if (!partId) throw new HttpError(400, 'Which accessory?')

    if (params.get('mine') === '1') {
      const user = await requireUser(request)
      filter = { partId, authorId: user.id }
    } else {
      filter = { partId, status: 'approved' }
    }
  }

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const db = await getDb()
  const reviews = await db
    .collection<PartReviewDoc>('partReviews')
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray()

  return json(request, { reviews: reviews.map(toPublic), page })
}

/** Keeps the part's average in step with its approved reviews. */
async function refreshRating(db: Db, partId: string): Promise<void> {
  if (!ObjectId.isValid(partId)) return

  const [summary] = await db
    .collection<PartReviewDoc>('partReviews')
    .aggregate<{ avg: number; count: number }>([
      { $match: { partId, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    .toArray()

  await db.collection<PartDoc>('parts').updateOne(
    { _id: new ObjectId(partId) },
    {
      $set: {
        ratingAvg: summary ? Math.round(summary.avg * 10) / 10 : 0,
        ratingCount: summary?.count ?? 0,
      },
    },
  )
}

function requireRating(value: unknown): number {
  const rating = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Give a rating from 1 to 5 stars.')
  }
  return rating
}

async function createReview(request: Request): Promise<Response> {
  const user = await requireUser(request)

  // `requireUser` re-read the account, so this is what their profile says now.
  if (user.ownership !== 'owner') {
    throw new HttpError(
      403,
      'Only V27 owners can review accessories. If you own one, say so on your profile first.',
    )
  }

  const body = await readJsonBody<Record<string, unknown>>(request)
  const partId = requireString(body.partId, 'Accessory', { max: 40 })
  if (!ObjectId.isValid(partId)) throw new HttpError(404, 'Accessory not found.')

  const db = await getDb()
  const part = await db.collection<PartDoc>('parts').findOne({ _id: new ObjectId(partId) })
  if (!part || !part.active) throw new HttpError(404, 'Accessory not found.')

  const rating = requireRating(body.rating)
  const text = toPlainText(requireString(body.body, 'Review', { min: 2, max: 2000 }))
  if (!text) throw new HttpError(400, 'Write something first.')

  const doc = {
    partId,
    partName: part.name.en || part.name.ar,
    partSlug: part.slug,
    rating,
    body: text,
    authorId: user.id,
    authorName: user.name,
    status: hasPermission(user, 'comments.publishDirectly') ? ('approved' as const) : ('pending' as const),
    createdAt: new Date().toISOString(),
  }

  let insertedId: ObjectId
  try {
    insertedId = (await db.collection<PartReviewDoc>('partReviews').insertOne(doc as PartReviewDoc)).insertedId
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new HttpError(409, 'You have already reviewed this accessory. Remove that review to write a new one.')
    }
    throw error
  }

  if (doc.status === 'approved') await refreshRating(db, partId)

  await recordAudit(user, 'part_review.created', {
    target: { kind: 'part', id: partId, label: part.name.en || part.name.ar },
  })

  return json(request, { review: toPublic({ ...doc, _id: insertedId } as PartReviewDoc) }, 201)
}

async function decideReview(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Review not found.')

  const reviewer = await requirePermission(request, 'comments.review')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const status = requireReviewStatus(body.status)
  const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

  const db = await getDb()
  const review = await db.collection<PartReviewDoc>('partReviews').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        reviewedBy: reviewer.name,
        reviewedAt: new Date().toISOString(),
        ...(note ? { reviewNote: note } : {}),
      },
    },
  )

  if (!review) throw new HttpError(404, 'Review not found.')

  // Rejecting a review that was live takes its stars out of the average too.
  await refreshRating(db, review.partId)

  await recordAudit(reviewer, status === 'approved' ? 'part_review.approved' : 'part_review.rejected', {
    target: { kind: 'part_review', id, label: review.partName },
    note,
  })

  return json(request, { ok: true, status })
}

/** An author may withdraw their own review; a moderator may remove any. */
async function deleteReview(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Review not found.')

  const user = await requireUser(request)
  const db = await getDb()
  const collection = db.collection<PartReviewDoc>('partReviews')
  const review = await collection.findOne({ _id: new ObjectId(id) })

  if (!review) throw new HttpError(404, 'Review not found.')

  if (!hasPermission(user, 'comments.review') && review.authorId !== user.id) {
    throw new HttpError(403, 'This is not your review.')
  }

  await collection.deleteOne({ _id: review._id })
  if (review.status === 'approved') await refreshRating(db, review.partId)

  await recordAudit(user, 'part_review.deleted', {
    target: { kind: 'part_review', id, label: review.partName },
  })

  return json(request, { ok: true })
}
