import { ObjectId, type Collection, type Db } from 'mongodb'
import { SignJWT, jwtVerify } from 'jose'
import { getDb } from '../mongo.js'
import type { UserDoc } from '../auth.js'
import { BrevoError, emailConfigured, sendViaBrevo } from './brevo.js'
import { announcementEmail, newPostEmail, renderEmail, type Announcement, type EmailContent } from './templates.js'

/**
 * Brevo's free plan sends 300 emails a day, and every email counts against
 * it whatever caused it. Two kinds compete for that allowance:
 *
 * - transactional: a reply to something the reader did (welcome, approval,
 *   order update). Sent straight away while the day has room.
 * - broadcast: "there is a new post", to everyone. Capped at 200 a day, so
 *   at least 100 stay free for transactional mail even on a busy day.
 *
 * Whatever does not fit today waits in `emailQueue`, and the daily cron
 * (`email/drain`) sends it the next morning: waiting transactional mail
 * first, then the next 200 broadcast recipients, oldest first.
 */

export const DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT ?? 300)
export const BROADCAST_DAILY_LIMIT = Number(process.env.EMAIL_BROADCAST_DAILY_LIMIT ?? 200)

/** After this many failed sends a job stops being retried and is kept for inspection. */
const MAX_ATTEMPTS = 5
/** Parallel calls to Brevo while draining, so 200 sends fit in the function's time limit. */
const CONCURRENCY = 8

type Kind = 'transactional' | 'broadcast'

type UsageDoc = { _id: string; total: number; broadcast: number }

export type AnnouncementDoc = {
  _id: ObjectId
  announcement: Announcement
  recipients: number
  createdBy: string
  createdAt: string
}

/** Who gets broadcasts: every account that is not blocked and has not opted out. */
const subscriberFilter = (excludeUserId?: string) => ({
  status: { $ne: 'blocked' as const },
  emailNewPosts: { $ne: false },
  ...(excludeUserId && ObjectId.isValid(excludeUserId) ? { _id: { $ne: new ObjectId(excludeUserId) } } : {}),
})

export type EmailJob = {
  _id: ObjectId
  kind: Kind
  to: { email: string; name: string }
  userId?: string
  /** Transactional: the message, rendered when it was due. */
  subject?: string
  html?: string
  text?: string
  tags?: string[]
  /** Broadcast: rendered at send time from the post, so a later edit or deletion is respected. */
  postId?: string
  /** Broadcast: an announcement written in the admin panel. */
  announcementId?: string
  attempts: number
  lastError?: string
  failed?: boolean
  createdAt: string
}

/* ---------- the record of every email ---------- */

export type EmailLogStatus = 'sent' | 'queued' | 'failed'

/**
 * One row per attempt to deliver an email: who it was for, what it was, and
 * what happened. This is what answers "did they get it?". A queued email gets
 * a second row when it finally goes out.
 */
export type EmailLogEntry = {
  _id: ObjectId
  at: string
  to: { email: string; name: string }
  userId?: string
  subject: string
  /** Who was copied in, if anyone. */
  cc?: string[]
  /** Which email it was, e.g. post-approved or announcement. */
  tag: string
  kind: Kind
  status: EmailLogStatus
  error?: string
}

/** Logging must never stop an email, so a failure here is only reported. */
async function logEmail(db: Db, entry: Omit<EmailLogEntry, '_id' | 'at'>): Promise<void> {
  try {
    await db.collection('emailLog').insertOne({ ...entry, at: new Date().toISOString() })
  } catch (error) {
    console.error('Could not record the email:', error)
  }
}

export async function emailLog(options: { page: number; search?: string }) {
  const db = await getDb()
  const pattern = options.search?.trim()
  const filter = pattern
    ? {
        $or: [
          { 'to.email': { $regex: escapeRegex(pattern), $options: 'i' } },
          { 'to.name': { $regex: escapeRegex(pattern), $options: 'i' } },
          { subject: { $regex: escapeRegex(pattern), $options: 'i' } },
        ],
      }
    : {}

  const entries = await db
    .collection<EmailLogEntry>('emailLog')
    .find(filter)
    .sort({ at: -1 })
    .skip((options.page - 1) * 50)
    .limit(50)
    .toArray()

  return entries.map(({ _id, ...entry }) => ({ id: _id.toHexString(), ...entry }))
}

/* ---------- copying in the admins ---------- */

/**
 * Every email about something a reader did (welcome, approval, order update)
 * copies in the super admins, the accounts with the full `admin` role, so
 * they see what the site tells people. Broadcasts do not: admins already get
 * those as subscribers, and copying every recipient's would flood them.
 * Worked out at send time, so a queued email reaches whoever is admin then.
 */
async function adminCc(db: Db, to: string): Promise<{ email: string; name: string }[]> {
  const admins = await db
    .collection<UserDoc>('users')
    .find({ role: 'admin', status: { $ne: 'blocked' } }, { projection: { email: 1, name: 1 } })
    .toArray()
  // An admin is not copied in on their own email.
  return admins.filter((admin) => admin.email.toLowerCase() !== to.toLowerCase()).map(({ email, name }) => ({ email, name }))
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/* ---------- the daily allowance ---------- */

/** Brevo counts per calendar day; the counter uses UTC days. */
const today = () => new Date().toISOString().slice(0, 10)

const usage = (db: Db) => db.collection<UsageDoc>('emailUsage')
const queue = (db: Db) => db.collection<EmailJob>('emailQueue')

/**
 * Claims up to `wanted` sends from today's allowance and returns how many it
 * got. The claim is a conditional increment, so two requests at once cannot
 * both take the last slot.
 */
async function reserve(db: Db, kind: Kind, wanted: number): Promise<number> {
  const day = today()
  await usage(db).updateOne({ _id: day }, { $setOnInsert: { total: 0, broadcast: 0 } }, { upsert: true })

  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await usage(db).findOne({ _id: day })
    if (!doc) return 0

    let room = DAILY_LIMIT - doc.total
    if (kind === 'broadcast') room = Math.min(room, BROADCAST_DAILY_LIMIT - doc.broadcast)
    const granted = Math.max(0, Math.min(wanted, room))
    if (granted === 0) return 0

    const result = await usage(db).updateOne(
      {
        _id: day,
        total: { $lte: DAILY_LIMIT - granted },
        ...(kind === 'broadcast' ? { broadcast: { $lte: BROADCAST_DAILY_LIMIT - granted } } : {}),
      },
      { $inc: kind === 'broadcast' ? { total: granted, broadcast: granted } : { total: granted } },
    )
    if (result.modifiedCount === 1) return granted
  }
  return 0
}

/** Hands back slots that were claimed but not used, e.g. when Brevo refused. */
async function release(db: Db, kind: Kind, count: number): Promise<void> {
  if (count <= 0) return
  await usage(db).updateOne(
    { _id: today() },
    { $inc: kind === 'broadcast' ? { total: -count, broadcast: -count } : { total: -count } },
  )
}

/** Brevo says the day is spent, even if our counter disagrees: believe Brevo. */
async function markDaySpent(db: Db): Promise<void> {
  await usage(db).updateOne({ _id: today() }, { $max: { total: DAILY_LIMIT } })
}

export async function emailStatus() {
  const db = await getDb()
  const [day, waiting, failed, subscribers, lastFailure] = await Promise.all([
    usage(db).findOne({ _id: today() }),
    queue(db)
      .aggregate<{ _id: Kind; count: number }>([{ $match: { failed: { $ne: true } } }, { $group: { _id: '$kind', count: { $sum: 1 } } }])
      .toArray(),
    queue(db).countDocuments({ failed: true }),
    db.collection<UserDoc>('users').countDocuments(subscriberFilter()),
    queue(db).findOne({ lastError: { $exists: true } }, { sort: { createdAt: -1 }, projection: { lastError: 1, createdAt: 1 } }),
  ])
  const count = (kind: Kind) => waiting.find((row) => row._id === kind)?.count ?? 0

  return {
    configured: emailConfigured(),
    day: today(),
    sentToday: day?.total ?? 0,
    broadcastToday: day?.broadcast ?? 0,
    dailyLimit: DAILY_LIMIT,
    broadcastDailyLimit: BROADCAST_DAILY_LIMIT,
    waiting: { transactional: count('transactional'), broadcast: count('broadcast') },
    failed,
    subscribers,
    /** The most recent reason Brevo refused something still in the queue. */
    lastError: lastFailure?.lastError,
  }
}

/* ---------- unsubscribe links ---------- */

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '')
}

/** The API's public address, which is where unsubscribe links point. */
function apiUrl(): string {
  const configured = process.env.API_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return configured.replace(/\/$/, '')
}

/** Signed, so nobody can unsubscribe someone else by guessing an id. It never expires: old emails keep working. */
export async function unsubscribeUrl(userId: string): Promise<string> {
  const token = await new SignJWT({ purpose: 'unsubscribe' }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).sign(secretKey())
  return `${apiUrl()}/api/router?p=email/unsubscribe&token=${token}`
}

export async function readUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return payload.purpose === 'unsubscribe' && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

/* ---------- sending ---------- */

/**
 * Sends one message about something the reader did. Never throws: an email
 * that cannot go out must not undo the approval or order that caused it.
 * When today's allowance is spent it waits in the queue for tomorrow.
 */
export type SendOutcome = 'sent' | 'queued' | 'off' | 'failed'

/**
 * `queued` means it will go out later because today is full; `failed` means
 * Brevo refused it for another reason (a bad key, a blocked IP, an
 * unverified sender), and `error` says which.
 */
export type SendResult = { outcome: SendOutcome; error?: string }

export async function sendTransactional(
  to: { email: string; name: string; userId?: string },
  content: EmailContent,
  /** False for test sends: a failed test is reported, not retried tomorrow. */
  { retry = true }: { retry?: boolean } = {},
): Promise<SendResult> {
  if (!emailConfigured()) return { outcome: 'off' }

  try {
    const db = await getDb()
    const rendered = renderEmail(content, to.name)
    const job = {
      kind: 'transactional' as const,
      to: { email: to.email, name: to.name },
      userId: to.userId,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [content.tag],
    }

    const record = (status: EmailLogStatus, error?: string, cc?: { email: string }[]) =>
      logEmail(db, {
        to: job.to,
        ...(cc?.length ? { cc: cc.map((person) => person.email) } : {}),
        userId: to.userId,
        subject: job.subject,
        tag: content.tag,
        kind: 'transactional',
        status,
        error,
      })

    if ((await reserve(db, 'transactional', 1)) === 0) {
      await queue(db).insertOne({ ...job, attempts: 0, createdAt: new Date().toISOString() } as EmailJob)
      await record('queued')
      return { outcome: 'queued' }
    }

    const cc = await adminCc(db, job.to.email)
    try {
      await sendViaBrevo({ to: job.to, cc, subject: job.subject, html: job.html, text: job.text, tags: job.tags })
      await record('sent', undefined, cc)
      return { outcome: 'sent' }
    } catch (error) {
      await record(error instanceof BrevoError && error.quotaExhausted ? 'queued' : 'failed', String(error).slice(0, 500), cc)
      await release(db, 'transactional', 1)
      const quota = error instanceof BrevoError && error.quotaExhausted
      if (quota) await markDaySpent(db)
      if (quota || retry) {
        await queue(db).insertOne({ ...job, attempts: 1, lastError: String(error), createdAt: new Date().toISOString() } as EmailJob)
      }
      console.error('Email not sent:', content.tag, error)
      return quota ? { outcome: 'queued' } : { outcome: 'failed', error: error instanceof Error ? error.message : String(error) }
    }
  } catch (error) {
    console.error('Email failed:', content.tag, error)
    return { outcome: 'failed', error: error instanceof Error ? error.message : String(error) }
  }
}

/** Sends to someone by account id, looking up their address. */
export async function sendToUser(userId: string, content: EmailContent): Promise<void> {
  if (!emailConfigured() || !ObjectId.isValid(userId)) return
  try {
    const db = await getDb()
    const user = await db.collection<UserDoc>('users').findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, name: 1, status: 1 } })
    if (!user || user.status === 'blocked') return
    await sendTransactional({ email: user.email, name: user.name, userId }, content)
  } catch (error) {
    console.error('Email failed:', content.tag, error)
  }
}

type PostForBroadcast = { _id: ObjectId; slug: string; title: { en: string; ar: string }; excerpt: { en: string; ar: string }; authorId: string; authorName: string; status: string; announcedAt?: string }

/**
 * Tells everyone about a newly published post, once. `announcedAt` is set
 * atomically first, so re-approving an edited post, or two moderators
 * approving at once, never announces it twice.
 *
 * Every recipient goes into the queue, then as many as today allows go out
 * at once; the rest follow on the next days' cron runs.
 */
export async function announcePost(postId: ObjectId): Promise<void> {
  if (!emailConfigured()) return

  try {
    const db = await getDb()
    const claimed = await db
      .collection<PostForBroadcast>('posts')
      .findOneAndUpdate({ _id: postId, status: 'approved', announcedAt: { $exists: false } }, { $set: { announcedAt: new Date().toISOString() } })
    if (!claimed) return

    const recipients = await db
      .collection<UserDoc>('users')
      .find(subscriberFilter(claimed.authorId), { projection: { email: 1, name: 1 } })
      .toArray()
    if (recipients.length === 0) return

    const now = new Date().toISOString()
    await queue(db).insertMany(
      recipients.map((user) => ({
        kind: 'broadcast' as const,
        to: { email: user.email, name: user.name },
        userId: user._id.toHexString(),
        postId: postId.toHexString(),
        attempts: 0,
        createdAt: now,
      })) as EmailJob[],
    )

    await drainQueue(db)
  } catch (error) {
    console.error('Announcing the post failed:', postId.toHexString(), error)
  }
}

/**
 * Sends an admin's announcement to every subscriber, through the same queue
 * and daily cap as new-post emails. Returns how many it is going to and how
 * many went out straight away.
 */
export async function announceToAll(announcement: Announcement, createdBy: string): Promise<{ recipients: number; sentNow: number }> {
  if (!emailConfigured()) throw new Error('Email is not set up.')
  const db = await getDb()

  const recipients = await db.collection<UserDoc>('users').find(subscriberFilter(), { projection: { email: 1, name: 1 } }).toArray()
  const now = new Date().toISOString()
  const { insertedId } = await db
    .collection<AnnouncementDoc>('announcements')
    .insertOne({ announcement, recipients: recipients.length, createdBy, createdAt: now } as AnnouncementDoc)
  if (recipients.length === 0) return { recipients: 0, sentNow: 0 }

  await queue(db).insertMany(
    recipients.map((user) => ({
      kind: 'broadcast' as const,
      to: { email: user.email, name: user.name },
      userId: user._id.toHexString(),
      announcementId: insertedId.toHexString(),
      attempts: 0,
      createdAt: now,
    })) as EmailJob[],
  )

  const before = await queue(db).countDocuments({ announcementId: insertedId.toHexString() })
  await drainQueue(db)
  const after = await queue(db).countDocuments({ announcementId: insertedId.toHexString() })
  return { recipients: recipients.length, sentNow: before - after }
}

/**
 * Sends what is waiting, as far as today's allowance goes: transactional
 * first, because those are answers people are waiting for, then broadcasts
 * up to their own daily cap. Called by the daily cron and after a new post.
 */
export async function drainQueue(db?: Db): Promise<{ sent: number; deferred: number; error?: string }> {
  if (!emailConfigured()) return { sent: 0, deferred: 0 }
  const database = db ?? (await getDb())
  const jobs = queue(database)
  let sent = 0
  let deferred = 0
  let error: string | undefined

  for (const kind of ['transactional', 'broadcast'] as const) {
    const waiting = await jobs.countDocuments({ kind, failed: { $ne: true } })
    if (waiting === 0) continue

    const granted = await reserve(database, kind, waiting)
    if (granted === 0) {
      deferred += waiting
      continue
    }

    const batch = await jobs.find({ kind, failed: { $ne: true } }).sort({ createdAt: 1 }).limit(granted).toArray()
    const result = await sendBatch(database, jobs, batch)
    error ??= result.error
    sent += result.sent
    deferred += waiting - result.sent

    await release(database, kind, granted - result.sent)
    if (result.quotaExhausted) {
      await markDaySpent(database)
      break
    }
  }

  return { sent, deferred, error }
}

async function sendBatch(db: Db, jobs: Collection<EmailJob>, batch: EmailJob[]) {
  const posts = new Map<string, EmailContent | null>()
  let sent = 0
  let quotaExhausted = false
  /** The first refusal, so whoever pressed the button learns why nothing went. */
  let firstError: string | undefined

  const announcements = new Map<string, EmailContent | null>()

  async function announcementFor(id: string): Promise<EmailContent | null> {
    if (!announcements.has(id)) {
      const doc = ObjectId.isValid(id) ? await db.collection<AnnouncementDoc>('announcements').findOne({ _id: new ObjectId(id) }) : null
      announcements.set(id, doc ? announcementEmail(doc.announcement) : null)
    }
    return announcements.get(id) ?? null
  }

  /** A broadcast is rendered from the post as it is now; a deleted or unpublished post sends nothing. */
  async function contentFor(postId: string): Promise<EmailContent | null> {
    if (!posts.has(postId)) {
      const post = ObjectId.isValid(postId)
        ? await db.collection<PostForBroadcast>('posts').findOne({ _id: new ObjectId(postId), status: 'approved' })
        : null
      posts.set(
        postId,
        post
          ? newPostEmail({
              title: post.title.en || post.title.ar,
              excerpt: post.excerpt.en || post.excerpt.ar,
              authorName: post.authorName,
              slug: post.slug,
            })
          : null,
      )
    }
    return posts.get(postId) ?? null
  }

  async function sendOne(job: EmailJob): Promise<void> {
    if (quotaExhausted) return
    let subject = job.subject ?? ''
    let tag = job.tags?.[0] ?? job.kind
    let cc: { email: string; name: string }[] = []
    try {
      if (job.kind === 'broadcast') {
        const content = job.announcementId
          ? await announcementFor(job.announcementId)
          : job.postId
            ? await contentFor(job.postId)
            : null
        if (!content) {
          // The post or announcement is gone; the job is moot, and nothing was sent.
          await jobs.deleteOne({ _id: job._id })
          return
        }
        const unsubscribe = job.userId ? await unsubscribeUrl(job.userId) : undefined
        const rendered = renderEmail(content, job.to.name, unsubscribe)
        subject = rendered.subject
        tag = content.tag
        await sendViaBrevo({ to: job.to, ...rendered, unsubscribeUrl: unsubscribe, tags: [content.tag] })
      } else {
        cc = await adminCc(db, job.to.email)
        await sendViaBrevo({ to: job.to, cc, subject: job.subject!, html: job.html!, text: job.text!, tags: job.tags })
      }
      await jobs.deleteOne({ _id: job._id })
      sent++
      await logEmail(db, { to: job.to, ...(cc.length ? { cc: cc.map((person) => person.email) } : {}), userId: job.userId, subject, tag, kind: job.kind, status: 'sent' })
    } catch (error) {
      if (error instanceof BrevoError && error.quotaExhausted) quotaExhausted = true
      await logEmail(db, {
        to: job.to,
        ...(cc.length ? { cc: cc.map((person) => person.email) } : {}),
        userId: job.userId,
        subject,
        tag,
        kind: job.kind,
        status: quotaExhausted ? 'queued' : 'failed',
        error: String(error).slice(0, 500),
      })
      firstError ??= error instanceof Error ? error.message : String(error)
      const attempts = job.attempts + 1
      await jobs.updateOne(
        { _id: job._id },
        { $set: { attempts, lastError: String(error).slice(0, 500), ...(attempts >= MAX_ATTEMPTS && !quotaExhausted ? { failed: true } : {}) } },
      )
    }
  }

  for (let index = 0; index < batch.length; index += CONCURRENCY) {
    if (quotaExhausted) break
    await Promise.all(batch.slice(index, index + CONCURRENCY).map(sendOne))
  }

  return { sent, quotaExhausted, error: firstError }
}
