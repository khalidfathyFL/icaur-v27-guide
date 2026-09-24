import { ObjectId } from 'mongodb'
import { requireAdmin, requireUser } from '../_lib/auth'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http'
import { getDb } from '../_lib/mongo'
import {
  requireReviewStatus,
  requireString,
  requireTarget,
  type SuggestionDoc,
} from '../_lib/models'

const PAGE_SIZE = 30

function toPublic(suggestion: SuggestionDoc) {
  return {
    id: suggestion._id.toHexString(),
    target: suggestion.target,
    current: suggestion.current,
    proposed: suggestion.proposed,
    reason: suggestion.reason,
    authorName: suggestion.authorName,
    status: suggestion.status,
    reviewNote: suggestion.reviewNote,
    createdAt: suggestion.createdAt,
  }
}

export async function handleSuggestions(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return listSuggestions(request)
    if (request.method === 'POST') return createSuggestion(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'review' && request.method === 'POST') return reviewSuggestion(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/**
 * Suggested edits are never public: a contributor sees their own, an admin
 * sees the queue. Publishing unreviewed corrections would defeat the point
 * of the site's verification rule.
 */
async function listSuggestions(request: Request): Promise<Response> {
  const params = searchParams(request)
  const user = await requireUser(request)
  const db = await getDb()

  let filter: Record<string, unknown> = { authorId: user.id }

  if (params.get('queue') === '1') {
    await requireAdmin(request)
    const status = params.get('status') ?? 'pending'
    filter = status === 'all' ? {} : { status }
  }

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const suggestions = await db
    .collection<SuggestionDoc>('suggestions')
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray()

  return json(request, { suggestions: suggestions.map(toPublic), page })
}

async function createSuggestion(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const doc = {
    target: requireTarget(body.target),
    current: requireString(body.current, 'Current text', { min: 0, max: 4000 }),
    proposed: requireString(body.proposed, 'Your correction', { min: 2, max: 4000 }),
    reason: requireString(body.reason, 'Reason', { min: 2, max: 2000 }),
    authorId: user.id,
    authorName: user.name,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  }

  const db = await getDb()
  const result = await db.collection<SuggestionDoc>('suggestions').insertOne(doc as SuggestionDoc)

  return json(
    request,
    { suggestion: toPublic({ ...doc, _id: result.insertedId } as SuggestionDoc) },
    201,
  )
}

async function reviewSuggestion(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Suggestion not found.')

  const admin = await requireAdmin(request)
  const body = await readJsonBody<Record<string, unknown>>(request)
  const status = requireReviewStatus(body.status)
  const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

  const db = await getDb()
  const result = await db.collection<SuggestionDoc>('suggestions').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        reviewedBy: admin.name,
        reviewedAt: new Date().toISOString(),
        ...(note ? { reviewNote: note } : {}),
      },
    },
  )

  if (result.matchedCount === 0) throw new HttpError(404, 'Suggestion not found.')

  return json(request, { ok: true, status })
}
