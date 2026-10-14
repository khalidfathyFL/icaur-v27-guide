import { MongoServerError, ObjectId, type Db, type Document } from 'mongodb'
import { requireUser } from './auth.js'
import { hasPermission, requirePermission } from './permissions.js'
import { HttpError, json, readJsonBody, searchParams } from './http.js'
import { getDb } from './mongo.js'
import { recordAudit, type AuditAction } from './audit.js'
import { sendToUser } from './email/outbox.js'
import { reviewDecisionEmail } from './email/templates.js'
import { optionalString, requireReviewStatus, requireString, type Localized } from './models.js'
import { toPlainText } from './sanitize.js'

/**
 * Star ratings with a short write-up, from owners only, on something the site
 * lists: an accessory, a protection center. Every kind follows the comment
 * rules — the same queue permission, the same exemption from review — so a
 * moderator trusted with comments needs no second grant to look after these.
 *
 * Each kind stores the thing it reviews under its own field names (`partId`,
 * `centerId`, …), which keeps the queue and the API readable without a join.
 */

const PAGE_SIZE = 50

export type ReviewKind = {
  /** Collection holding the reviews. */
  collection: string
  /** Collection holding the thing reviewed; needs `name`, `slug`, `active`. */
  targetCollection: string
  /** Field names on the review: the target's id, name and slug. */
  fields: { id: string; name: string; slug: string }
  /** Kind used in audit targets, e.g. `part`. */
  auditKind: string
  actions: { created: AuditAction; approved: AuditAction; rejected: AuditAction; deleted: AuditAction }
  /** "Accessory", "Protection center": used in messages. */
  noun: string
}

type Target = { _id: ObjectId; name: Localized; slug: string; active: boolean }

type ReviewDoc = Document & {
  _id: ObjectId
  rating: number
  body: string
  authorId: string
  authorName: string
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string
  createdAt: string
}

const targetName = (target: Target) => target.name.en || target.name.ar

export function createReviewHandler(kind: ReviewKind) {
  const { id: idField, name: nameField, slug: slugField } = kind.fields

  function toPublic(review: ReviewDoc) {
    return {
      id: review._id.toHexString(),
      [idField]: review[idField] as string,
      [nameField]: review[nameField] as string,
      [slugField]: review[slugField] as string,
      rating: review.rating,
      body: review.body,
      authorName: review.authorName,
      status: review.status,
      reviewNote: review.reviewNote,
      createdAt: review.createdAt,
    }
  }

  /** Keeps the target's average in step with its approved reviews. */
  async function refreshRating(db: Db, targetId: string): Promise<void> {
    if (!ObjectId.isValid(targetId)) return

    const [summary] = await db
      .collection(kind.collection)
      .aggregate<{ avg: number; count: number }>([
        { $match: { [idField]: targetId, status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      .toArray()

    await db.collection(kind.targetCollection).updateOne(
      { _id: new ObjectId(targetId) },
      {
        $set: {
          ratingAvg: summary ? Math.round(summary.avg * 10) / 10 : 0,
          ratingCount: summary?.count ?? 0,
        },
      },
    )
  }

  /**
   * Readers see approved reviews of one thing. `mine=1` returns the caller's
   * own review of it whatever its status, so the page can say it is waiting.
   * The queue across everything needs the permission.
   */
  async function listReviews(request: Request): Promise<Response> {
    const params = searchParams(request)
    let filter: Record<string, unknown>

    if (params.get('queue') === '1') {
      await requirePermission(request, 'comments.review')
      const status = params.get('status') ?? 'pending'
      filter = status === 'all' ? {} : { status }
    } else {
      const targetId = params.get(idField)
      if (!targetId) throw new HttpError(400, `Which ${kind.noun.toLowerCase()}?`)

      if (params.get('mine') === '1') {
        const user = await requireUser(request)
        filter = { [idField]: targetId, authorId: user.id }
      } else {
        filter = { [idField]: targetId, status: 'approved' }
      }
    }

    const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
    const db = await getDb()
    const reviews = await db
      .collection<ReviewDoc>(kind.collection)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()

    return json(request, { reviews: reviews.map(toPublic), page })
  }

  async function createReview(request: Request): Promise<Response> {
    const user = await requireUser(request)

    // `requireUser` re-read the account, so this is what their profile says now.
    if (user.ownership !== 'owner') {
      throw new HttpError(403, 'Only V27 owners can write reviews. If you own one, say so on your profile first.')
    }

    const body = await readJsonBody<Record<string, unknown>>(request)
    const notFound = new HttpError(404, `${kind.noun} not found.`)
    const targetId = requireString(body[idField], kind.noun, { max: 40 })
    if (!ObjectId.isValid(targetId)) throw notFound

    const db = await getDb()
    const target = await db.collection<Target>(kind.targetCollection).findOne({ _id: new ObjectId(targetId) })
    if (!target || !target.active) throw notFound

    const rating = typeof body.rating === 'number' ? body.rating : Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpError(400, 'Give a rating from 1 to 5 stars.')
    }

    // The stars are the review; the words are optional.
    const written = optionalString(body.body, 'Review', { max: 2000 })
    const text = written ? toPlainText(written) : ''

    const doc = {
      [idField]: targetId,
      [nameField]: targetName(target),
      [slugField]: target.slug,
      rating,
      body: text,
      authorId: user.id,
      authorName: user.name,
      status: hasPermission(user, 'comments.publishDirectly') ? ('approved' as const) : ('pending' as const),
      createdAt: new Date().toISOString(),
    }

    let insertedId: ObjectId
    try {
      insertedId = (await db.collection(kind.collection).insertOne(doc)).insertedId
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new HttpError(409, 'You have already reviewed this. Remove that review to write a new one.')
      }
      throw error
    }

    if (doc.status === 'approved') await refreshRating(db, targetId)

    await recordAudit(user, kind.actions.created, {
      target: { kind: kind.auditKind, id: targetId, label: targetName(target) },
    })

    return json(request, { review: toPublic({ ...doc, _id: insertedId } as ReviewDoc) }, 201)
  }

  async function decideReview(request: Request, id: string): Promise<Response> {
    if (!ObjectId.isValid(id)) throw new HttpError(404, 'Review not found.')

    const reviewer = await requirePermission(request, 'comments.review')
    const body = await readJsonBody<Record<string, unknown>>(request)
    const status = requireReviewStatus(body.status)
    const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

    const db = await getDb()
    const review = await db.collection<ReviewDoc>(kind.collection).findOneAndUpdate(
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
    await refreshRating(db, review[idField] as string)

    await recordAudit(reviewer, status === 'approved' ? kind.actions.approved : kind.actions.rejected, {
      target: { kind: `${kind.auditKind}_review`, id, label: review[nameField] as string },
      note,
    })

    if (review.status !== status) {
      await sendToUser(
        review.authorId,
        reviewDecisionEmail({
          status,
          kind: kind.auditKind,
          targetName: review[nameField] as string,
          targetSlug: review[slugField] as string,
          note,
        }),
      )
    }

    return json(request, { ok: true, status })
  }

  /** An author may withdraw their own review; a moderator may remove any. */
  async function deleteReview(request: Request, id: string): Promise<Response> {
    if (!ObjectId.isValid(id)) throw new HttpError(404, 'Review not found.')

    const user = await requireUser(request)
    const db = await getDb()
    const collection = db.collection<ReviewDoc>(kind.collection)
    const review = await collection.findOne({ _id: new ObjectId(id) })

    if (!review) throw new HttpError(404, 'Review not found.')

    if (!hasPermission(user, 'comments.review') && review.authorId !== user.id) {
      throw new HttpError(403, 'This is not your review.')
    }

    await collection.deleteOne({ _id: review._id })
    if (review.status === 'approved') await refreshRating(db, review[idField] as string)

    await recordAudit(user, kind.actions.deleted, {
      target: { kind: `${kind.auditKind}_review`, id, label: review[nameField] as string },
    })

    return json(request, { ok: true })
  }

  return async function handleReviews(request: Request, segments: string[]): Promise<Response> {
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
}
