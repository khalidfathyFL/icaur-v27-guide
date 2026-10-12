import { ObjectId } from 'mongodb'
import { requireUser } from '../_lib/auth.js'
import { hasPermission, requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { recordAudit } from '../_lib/audit.js'
import { firstWritten, requireReviewStatus, requireString, type CommentDoc, type PostDoc } from '../_lib/models.js'
import { toPlainText } from '../_lib/sanitize.js'

const PAGE_SIZE = 50

function toPublic(comment: CommentDoc) {
  return {
    id: comment._id.toHexString(),
    postId: comment.postId,
    postTitle: comment.postTitle,
    body: comment.body,
    authorName: comment.authorName,
    status: comment.status,
    reviewNote: comment.reviewNote,
    createdAt: comment.createdAt,
  }
}

export async function handleComments(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return listComments(request)
    if (request.method === 'POST') return createComment(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'review' && request.method === 'POST') return reviewComment(request, id)
  if (request.method === 'DELETE') return deleteComment(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/**
 * Readers see approved comments on one post. The moderation queue, which spans
 * every post, needs the permission.
 */
async function listComments(request: Request): Promise<Response> {
  const params = searchParams(request)
  const db = await getDb()

  let filter: Record<string, unknown>

  if (params.get('queue') === '1') {
    await requirePermission(request, 'comments.review')
    const status = params.get('status') ?? 'pending'
    filter = status === 'all' ? {} : { status }
  } else {
    const postId = params.get('postId')
    if (!postId) throw new HttpError(400, 'Which post?')
    filter = { postId, status: 'approved' }
  }

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const comments = await db
    .collection<CommentDoc>('comments')
    .find(filter)
    .sort({ createdAt: params.get('queue') === '1' ? -1 : 1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray()

  return json(request, { comments: comments.map(toPublic), page })
}

async function createComment(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const postId = requireString(body.postId, 'Post', { max: 40 })
  if (!ObjectId.isValid(postId)) throw new HttpError(404, 'Post not found.')

  const db = await getDb()
  const post = await db.collection<PostDoc>('posts').findOne({ _id: new ObjectId(postId) })

  // Commenting on a post nobody can read would be a way to probe for drafts.
  if (!post || post.status !== 'approved') throw new HttpError(404, 'Post not found.')

  // Comments are plain text: there is no formatting to offer, so there is no
  // reason to accept markup and then have to clean it.
  const text = toPlainText(requireString(body.body, 'Comment', { min: 2, max: 2000 }))
  if (!text) throw new HttpError(400, 'Write something first.')

  const doc = {
    postId,
    postTitle: firstWritten(post.title),
    body: text,
    authorId: user.id,
    authorName: user.name,
    status: hasPermission(user, 'comments.publishDirectly')
      ? ('approved' as const)
      : ('pending' as const),
    createdAt: new Date().toISOString(),
  }

  const result = await db.collection<CommentDoc>('comments').insertOne(doc as CommentDoc)

  await recordAudit(user, 'comment.created', {
    target: { kind: 'post', id: postId, label: firstWritten(post.title) },
  })

  return json(request, { comment: toPublic({ ...doc, _id: result.insertedId } as CommentDoc) }, 201)
}

async function reviewComment(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Comment not found.')

  const reviewer = await requirePermission(request, 'comments.review')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const status = requireReviewStatus(body.status)
  const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

  const db = await getDb()
  const result = await db.collection<CommentDoc>('comments').updateOne(
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

  if (result.matchedCount === 0) throw new HttpError(404, 'Comment not found.')

  await recordAudit(reviewer, status === 'approved' ? 'comment.approved' : 'comment.rejected', {
    target: { kind: 'comment', id },
    note,
  })

  return json(request, { ok: true, status })
}

/** An author may withdraw their own comment; a moderator may remove any. */
async function deleteComment(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Comment not found.')

  const user = await requireUser(request)
  const db = await getDb()
  const collection = db.collection<CommentDoc>('comments')
  const comment = await collection.findOne({ _id: new ObjectId(id) })

  if (!comment) throw new HttpError(404, 'Comment not found.')

  const mayModerate = hasPermission(user, 'comments.review')
  if (!mayModerate && comment.authorId !== user.id) {
    throw new HttpError(403, 'This is not your comment.')
  }

  await collection.deleteOne({ _id: comment._id })

  await recordAudit(user, 'comment.deleted', { target: { kind: 'comment', id } })

  return json(request, { ok: true })
}
