import { ObjectId } from 'mongodb'
import { readSession, requireAdmin, requireUser } from '../_lib/auth'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http'
import { getDb } from '../_lib/mongo'
import {
  requireLocalized,
  requireReviewStatus,
  requireString,
  slugify,
  type PostDoc,
} from '../_lib/models'

const PAGE_SIZE = 20

/** Shape sent to the browser: no internal ids beyond the hex string. */
function toPublic(post: PostDoc) {
  return {
    id: post._id.toHexString(),
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    authorName: post.authorName,
    status: post.status,
    reviewNote: post.reviewNote,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }
}

export async function handlePosts(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return listPosts(request)
    if (request.method === 'POST') return createPost(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'review' && request.method === 'POST') return reviewPost(request, id)
  if (request.method === 'GET') return readPost(request, id)
  if (request.method === 'PATCH') return updatePost(request, id)
  if (request.method === 'DELETE') return deletePost(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/**
 * Anonymous and ordinary readers only ever see approved posts. Contributors
 * can ask for their own drafts with `mine=1`, and admins can filter by status
 * to work the moderation queue.
 */
async function listPosts(request: Request): Promise<Response> {
  const params = searchParams(request)
  const session = await readSession(request)
  const db = await getDb()

  let filter: Record<string, unknown> = { status: 'approved' }

  if (params.get('mine') === '1') {
    if (!session) throw new HttpError(401, 'Sign in to see your posts.')
    filter = { authorId: session.id }
  } else if (params.get('status')) {
    await requireAdmin(request)
    const status = params.get('status')
    filter = status === 'all' ? {} : { status }
  }

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const posts = await db
    .collection<PostDoc>('posts')
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray()

  return json(request, { posts: posts.map(toPublic), page })
}

async function readPost(request: Request, idOrSlug: string): Promise<Response> {
  const db = await getDb()
  const collection = db.collection<PostDoc>('posts')

  const post = ObjectId.isValid(idOrSlug)
    ? await collection.findOne({ _id: new ObjectId(idOrSlug) })
    : await collection.findOne({ slug: idOrSlug })

  if (!post) throw new HttpError(404, 'Post not found.')

  if (post.status !== 'approved') {
    const session = await readSession(request)
    const isAuthor = session?.id === post.authorId
    const isAdmin = session?.role === 'admin'
    if (!isAuthor && !isAdmin) throw new HttpError(404, 'Post not found.')
  }

  return json(request, { post: toPublic(post) })
}

async function createPost(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const title = requireLocalized(body.title, 'Title', 200)
  const content = requireLocalized(body.body, 'Post', 20000)
  const excerpt = requireLocalized(body.excerpt ?? { en: content.en.slice(0, 200), ar: '' }, 'Summary', 400)

  const now = new Date().toISOString()
  const doc = {
    slug: slugify(title.en),
    title,
    body: content,
    excerpt,
    authorId: user.id,
    authorName: user.name,
    // Everything a contributor writes waits for an admin.
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  }

  const db = await getDb()
  const result = await db.collection<PostDoc>('posts').insertOne(doc as PostDoc)

  return json(request, { post: toPublic({ ...doc, _id: result.insertedId } as PostDoc) }, 201)
}

/**
 * An author may keep editing while the post is pending or was rejected, and
 * an edit sends it back to the queue. Once approved, only an admin may change it.
 */
async function updatePost(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Post not found.')

  const user = await requireUser(request)
  const db = await getDb()
  const collection = db.collection<PostDoc>('posts')
  const post = await collection.findOne({ _id: new ObjectId(id) })

  if (!post) throw new HttpError(404, 'Post not found.')

  const isAdmin = user.role === 'admin'
  const isAuthor = post.authorId === user.id

  if (!isAdmin && !isAuthor) throw new HttpError(403, 'This is not your post.')
  if (!isAdmin && post.status === 'approved') {
    throw new HttpError(403, 'Approved posts can only be changed by an admin.')
  }

  const body = await readJsonBody<Record<string, unknown>>(request)
  const update: Partial<PostDoc> = { updatedAt: new Date().toISOString() }

  if (body.title !== undefined) update.title = requireLocalized(body.title, 'Title', 200)
  if (body.body !== undefined) update.body = requireLocalized(body.body, 'Post', 20000)
  if (body.excerpt !== undefined) update.excerpt = requireLocalized(body.excerpt, 'Summary', 400)

  // A contributor's edit re-enters moderation; an admin's does not.
  if (!isAdmin) update.status = 'pending'

  await collection.updateOne({ _id: post._id }, { $set: update })
  const updated = await collection.findOne({ _id: post._id })

  return json(request, { post: toPublic(updated as PostDoc) })
}

async function reviewPost(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Post not found.')

  const admin = await requireAdmin(request)
  const body = await readJsonBody<Record<string, unknown>>(request)
  const status = requireReviewStatus(body.status)
  const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

  const db = await getDb()
  const result = await db.collection<PostDoc>('posts').updateOne(
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

  if (result.matchedCount === 0) throw new HttpError(404, 'Post not found.')

  return json(request, { ok: true, status })
}

async function deletePost(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Post not found.')

  const user = await requireUser(request)
  const db = await getDb()
  const collection = db.collection<PostDoc>('posts')
  const post = await collection.findOne({ _id: new ObjectId(id) })

  if (!post) throw new HttpError(404, 'Post not found.')
  if (user.role !== 'admin' && post.authorId !== user.id) {
    throw new HttpError(403, 'This is not your post.')
  }

  await collection.deleteOne({ _id: post._id })
  return json(request, { ok: true })
}
