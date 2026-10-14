import { ObjectId } from 'mongodb'
import type { UserDoc } from '../_lib/auth.js'
import { requirePermission } from '../_lib/permissions.js'
import { HttpError, json, searchParams } from '../_lib/http.js'
import { getDb } from '../_lib/mongo.js'
import { drainQueue, emailStatus, readUnsubscribeToken } from '../_lib/email/outbox.js'
import { escapeHtml, pageUrl } from '../_lib/email/templates.js'

export async function handleEmail(request: Request, segments: string[]): Promise<Response> {
  const action = segments[0]

  if (action === 'drain' && (request.method === 'GET' || request.method === 'POST')) return drain(request)
  if (action === 'status' && request.method === 'GET') return status(request)
  if (action === 'unsubscribe') return unsubscribe(request)

  throw new HttpError(404, 'Unknown email endpoint.')
}

/**
 * Vercel's cron calls this once a day with `Authorization: Bearer
 * $CRON_SECRET`. An admin may also call it by hand, e.g. after raising the
 * daily limit.
 */
async function drain(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  const fromCron = Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
  if (!fromCron) await requirePermission(request, 'users.manage')

  const result = await drainQueue()
  return json(request, { ...result, status: await emailStatus() })
}

/** Today's count against the limit, and what is waiting for tomorrow. */
async function status(request: Request): Promise<Response> {
  await requirePermission(request, 'users.manage')
  return json(request, { status: await emailStatus() })
}

/**
 * The link in every new-post email. Opening it only shows a button: mail
 * scanners follow links, and a GET that unsubscribed would silently opt
 * people out. The button, and mail apps' one-click unsubscribe, POST here.
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
      'You will not get new-post emails any more',
      'You will still get emails about your own posts, reviews and orders. You can turn new-post emails back on from your profile.',
      'لن تصلك رسائل المقالات الجديدة بعد الآن. ستصلك فقط الرسائل الخاصة بمقالاتك وتقييماتك وطلباتك، ويمكنك إعادة تفعيلها من ملفك الشخصي.',
    )
  }

  const form = `<form method="post"><button type="submit">Stop new-post emails · إيقاف الرسائل</button></form>`
  return page(
    'Stop emails about new posts?',
    'You will still get emails about your own posts, reviews and orders.',
    'هل تريد إيقاف رسائل المقالات الجديدة؟ ستصلك فقط الرسائل الخاصة بمقالاتك وتقييماتك وطلباتك.',
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
