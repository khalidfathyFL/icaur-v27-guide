import { ObjectId, type Db } from 'mongodb'
import { readSession, requireUser } from '../_lib/auth.js'
import { hasPermission, requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { recordAudit } from '../_lib/audit.js'
import { requireReviewStatus, requireString, type AnswerDoc, type QuestionDoc } from '../_lib/models.js'
import { toPlainParagraphs, toPlainText } from '../_lib/sanitize.js'
import { sendToUser } from '../_lib/email/outbox.js'
import { answerDecisionEmail, newAnswerEmail, questionDecisionEmail } from '../_lib/email/templates.js'

/**
 * Owners ask, other owners answer. Both are moderated by the people who
 * approve comments: the same trust, applied to one more kind of owner writing.
 * Whoever may comment without review may also ask and answer without it.
 */

const PAGE_SIZE = 30
/** Waiting for review at once, per account, so one burst cannot bury the queue. */
const MAX_PENDING_QUESTIONS = 5
const MAX_PENDING_ANSWERS = 10
/** Guides are content in git, not records here, so a guide is checked by shape only. */
const GUIDE_SLUG = /^[a-z0-9-]{1,60}$/

function questionToPublic(question: QuestionDoc, viewerId?: string) {
  return {
    id: question._id.toHexString(),
    title: question.title,
    body: question.body,
    guide: question.guide,
    authorName: question.authorName,
    status: question.status,
    reviewNote: question.reviewNote,
    answerCount: question.answerCount,
    acceptedAnswerId: question.acceptedAnswerId,
    mine: viewerId !== undefined && viewerId === question.authorId,
    createdAt: question.createdAt,
    activeAt: question.activeAt,
  }
}

function answerToPublic(answer: AnswerDoc, viewerId?: string) {
  return {
    id: answer._id.toHexString(),
    questionId: answer.questionId,
    questionTitle: answer.questionTitle,
    body: answer.body,
    authorName: answer.authorName,
    status: answer.status,
    reviewNote: answer.reviewNote,
    mine: viewerId !== undefined && viewerId === answer.authorId,
    createdAt: answer.createdAt,
  }
}

const questions = (db: Db) => db.collection<QuestionDoc>('questions')
const answers = (db: Db) => db.collection<AnswerDoc>('answers')

function pageOf(params: URLSearchParams): number {
  return Math.max(1, Number(params.get('page') ?? 1) || 1)
}

function optionalGuide(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !GUIDE_SLUG.test(value)) throw new HttpError(400, 'Unknown guide.')
  return value
}

/**
 * Recounts a question's published answers after one is published, rejected
 * or deleted, and lets go of the accepted answer if that was the one removed.
 * A published answer also moves the question up the "recently active" list.
 */
async function refreshQuestion(
  db: Db,
  questionId: string,
  { published = false, removedAnswerId }: { published?: boolean; removedAnswerId?: string } = {},
): Promise<void> {
  const _id = new ObjectId(questionId)
  const answerCount = await answers(db).countDocuments({ questionId, status: 'approved' })

  await questions(db).updateOne(
    { _id },
    { $set: { answerCount, ...(published ? { activeAt: new Date().toISOString() } : {}) } },
  )

  if (removedAnswerId) {
    await questions(db).updateOne({ _id, acceptedAnswerId: removedAnswerId }, { $unset: { acceptedAnswerId: '' } })
  }
}

/** Tells the asker someone answered, unless they answered themselves. */
async function notifyAsker(db: Db, answer: AnswerDoc): Promise<void> {
  const question = await questions(db).findOne({ _id: new ObjectId(answer.questionId) })
  if (!question || question.status !== 'approved' || question.authorId === answer.authorId) return

  await sendToUser(
    question.authorId,
    newAnswerEmail({
      questionTitle: question.title,
      questionId: answer.questionId,
      answerAuthor: answer.authorName,
      excerpt: answer.body.length > 300 ? `${answer.body.slice(0, 300)}…` : answer.body,
    }),
  )
}

/* ---------- questions ---------- */

export async function handleQuestions(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return listQuestions(request)
    if (request.method === 'POST') return createQuestion(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'review' && request.method === 'POST') return reviewQuestion(request, id)
  if (action === 'accept' && request.method === 'POST') return acceptAnswer(request, id)
  if (!action && request.method === 'GET') return readQuestion(request, id)
  if (!action && request.method === 'DELETE') return deleteQuestion(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/**
 * Readers see published questions, most recently active first, optionally
 * only those about one guide. The moderation queue needs the permission.
 */
async function listQuestions(request: Request): Promise<Response> {
  const params = searchParams(request)
  const db = await getDb()
  const page = pageOf(params)

  if (params.get('queue') === '1') {
    await requirePermission(request, 'comments.review')
    const status = params.get('status') ?? 'pending'
    const list = await questions(db)
      .find(status === 'all' ? {} : { status: status as QuestionDoc['status'] })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()
    return json(request, { questions: list.map((question) => questionToPublic(question)), page })
  }

  const guide = optionalGuide(params.get('guide'))
  const filter = { status: 'approved' as const, ...(guide ? { guide } : {}) }
  const limit = Math.min(PAGE_SIZE, Math.max(1, Number(params.get('limit') ?? PAGE_SIZE) || PAGE_SIZE))

  const [list, total] = await Promise.all([
    questions(db)
      .find(filter)
      .sort({ activeAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    questions(db).countDocuments(filter),
  ])

  return json(request, { questions: list.map((question) => questionToPublic(question)), total, page })
}

/**
 * One question with its published answers, the accepted one first. A question
 * still waiting for review is shown only to whoever asked it and to moderators.
 */
async function readQuestion(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Question not found.')

  const db = await getDb()
  const question = await questions(db).findOne({ _id: new ObjectId(id) })
  if (!question) throw new HttpError(404, 'Question not found.')

  const session = await readSession(request)

  if (question.status !== 'approved') {
    if (!session) throw new HttpError(404, 'Question not found.')
    if (session.id !== question.authorId) {
      const user = await requireUser(request)
      if (!hasPermission(user, 'comments.review')) throw new HttpError(404, 'Question not found.')
    }
  }

  const list =
    question.status === 'approved'
      ? await answers(db).find({ questionId: id, status: 'approved' }).sort({ createdAt: 1 }).limit(200).toArray()
      : []

  const accepted = question.acceptedAnswerId
  list.sort((a, b) => Number(b._id.toHexString() === accepted) - Number(a._id.toHexString() === accepted))

  return json(request, {
    question: questionToPublic(question, session?.id),
    answers: list.map((answer) => answerToPublic(answer, session?.id)),
  })
}

async function createQuestion(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const title = toPlainText(requireString(body.title, 'Question', { min: 8, max: 200 }))
  if (title.length < 8) throw new HttpError(400, 'Write your question in a few more words.')

  const details =
    body.body === undefined || body.body === null || body.body === ''
      ? ''
      : toPlainParagraphs(requireString(body.body, 'Details', { max: 4000 }))
  const guide = optionalGuide(body.guide)

  const db = await getDb()
  const direct = hasPermission(user, 'comments.publishDirectly')

  if (!direct) {
    const waiting = await questions(db).countDocuments({ authorId: user.id, status: 'pending' })
    if (waiting >= MAX_PENDING_QUESTIONS) {
      throw new HttpError(
        429,
        `You already have ${MAX_PENDING_QUESTIONS} questions waiting for review. Please wait until those are answered.`,
      )
    }
  }

  const now = new Date().toISOString()
  const doc: Omit<QuestionDoc, '_id'> = {
    title,
    body: details,
    ...(guide ? { guide } : {}),
    authorId: user.id,
    authorName: user.name,
    status: direct ? 'approved' : 'pending',
    answerCount: 0,
    createdAt: now,
    activeAt: now,
  }

  const result = await questions(db).insertOne(doc as QuestionDoc)
  const created = { ...doc, _id: result.insertedId } as QuestionDoc

  await recordAudit(user, 'question.created', {
    target: { kind: 'question', id: result.insertedId.toHexString(), label: title },
  })

  return json(request, { question: questionToPublic(created, user.id) }, 201)
}

async function reviewQuestion(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Question not found.')

  const reviewer = await requirePermission(request, 'comments.review')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const status = requireReviewStatus(body.status)
  const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

  const db = await getDb()
  const question = await questions(db).findOneAndUpdate(
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

  if (!question) throw new HttpError(404, 'Question not found.')

  await recordAudit(reviewer, status === 'approved' ? 'question.approved' : 'question.rejected', {
    target: { kind: 'question', id, label: question.title },
    note,
  })

  if (question.status !== status) {
    await sendToUser(question.authorId, questionDecisionEmail({ status, title: question.title, id, note }))
  }

  return json(request, { ok: true, status })
}

/** The asker, or a moderator, marks the answer that solved it; `null` clears it. */
async function acceptAnswer(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Question not found.')

  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const db = await getDb()
  const question = await questions(db).findOne({ _id: new ObjectId(id) })
  if (!question || question.status !== 'approved') throw new HttpError(404, 'Question not found.')

  if (question.authorId !== user.id && !hasPermission(user, 'comments.review')) {
    throw new HttpError(403, 'Only the person who asked can choose the answer.')
  }

  let acceptedAnswerId: string | null = null

  if (body.answerId === null) {
    await questions(db).updateOne({ _id: question._id }, { $unset: { acceptedAnswerId: '' } })
  } else {
    const answerId = requireString(body.answerId, 'Answer', { max: 40 })
    if (!ObjectId.isValid(answerId)) throw new HttpError(404, 'Answer not found.')

    const answer = await answers(db).findOne({ _id: new ObjectId(answerId), questionId: id, status: 'approved' })
    if (!answer) throw new HttpError(404, 'Answer not found.')

    await questions(db).updateOne({ _id: question._id }, { $set: { acceptedAnswerId: answerId } })
    acceptedAnswerId = answerId
  }

  await recordAudit(user, 'question.answer_accepted', {
    target: { kind: 'question', id, label: question.title },
    changes: { acceptedAnswerId },
  })

  return json(request, { ok: true, acceptedAnswerId })
}

/**
 * A moderator may remove any question. Whoever asked may withdraw theirs only
 * until someone else's answer is published, so they cannot take other
 * owners' work down with it.
 */
async function deleteQuestion(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Question not found.')

  const user = await requireUser(request)
  const db = await getDb()
  const question = await questions(db).findOne({ _id: new ObjectId(id) })
  if (!question) throw new HttpError(404, 'Question not found.')

  if (!hasPermission(user, 'comments.review')) {
    if (question.authorId !== user.id) throw new HttpError(403, 'This is not your question.')
    const othersAnswered = await answers(db).countDocuments({ questionId: id, status: 'approved', authorId: { $ne: user.id } })
    if (othersAnswered > 0) {
      throw new HttpError(409, 'Other owners have answered this question, so it stays up. Ask a moderator if it must go.')
    }
  }

  await answers(db).deleteMany({ questionId: id })
  await questions(db).deleteOne({ _id: question._id })

  await recordAudit(user, 'question.deleted', { target: { kind: 'question', id, label: question.title } })

  return json(request, { ok: true })
}

/* ---------- answers ---------- */

export async function handleAnswers(request: Request, segments: string[]): Promise<Response> {
  const [id, action] = segments

  if (!id) {
    if (request.method === 'GET') return answerQueue(request)
    if (request.method === 'POST') return createAnswer(request)
    throw new HttpError(405, 'Method not allowed.')
  }

  if (action === 'review' && request.method === 'POST') return reviewAnswer(request, id)
  if (!action && request.method === 'DELETE') return deleteAnswer(request, id)

  throw new HttpError(405, 'Method not allowed.')
}

/** Readers get answers with their question; listing answers on their own is the moderation queue. */
async function answerQueue(request: Request): Promise<Response> {
  await requirePermission(request, 'comments.review')
  const params = searchParams(request)
  const status = params.get('status') ?? 'pending'
  const page = pageOf(params)

  const db = await getDb()
  const list = await answers(db)
    .find(status === 'all' ? {} : { status: status as AnswerDoc['status'] })
    .sort({ createdAt: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .toArray()

  return json(request, { answers: list.map((answer) => answerToPublic(answer)), page })
}

async function createAnswer(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const body = await readJsonBody<Record<string, unknown>>(request)

  const questionId = requireString(body.questionId, 'Question', { max: 40 })
  if (!ObjectId.isValid(questionId)) throw new HttpError(404, 'Question not found.')

  const db = await getDb()
  const question = await questions(db).findOne({ _id: new ObjectId(questionId) })

  // Answering a question nobody can read would be a way to probe the queue.
  if (!question || question.status !== 'approved') throw new HttpError(404, 'Question not found.')

  const text = toPlainParagraphs(requireString(body.body, 'Answer', { min: 2, max: 4000 }))
  if (!text) throw new HttpError(400, 'Write something first.')

  const direct = hasPermission(user, 'comments.publishDirectly')

  if (!direct) {
    const waiting = await answers(db).countDocuments({ authorId: user.id, status: 'pending' })
    if (waiting >= MAX_PENDING_ANSWERS) {
      throw new HttpError(429, `You already have ${MAX_PENDING_ANSWERS} answers waiting for review. Please wait for those first.`)
    }
  }

  const doc: Omit<AnswerDoc, '_id'> = {
    questionId,
    questionTitle: question.title,
    body: text,
    authorId: user.id,
    authorName: user.name,
    status: direct ? 'approved' : 'pending',
    createdAt: new Date().toISOString(),
  }

  const result = await answers(db).insertOne(doc as AnswerDoc)
  const created = { ...doc, _id: result.insertedId } as AnswerDoc

  if (direct) {
    await refreshQuestion(db, questionId, { published: true })
    await notifyAsker(db, created)
  }

  await recordAudit(user, 'answer.created', { target: { kind: 'question', id: questionId, label: question.title } })

  return json(request, { answer: answerToPublic(created, user.id) }, 201)
}

async function reviewAnswer(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Answer not found.')

  const reviewer = await requirePermission(request, 'comments.review')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const status = requireReviewStatus(body.status)
  const note = body.note === undefined ? undefined : requireString(body.note, 'Note', { max: 1000 })

  const db = await getDb()
  const answer = await answers(db).findOneAndUpdate(
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

  if (!answer) throw new HttpError(404, 'Answer not found.')

  await recordAudit(reviewer, status === 'approved' ? 'answer.approved' : 'answer.rejected', {
    target: { kind: 'question', id: answer.questionId, label: answer.questionTitle },
    note,
  })

  if (answer.status !== status) {
    await refreshQuestion(db, answer.questionId, {
      published: status === 'approved',
      removedAnswerId: status === 'rejected' ? id : undefined,
    })
    await sendToUser(
      answer.authorId,
      answerDecisionEmail({ status, questionTitle: answer.questionTitle, questionId: answer.questionId, note }),
    )
    // Only the first publication is news to the asker; a re-approval is not.
    if (status === 'approved' && answer.status === 'pending') await notifyAsker(db, { ...answer, status })
  }

  return json(request, { ok: true, status })
}

/** An author may withdraw their own answer; a moderator may remove any. */
async function deleteAnswer(request: Request, id: string): Promise<Response> {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Answer not found.')

  const user = await requireUser(request)
  const db = await getDb()
  const answer = await answers(db).findOne({ _id: new ObjectId(id) })
  if (!answer) throw new HttpError(404, 'Answer not found.')

  if (!hasPermission(user, 'comments.review') && answer.authorId !== user.id) {
    throw new HttpError(403, 'This is not your answer.')
  }

  await answers(db).deleteOne({ _id: answer._id })
  if (answer.status === 'approved') await refreshQuestion(db, answer.questionId, { removedAnswerId: id })

  await recordAudit(user, 'answer.deleted', {
    target: { kind: 'question', id: answer.questionId, label: answer.questionTitle },
  })

  return json(request, { ok: true })
}
