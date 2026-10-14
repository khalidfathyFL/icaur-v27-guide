import { ObjectId } from 'mongodb'
import type { UserDoc } from '../_lib/auth.js'
import { requirePermission } from '../_lib/permissions.js'
import { HttpError, json, readJsonBody, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { recordAudit } from '../_lib/audit.js'
import { optionalString, optionalUrl, requireEmail, requireEnum, type Localized } from '../_lib/models.js'
import { emailConfigured } from '../_lib/email/brevo.js'
import {
  announceToAll,
  drainQueue,
  emailStatus,
  readUnsubscribeToken,
  sendTransactional,
  unsubscribeUrl,
  type SendResult,
} from '../_lib/email/outbox.js'
import { EMAIL_SAMPLES, findSample } from '../_lib/email/samples.js'
import {
  EMAIL_IMAGES,
  announcementEmail,
  escapeHtml,
  pageUrl,
  renderEmail,
  type Announcement,
  type EmailContent,
} from '../_lib/email/templates.js'

export async function handleEmail(request: Request, segments: string[]): Promise<Response> {
  const action = segments[0]

  if (action === 'drain' && (request.method === 'GET' || request.method === 'POST')) return drain(request)
  if (action === 'status' && request.method === 'GET') return status(request)
  if (action === 'templates' && request.method === 'GET') return templates(request)
  if (action === 'preview' && request.method === 'POST') return preview(request)
  if (action === 'test' && request.method === 'POST') return sendTest(request)
  if (action === 'send' && request.method === 'POST') return send(request)
  if (action === 'unsubscribe') return unsubscribe(request)

  throw new HttpError(404, 'Unknown email endpoint.')
}

/**
 * Vercel's cron calls this once a day with `Authorization: Bearer
 * $CRON_SECRET`. Someone with `emails.send` may also run it from the panel,
 * e.g. after raising the daily limit.
 */
async function drain(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  const fromCron = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
  if (!fromCron) await requirePermission(request, 'emails.send')

  const result = await drainQueue()
  return json(request, { ...result, status: await emailStatus() })
}

/** Today's count against the limit, what is waiting, and how many people get broadcasts. */
async function status(request: Request): Promise<Response> {
  await requirePermission(request, 'emails.send')
  return json(request, { status: await emailStatus() })
}

/** The catalogue of built-in emails, for the panel's list. */
async function templates(request: Request): Promise<Response> {
  await requirePermission(request, 'emails.send')
  return json(request, {
    templates: EMAIL_SAMPLES.map(({ key, group, name, when, broadcast }) => ({ key, group, name, when, broadcast: Boolean(broadcast) })),
  })
}

/* ---------- what to render: a built-in sample, or an announcement being written ---------- */

const LANG_MAX = { subject: 150, heading: 150, body: 5000, label: 40 }

function readLang(value: unknown, field: string, max: number): Localized {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const side = (lang: 'en' | 'ar') =>
    typeof source[lang] === 'string' ? (optionalString((source[lang] as string).trim(), field, { max }) ?? '') : ''
  return { en: side('en'), ar: side('ar') }
}

/**
 * An announcement may be English only, Arabic only, or both, but each
 * language it is written in needs a heading and a message.
 */
function readAnnouncement(value: unknown): Announcement {
  if (typeof value !== 'object' || value === null) throw new HttpError(400, 'Write the message first.')
  const body = value as Record<string, unknown>

  const heading = readLang(body.heading, 'Heading', LANG_MAX.heading)
  const message = readLang(body.body, 'Message', LANG_MAX.body)
  const subject = readLang(body.subject, 'Subject', LANG_MAX.subject)

  if (!heading.en && !heading.ar) throw new HttpError(400, 'Write a heading in English or Arabic.')
  for (const [side, label] of [['en', 'English'], ['ar', 'Arabic']] as const) {
    if (heading[side] && !message[side]) throw new HttpError(400, `The ${label} heading has no ${label} message.`)
    if (message[side] && !heading[side]) throw new HttpError(400, `The ${label} message needs an ${label} heading.`)
    // The subject defaults to the heading, which is what most people would type anyway.
    if (heading[side] && !subject[side]) subject[side] = heading[side]
  }

  const url = optionalUrl(body.ctaUrl, 'Button link')
  const label = readLang(body.ctaLabel, 'Button text', LANG_MAX.label)

  return {
    image: requireEnum(body.image ?? 'hero', EMAIL_IMAGES, 'Photo'),
    subject,
    heading,
    body: message,
    cta: url
      ? {
          url,
          label: { en: label.en || (heading.en ? 'Open the guide' : ''), ar: label.ar || (heading.ar ? 'افتح الدليل' : '') },
        }
      : undefined,
  }
}

async function contentFrom(body: Record<string, unknown>): Promise<{ content: EmailContent; broadcast: boolean }> {
  if (typeof body.template === 'string') {
    const sample = findSample(body.template)
    if (!sample) throw new HttpError(404, 'Unknown email.')
    return { content: sample.build(), broadcast: Boolean(sample.broadcast) }
  }
  return { content: announcementEmail(readAnnouncement(body.announcement)), broadcast: true }
}

/** Renders exactly what would be sent, for the panel's preview frame. Sends nothing. */
async function preview(request: Request): Promise<Response> {
  const user = await requirePermission(request, 'emails.send')
  const body = await readJsonBody<Record<string, unknown>>(request)
  const { content, broadcast } = await contentFrom(body)

  // A broadcast shows its real unsubscribe footer; the link in a preview is the viewer's own.
  const rendered = renderEmail(content, user.name, broadcast ? await unsubscribeUrl(user.id) : undefined)
  return json(request, { subject: rendered.subject, html: rendered.html })
}

function requireConfigured() {
  if (!emailConfigured()) {
    throw new HttpError(503, 'Email is not set up yet. Add BREVO_API_KEY and EMAIL_FROM in Vercel, then redeploy.')
  }
}

const OUTCOME_MESSAGE = {
  sent: 'Sent.',
  queued: "Today's email allowance is used up, so it will go out tomorrow morning.",
  off: 'Email is not set up yet.',
  failed: 'Brevo did not accept the email.',
} as const

/** Brevo's own words, plus what to do about the usual causes. */
function failureMessage(error?: string): string {
  const detail = error ?? ''
  if (/unrecogni[sz]ed IP|authori[sz]ed IP/i.test(detail)) {
    return 'Brevo blocked the request because it came from an IP address it does not know. In Brevo, open Security → Authorized IPs and deactivate blocking for API keys: Vercel has no fixed IP.'
  }
  if (/401|key not found|unauthori[sz]ed/i.test(detail)) {
    return 'Brevo rejected the API key. Check BREVO_API_KEY in Vercel (it starts with xkeysib-), then redeploy.'
  }
  if (/sender/i.test(detail)) {
    return `Brevo rejected the sender. EMAIL_FROM must be a sender verified in Brevo. (${detail})`
  }
  return `${OUTCOME_MESSAGE.failed} ${detail}`.trim()
}

const resultMessage = (result: SendResult) =>
  result.outcome === 'failed' ? failureMessage(result.error) : OUTCOME_MESSAGE[result.outcome]

/** Sends one email to the person asking, so they can see it in a real inbox. */
async function sendTest(request: Request): Promise<Response> {
  const user = await requirePermission(request, 'emails.send')
  requireConfigured()
  const body = await readJsonBody<Record<string, unknown>>(request)
  const { content } = await contentFrom(body)

  const test: EmailContent = { ...content, subject: { en: `[Test] ${content.subject.en}`, ar: content.subject.ar ? `[تجربة] ${content.subject.ar}` : '' } }
  const result = await sendTransactional({ email: user.email, name: user.name, userId: user.id }, test, { retry: false })

  await recordAudit(user, 'email.test_sent', { changes: { email: content.tag, outcome: result.outcome } })
  return json(request, { outcome: result.outcome, message: resultMessage(result), to: user.email })
}

/**
 * An announcement, to everyone who gets broadcasts or to one account.
 * Everyone goes through the queue and its 200-a-day cap; one person is sent
 * straight away like any other reply.
 */
async function send(request: Request): Promise<Response> {
  const user = await requirePermission(request, 'emails.send')
  requireConfigured()
  const body = await readJsonBody<Record<string, unknown>>(request)
  const announcement = readAnnouncement(body.announcement)
  const subjectLabel = announcement.subject.en || announcement.subject.ar

  if (body.audience === 'one') {
    const email = requireEmail(body.email)
    const db = await getDb()
    const recipient = await db.collection<UserDoc>('users').findOne({ email }, { projection: { email: 1, name: 1, status: 1 } })
    if (!recipient) throw new HttpError(404, 'No account uses that email address.')
    if (recipient.status === 'blocked') throw new HttpError(409, 'That account is blocked.')

    const result = await sendTransactional(
      { email: recipient.email, name: recipient.name, userId: recipient._id.toHexString() },
      announcementEmail(announcement),
      { retry: false },
    )
    await recordAudit(user, 'email.sent_to_one', {
      target: { kind: 'user', id: recipient._id.toHexString(), label: recipient.email },
      changes: { subject: subjectLabel },
    })
    return json(request, { outcome: result.outcome, message: resultMessage(result), recipients: 1 })
  }

  if (body.audience !== 'all') throw new HttpError(400, 'Say who it goes to.')

  const result = await announceToAll(announcement, user.name)
  await recordAudit(user, 'email.announced', { changes: { subject: subjectLabel, recipients: result.recipients } })
  return json(request, { ...result, status: await emailStatus() })
}

/**
 * The link in every broadcast. Opening it only shows a button: mail scanners
 * follow links, and a GET that unsubscribed would silently opt people out.
 * The button, and mail apps' one-click unsubscribe, POST here.
 */
async function unsubscribe(request: Request): Promise<Response> {
  const token = searchParams(request).get('token') ?? ''
  const userId = await readUnsubscribeToken(token)
  if (!userId || !ObjectId.isValid(userId)) {
    return page('This link is not valid', 'Open your account on the site to change which emails you get.', 'هذا الرابط غير صالح. افتح حسابك على الموقع لتغيير الرسائل التي تصلك.', 400)
  }

  if (request.method === 'POST') {
    const db = await getDb()
    await db.collection<UserDoc>('users').updateOne({ _id: new ObjectId(userId) }, { $set: { emailNewPosts: false } })
    return page(
      'You will not get these emails any more',
      'No more emails about new posts or announcements. You will still get emails about your own posts, reviews and orders, and you can turn these back on from your profile.',
      'لن تصلك رسائل المقالات الجديدة والإعلانات بعد الآن. ستصلك فقط الرسائل الخاصة بمقالاتك وتقييماتك وطلباتك، ويمكنك إعادة تفعيلها من ملفك الشخصي.',
    )
  }

  const form = `<form method="post"><button type="submit">Stop these emails · إيقاف الرسائل</button></form>`
  return page(
    'Stop emails about new posts and announcements?',
    'You will still get emails about your own posts, reviews and orders.',
    'هل تريد إيقاف رسائل المقالات الجديدة والإعلانات؟ ستصلك فقط الرسائل الخاصة بمقالاتك وتقييماتك وطلباتك.',
    200,
    form,
  )
}

function page(title: string, en: string, ar: string, status = 200, extra = ''): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{margin:0;background:#efe9df;font:16px/1.6 'Segoe UI',Roboto,Arial,sans-serif;color:#1d2321;display:grid;place-items:center;min-height:100vh;padding:16px;box-sizing:border-box}
main{max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(24,53,45,.12)}
header{background:#18352d;color:#fff;padding:18px 24px;font-weight:800;letter-spacing:.3em}header span{color:#e7b48a}
section{padding:24px}h1{font-size:22px;color:#18352d;margin:0 0 10px}p{margin:0 0 12px}.ar{direction:rtl;text-align:right;font-family:Tahoma,Arial,sans-serif}
button{background:#ad6336;color:#fff;border:0;border-radius:10px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer}a{color:#ad6336}</style></head>
<body><main><header>iCAUR<span> V27</span></header><section><h1>${escapeHtml(title)}</h1><p>${escapeHtml(en)}</p><p class="ar">${escapeHtml(ar)}</p>${extra}
<p><a href="${pageUrl('account/profile')}">Your profile · ملفك الشخصي</a></p></section></main></body></html>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
