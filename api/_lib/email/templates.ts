/**
 * Every email the site sends, built on one layout.
 *
 * Email clients are not browsers: Outlook ignores most CSS, Gmail strips
 * <style> blocks in some views, and nobody runs scripts. So the layout is
 * nested tables with inline styles, images are JPGs at absolute URLs, and the
 * button is a padded table cell rather than a styled link alone.
 *
 * We do not know which language a reader prefers, so each email carries both:
 * English first, then the same message in Arabic, right to left.
 */

export type Lang = { en: string; ar: string }

/** The photos in `public/email/`, served from the site. */
export type EmailImage = 'hero' | 'cabin' | 'screen' | 'rear'

type Tone = 'ok' | 'no' | 'info'

export type EmailContent = {
  /** Brevo tag, for finding a send in its logs. */
  tag: string
  subject: Lang
  /** The grey line inboxes show after the subject. */
  preheader: Lang
  image: EmailImage
  badge: { label: Lang; tone: Tone }
  heading: Lang
  paragraphs: Lang[]
  /** A moderator's note or a post excerpt: shown as written, in one language. */
  quote?: { label: Lang; text: string }
  /** Label and value rows, e.g. an order's number and total. */
  details?: { label: Lang; value: string }[]
  cta?: { label: Lang; url: string }
}

export type RenderedEmail = { subject: string; html: string; text: string }

/* ---------- where things live ---------- */

export function siteUrl(): string {
  const url = process.env.SITE_URL ?? 'https://khalidfathyfl.github.io/icaur-v27-guide/'
  return url.endsWith('/') ? url : `${url}/`
}

/** The site routes by hash, so a page link is the site URL plus `#/path`. */
export const pageUrl = (path: string) => `${siteUrl()}#/${path.replace(/^[#/]+/, '')}`

const imageUrl = (image: EmailImage) => `${process.env.EMAIL_ASSETS_URL ?? `${siteUrl()}email/`}${image}.jpg`

/* ---------- palette: the site's own copper and forest green ---------- */

const C = {
  page: '#efe9df',
  card: '#ffffff',
  forest: '#18352d',
  forestSoft: '#24493f',
  copper: '#ad6336',
  copperLight: '#e7b48a',
  ink: '#1d2321',
  muted: '#5f6b66',
  rule: '#e6ded2',
  quoteBg: '#f7f2ea',
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: '#e3efe6', fg: '#1f5a3d' },
  no: { bg: '#f6e4dc', fg: '#8a3b1c' },
  info: { bg: '#f3e7da', fg: '#7a4420' },
}

const FONT_EN = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const FONT_AR = "Tahoma, 'Segoe UI', 'Noto Sans Arabic', Arial, sans-serif"

/* ---------- rendering ---------- */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Keeps the reader's line breaks without letting them write markup. */
const multiline = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br>')

const isArabic = (value: string) => /[؀-ۿ]/.test(value)

function badge(label: string, tone: Tone, font: string): string {
  const { bg, fg } = TONES[tone]
  return `<span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${bg};color:${fg};font-family:${font};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(label)}</span>`
}

function button(label: string, url: string, font: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;"><tr>
<td bgcolor="${C.copper}" style="border-radius:10px;background:${C.copper};">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
</td></tr></table>`
}

/** One language's half of the message. */
function section(content: EmailContent, lang: 'en' | 'ar', name: string): string {
  const rtl = lang === 'ar'
  const font = rtl ? FONT_AR : FONT_EN
  const dir = rtl ? 'rtl' : 'ltr'
  const align = rtl ? 'right' : 'left'
  const greeting = rtl ? `أهلاً ${name}،` : `Hi ${name},`

  const quote = content.quote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;"><tr>
<td style="background:${C.quoteBg};border-${rtl ? 'right' : 'left'}:4px solid ${C.copper};border-radius:8px;padding:16px 18px;">
<div style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.copper};margin-bottom:6px;">${escapeHtml(content.quote.label[lang])}</div>
<div dir="${isArabic(content.quote.text) ? 'rtl' : 'ltr'}" style="font-family:${isArabic(content.quote.text) ? FONT_AR : FONT_EN};font-size:15px;line-height:1.6;color:${C.ink};text-align:${isArabic(content.quote.text) ? 'right' : 'left'};">${multiline(content.quote.text)}</div>
</td></tr></table>`
    : ''

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;border-top:1px solid ${C.rule};">
${content.details
  .map(
    (row) => `<tr>
<td style="padding:11px 0;border-bottom:1px solid ${C.rule};font-family:${font};font-size:13px;color:${C.muted};text-align:${align};">${escapeHtml(row.label[lang])}</td>
<td dir="auto" style="padding:11px 0;border-bottom:1px solid ${C.rule};font-family:${font};font-size:14px;font-weight:700;color:${C.ink};text-align:${rtl ? 'left' : 'right'};">${escapeHtml(row.value)}</td>
</tr>`,
  )
  .join('\n')}
</table>`
    : ''

  return `<div dir="${dir}" lang="${lang}" style="text-align:${align};">
${badge(content.badge.label[lang], content.badge.tone, font)}
<h1 style="margin:18px 0 14px;font-family:${font};font-size:26px;line-height:1.25;font-weight:800;color:${C.forest};">${escapeHtml(content.heading[lang])}</h1>
<p style="margin:0 0 12px;font-family:${font};font-size:16px;line-height:1.65;color:${C.ink};">${escapeHtml(greeting)}</p>
${content.paragraphs.filter((p) => p[lang]).map((p) => `<p style="margin:0 0 12px;font-family:${font};font-size:16px;line-height:1.65;color:${C.ink};">${multiline(p[lang])}</p>`).join('\n')}
${quote}
${details}
${content.cta ? button(content.cta.label[lang], content.cta.url, font) : ''}
</div>`
}

/** A strip of three small photos, like the gauges along a dashboard. */
function gallery(): string {
  const cell = (image: EmailImage, label: string) =>
    `<td width="33%" style="padding:0 4px;" valign="top">
<img src="${imageUrl(image)}" width="176" alt="${label}" style="display:block;width:100%;max-width:176px;height:auto;border-radius:8px;border:0;">
<div style="font-family:${FONT_EN};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${C.copperLight};padding-top:7px;">${label}</div>
</td>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${cell('cabin', 'Cabin')}${cell('screen', 'Tech')}${cell('rear', 'Off-road')}
</tr></table>`
}

/** Both languages on one line, or the text once when it reads the same in both or one side is empty. */
const both = (value: Lang) => (!value.ar || value.en === value.ar ? value.en : !value.en ? value.ar : `${value.en} · ${value.ar}`)

/**
 * The languages a message is written in. Every built-in message has both; an
 * announcement written in only one language shows just that one.
 */
const languagesOf = (content: EmailContent): ('en' | 'ar')[] => {
  const written = (['en', 'ar'] as const).filter((lang) => content.heading[lang].trim())
  return written.length > 0 ? written : ['en']
}

export function renderEmail(content: EmailContent, recipientName: string, unsubscribeUrl?: string): RenderedEmail {
  const name = recipientName.trim().split(/\s+/)[0] || recipientName
  const subject = both(content.subject)
  const preheader = both(content.preheader)

  const unsubscribe = unsubscribeUrl
    ? `<p style="margin:14px 0 0;font-family:${FONT_EN};font-size:12px;line-height:1.6;color:#9fb3aa;">You get these because you have an account on the V27 owners' guide. <a href="${escapeHtml(unsubscribeUrl)}" style="color:${C.copperLight};">Stop emails about new posts and announcements</a><br><span dir="rtl" style="font-family:${FONT_AR};">تصلك هذه الرسائل لأن لديك حساباً على دليل ملاك V27. <a href="${escapeHtml(unsubscribeUrl)}" style="color:${C.copperLight};">إيقاف رسائل المقالات الجديدة والإعلانات</a></span></p>`
    : `<p style="margin:14px 0 0;font-family:${FONT_EN};font-size:12px;line-height:1.6;color:#9fb3aa;">This is about something you did on the V27 owners' guide, so it is sent whatever your email settings.</p>`

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

<tr><td bgcolor="${C.forest}" style="background:${C.forest};border-radius:18px 18px 0 0;padding:20px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${FONT_EN};font-size:20px;font-weight:800;letter-spacing:0.32em;color:#ffffff;">iCAUR<span style="color:${C.copperLight};">&nbsp;V27</span></td>
<td align="right" style="font-family:${FONT_EN};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${C.copperLight};">Owners' guide <span style="font-family:${FONT_AR};letter-spacing:0;">· دليل الملاك</span></td>
</tr></table>
</td></tr>

<tr><td style="line-height:0;font-size:0;background:${C.forest};">
<img src="${imageUrl(content.image)}" width="600" alt="iCAUR V27" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>

<tr><td style="height:6px;line-height:6px;font-size:0;background:${C.copper};background-image:linear-gradient(90deg,${C.copper},${C.copperLight},${C.copper});">&nbsp;</td></tr>

<tr><td bgcolor="${C.card}" style="background:${C.card};padding:34px 32px 30px;">
${languagesOf(content)
  .map((lang) => section(content, lang, name))
  .join(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0;"><tr>
<td style="border-top:1px dashed ${C.rule};font-size:0;line-height:0;">&nbsp;</td>
<td width="70" align="center" style="font-family:${FONT_AR};font-size:12px;color:${C.copper};white-space:nowrap;padding:0 10px;">عربي</td>
<td style="border-top:1px dashed ${C.rule};font-size:0;line-height:0;">&nbsp;</td>
</tr></table>`)}
</td></tr>

<tr><td bgcolor="${C.forest}" style="background:${C.forest};border-radius:0 0 18px 18px;padding:26px 28px 28px;">
${gallery()}
<p style="margin:22px 0 0;font-family:${FONT_EN};font-size:14px;font-weight:700;color:#ffffff;">Built by V27 owners, for V27 owners. <span dir="rtl" style="font-family:${FONT_AR};color:${C.copperLight};">من الملاك، للملاك.</span></p>
<p style="margin:8px 0 0;font-family:${FONT_EN};font-size:13px;"><a href="${siteUrl()}" style="color:${C.copperLight};text-decoration:none;">Guide</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${pageUrl('blog')}" style="color:${C.copperLight};text-decoration:none;">Owner posts</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${pageUrl('account')}" style="color:${C.copperLight};text-decoration:none;">Your account</a></p>
${unsubscribe}
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  return { subject, html, text: renderText(content, name, unsubscribeUrl) }
}

/** The plain-text part: some readers prefer it, and spam filters distrust HTML-only mail. */
function renderText(content: EmailContent, name: string, unsubscribeUrl?: string): string {
  const half = (lang: 'en' | 'ar') =>
    [
      `[${content.badge.label[lang]}] ${content.heading[lang]}`,
      '',
      lang === 'ar' ? `أهلاً ${name}،` : `Hi ${name},`,
      '',
      ...content.paragraphs.map((p) => p[lang]).filter(Boolean),
      ...(content.quote ? ['', `${content.quote.label[lang]}:`, content.quote.text] : []),
      ...(content.details ?? []).map((row) => `${row.label[lang]}: ${row.value}`),
      ...(content.cta ? ['', `${content.cta.label[lang]}: ${content.cta.url}`] : []),
    ].join('\n')

  return [
    languagesOf(content).map(half).join('\n\n— — —\n\n'),
    '',
    `iCAUR V27 owners' guide: ${siteUrl()}`,
    ...(unsubscribeUrl ? [`Stop emails about new posts / إيقاف رسائل المقالات الجديدة: ${unsubscribeUrl}`] : []),
  ].join('\n')
}

/* ---------- the messages ---------- */

type Decision = 'approved' | 'rejected'

const decided = (status: Decision) =>
  status === 'approved'
    ? { label: { en: 'Approved', ar: 'تمت الموافقة' }, tone: 'ok' as const }
    : { label: { en: 'Not approved', ar: 'لم تتم الموافقة' }, tone: 'no' as const }

const noteQuote = (note?: string) =>
  note ? { label: { en: 'Note from the moderator', ar: 'ملاحظة المراجع' }, text: note } : undefined

export function welcomeEmail(input: { owner: boolean }): EmailContent {
  return {
    tag: 'welcome',
    subject: { en: 'Welcome to the V27 owners’ guide', ar: 'أهلاً بك في دليل ملاك V27' },
    preheader: { en: 'Your account is ready. Here is where to start.', ar: 'حسابك جاهز. هذه أفضل بداية.' },
    image: 'hero',
    badge: { label: { en: 'Welcome aboard', ar: 'أهلاً بك' }, tone: 'info' },
    heading: input.owner
      ? { en: 'Your V27 just got a community', ar: 'سيارتك V27 أصبح لها مجتمع' }
      : { en: 'Welcome to the V27 community', ar: 'أهلاً بك في مجتمع V27' },
    paragraphs: [
      {
        en: 'Your account is ready. Read the guides, compare accessories, protection centers and insurance plans, and see what other owners are saying.',
        ar: 'حسابك جاهز. اقرأ الأدلة، وقارن الإكسسوارات ومراكز الحماية وبرامج التأمين، وتابع ما يقوله الملاك الآخرون.',
      },
      input.owner
        ? {
            en: 'Since you own one: add your trim on your profile so the guides show your equipment, and share what you learn in a post.',
            ar: 'بما أنك تملك واحدة: أضف الفئة في ملفك الشخصي لتعرض الأدلة تجهيزات سيارتك، وشارك خبرتك في مقال.',
          }
        : {
            en: 'Thinking of buying one? Owner posts and reviews are the best place to see how the car lives day to day.',
            ar: 'تفكر في شرائها؟ مقالات الملاك وتقييماتهم أفضل مكان لتعرف كيف تعيش السيارة يوماً بيوم.',
          },
    ],
    cta: { label: { en: 'Open your account', ar: 'افتح حسابك' }, url: pageUrl('account') },
  }
}

export function postDecisionEmail(input: { status: Decision; title: string; slug: string; note?: string }): EmailContent {
  const ok = input.status === 'approved'
  return {
    tag: `post-${input.status}`,
    subject: ok
      ? { en: 'Your post is live', ar: 'تم نشر مقالك' }
      : { en: 'Your post needs another look', ar: 'مقالك يحتاج مراجعة' },
    preheader: { en: input.title, ar: input.title },
    image: ok ? 'hero' : 'rear',
    badge: decided(input.status),
    heading: ok
      ? { en: 'Your post is on the road', ar: 'مقالك انطلق' }
      : { en: 'Your post was not published', ar: 'لم يتم نشر مقالك' },
    paragraphs: ok
      ? [
          {
            en: `“${input.title}” is now published in Owner Posts. Every owner on the site can read it, and they will hear about it by email.`,
            ar: `"${input.title}" منشور الآن في مقالات الملاك. يستطيع كل الملاك قراءته، وسيصلهم إشعار به بالبريد.`,
          },
        ]
      : [
          {
            en: `“${input.title}” was not published this time. You can edit it from your account and send it again.`,
            ar: `"${input.title}" لم يُنشر هذه المرة. يمكنك تعديله من حسابك وإرساله مرة أخرى.`,
          },
        ],
    quote: noteQuote(input.note),
    cta: ok
      ? { label: { en: 'Read your post', ar: 'اقرأ مقالك' }, url: pageUrl(`blog/${encodeURIComponent(input.slug)}`) }
      : { label: { en: 'Edit your post', ar: 'عدّل مقالك' }, url: pageUrl('account/posts') },
  }
}

export function commentDecisionEmail(input: {
  status: Decision
  postTitle: string
  postId: string
  note?: string
}): EmailContent {
  const ok = input.status === 'approved'
  return {
    tag: `comment-${input.status}`,
    subject: ok ? { en: 'Your comment is live', ar: 'تم نشر تعليقك' } : { en: 'About your comment', ar: 'بخصوص تعليقك' },
    preheader: { en: input.postTitle, ar: input.postTitle },
    image: 'cabin',
    badge: decided(input.status),
    heading: ok ? { en: 'You joined the conversation', ar: 'أصبحت جزءاً من النقاش' } : { en: 'Your comment was not published', ar: 'لم يتم نشر تعليقك' },
    paragraphs: [
      ok
        ? {
            en: `Your comment on “${input.postTitle}” is now visible to everyone.`,
            ar: `تعليقك على "${input.postTitle}" أصبح ظاهراً للجميع.`,
          }
        : {
            en: `Your comment on “${input.postTitle}” was not published.`,
            ar: `تعليقك على "${input.postTitle}" لم يُنشر.`,
          },
    ],
    quote: noteQuote(input.note),
    cta: { label: { en: 'Go to the post', ar: 'اذهب إلى المقال' }, url: pageUrl(`blog/${input.postId}`) },
  }
}

export function questionDecisionEmail(input: { status: Decision; title: string; id: string; note?: string }): EmailContent {
  const ok = input.status === 'approved'
  return {
    tag: `question-${input.status}`,
    subject: ok ? { en: 'Your question is live', ar: 'تم نشر سؤالك' } : { en: 'About your question', ar: 'بخصوص سؤالك' },
    preheader: { en: input.title, ar: input.title },
    image: 'screen',
    badge: decided(input.status),
    heading: ok ? { en: 'Owners can answer you now', ar: 'يستطيع الملاك الإجابة عليك الآن' } : { en: 'Your question was not published', ar: 'لم يتم نشر سؤالك' },
    paragraphs: [
      ok
        ? {
            en: `“${input.title}” is published in Questions & Answers. We will email you when someone answers.`,
            ar: `"${input.title}" منشور الآن في الأسئلة والأجوبة. سنراسلك عندما يجيب أحد.`,
          }
        : {
            en: `“${input.title}” was not published. You can ask it again with more detail.`,
            ar: `"${input.title}" لم يُنشر. يمكنك طرحه مرة أخرى بتفاصيل أكثر.`,
          },
    ],
    quote: noteQuote(input.note),
    cta: ok
      ? { label: { en: 'Open your question', ar: 'افتح سؤالك' }, url: pageUrl(`questions/${input.id}`) }
      : { label: { en: 'Ask again', ar: 'اسأل مرة أخرى' }, url: pageUrl('questions') },
  }
}

export function answerDecisionEmail(input: { status: Decision; questionTitle: string; questionId: string; note?: string }): EmailContent {
  const ok = input.status === 'approved'
  return {
    tag: `answer-${input.status}`,
    subject: ok ? { en: 'Your answer is live', ar: 'تم نشر إجابتك' } : { en: 'About your answer', ar: 'بخصوص إجابتك' },
    preheader: { en: input.questionTitle, ar: input.questionTitle },
    image: 'cabin',
    badge: decided(input.status),
    heading: ok ? { en: 'Thanks for helping another owner', ar: 'شكراً لمساعدتك مالكاً آخر' } : { en: 'Your answer was not published', ar: 'لم يتم نشر إجابتك' },
    paragraphs: [
      ok
        ? {
            en: `Your answer to “${input.questionTitle}” is now visible to everyone.`,
            ar: `إجابتك على "${input.questionTitle}" أصبحت ظاهرة للجميع.`,
          }
        : {
            en: `Your answer to “${input.questionTitle}” was not published.`,
            ar: `إجابتك على "${input.questionTitle}" لم تُنشر.`,
          },
    ],
    quote: noteQuote(input.note),
    cta: { label: { en: 'Go to the question', ar: 'اذهب إلى السؤال' }, url: pageUrl(`questions/${input.questionId}`) },
  }
}

/** To whoever asked, when someone else's answer is published. */
export function newAnswerEmail(input: { questionTitle: string; questionId: string; answerAuthor: string; excerpt: string }): EmailContent {
  return {
    tag: 'question-answered',
    subject: { en: 'Your question has an answer', ar: 'سؤالك له إجابة' },
    preheader: { en: input.questionTitle, ar: input.questionTitle },
    image: 'screen',
    badge: { label: { en: 'New answer', ar: 'إجابة جديدة' }, tone: 'info' },
    heading: { en: `${input.answerAuthor} answered you`, ar: `${input.answerAuthor} أجاب على سؤالك` },
    paragraphs: [
      {
        en: `There is a new answer to “${input.questionTitle}”. If it solves it, mark it as the answer so other owners find it first.`,
        ar: `هناك إجابة جديدة على "${input.questionTitle}". إذا حلّت مشكلتك، علّمها كإجابة معتمدة ليجدها الملاك الآخرون أولاً.`,
      },
    ],
    quote: { label: { en: 'The answer', ar: 'الإجابة' }, text: input.excerpt },
    cta: { label: { en: 'Read the answer', ar: 'اقرأ الإجابة' }, url: pageUrl(`questions/${input.questionId}`) },
  }
}

export function suggestionDecisionEmail(input: { status: Decision; proposed: string; note?: string }): EmailContent {
  const ok = input.status === 'approved'
  return {
    tag: `suggestion-${input.status}`,
    subject: ok ? { en: 'Your correction was accepted', ar: 'تم قبول تصحيحك' } : { en: 'About your correction', ar: 'بخصوص تصحيحك' },
    preheader: { en: 'Thanks for keeping the guide accurate.', ar: 'شكراً لمساعدتك في دقة الدليل.' },
    image: 'screen',
    badge: decided(input.status),
    heading: ok ? { en: 'You made the guide better', ar: 'ساهمت في تحسين الدليل' } : { en: 'We kept the guide as it is', ar: 'أبقينا الدليل كما هو' },
    paragraphs: [
      ok
        ? {
            en: 'A moderator checked your correction and agreed. It will be written into the guide in the next update.',
            ar: 'راجع أحد المشرفين تصحيحك ووافق عليه. سيُضاف إلى الدليل في التحديث القادم.',
          }
        : {
            en: 'A moderator checked your correction and decided not to change the guide this time. Thank you for taking the time.',
            ar: 'راجع أحد المشرفين تصحيحك وقرر عدم تغيير الدليل هذه المرة. شكراً على وقتك.',
          },
    ],
    quote: noteQuote(input.note) ?? { label: { en: 'Your correction', ar: 'تصحيحك' }, text: input.proposed.slice(0, 400) },
    cta: { label: { en: 'Open the guide', ar: 'افتح الدليل' }, url: siteUrl() },
  }
}

const REVIEW_PLACES: Record<string, { noun: Lang; path: string }> = {
  part: { noun: { en: 'accessory', ar: 'الإكسسوار' }, path: 'accessories' },
  center: { noun: { en: 'protection center', ar: 'مركز الحماية' }, path: 'protection' },
  insurer: { noun: { en: 'insurance company', ar: 'شركة التأمين' }, path: 'insurance' },
  installer: { noun: { en: 'charger installer', ar: 'شركة تركيب الشواحن' }, path: 'charging/installers' },
}

export function reviewDecisionEmail(input: {
  status: Decision
  kind: string
  targetName: string
  targetSlug: string
  note?: string
}): EmailContent {
  const ok = input.status === 'approved'
  const place = REVIEW_PLACES[input.kind] ?? REVIEW_PLACES.part!
  return {
    tag: `review-${input.status}`,
    subject: ok ? { en: 'Your review is live', ar: 'تم نشر تقييمك' } : { en: 'About your review', ar: 'بخصوص تقييمك' },
    preheader: { en: input.targetName, ar: input.targetName },
    image: ok ? 'hero' : 'rear',
    badge: decided(input.status),
    heading: ok ? { en: 'Your stars are on the board', ar: 'تقييمك أصبح ظاهراً' } : { en: 'Your review was not published', ar: 'لم يتم نشر تقييمك' },
    paragraphs: [
      ok
        ? {
            en: `Your review of the ${place.noun.en} “${input.targetName}” is published and counts toward its rating. Other owners will thank you.`,
            ar: `تقييمك لـ${place.noun.ar} "${input.targetName}" منشور ويُحتسب في تقييمه. الملاك الآخرون سيشكرونك.`,
          }
        : {
            en: `Your review of the ${place.noun.en} “${input.targetName}” was not published.`,
            ar: `تقييمك لـ${place.noun.ar} "${input.targetName}" لم يُنشر.`,
          },
    ],
    quote: noteQuote(input.note),
    cta: { label: { en: 'See the listing', ar: 'شاهد الصفحة' }, url: pageUrl(`${place.path}/${encodeURIComponent(input.targetSlug)}`) },
  }
}

const ORDER_STATUS: Record<string, { label: Lang; tone: Tone; heading: Lang; line: Lang; image: EmailImage }> = {
  new: {
    label: { en: 'Received', ar: 'تم الاستلام' },
    tone: 'info',
    heading: { en: 'We have your request', ar: 'وصلنا طلبك' },
    line: { en: 'The team will check prices and availability and get back to you.', ar: 'سيراجع الفريق الأسعار والتوفر ويتواصل معك.' },
    image: 'cabin',
  },
  confirmed: {
    label: { en: 'Confirmed', ar: 'تم التأكيد' },
    tone: 'ok',
    heading: { en: 'Your request is confirmed', ar: 'تم تأكيد طلبك' },
    line: { en: 'Prices and availability are checked. We will order your accessories next.', ar: 'تمت مراجعة الأسعار والتوفر. الخطوة التالية طلب الإكسسوارات.' },
    image: 'cabin',
  },
  ordered: {
    label: { en: 'Ordered', ar: 'تم الطلب' },
    tone: 'info',
    heading: { en: 'Your accessories are on their way to us', ar: 'إكسسواراتك في الطريق إلينا' },
    line: { en: 'We have ordered them from the supplier.', ar: 'طلبناها من المورد.' },
    image: 'rear',
  },
  arrived: {
    label: { en: 'Arrived', ar: 'وصل' },
    tone: 'ok',
    heading: { en: 'Your accessories have arrived', ar: 'وصلت إكسسواراتك' },
    line: { en: 'Everything is here. We will contact you to arrange delivery or fitting.', ar: 'كل شيء وصل. سنتواصل معك لترتيب التسليم أو التركيب.' },
    image: 'hero',
  },
  delivered: {
    label: { en: 'Delivered', ar: 'تم التسليم' },
    tone: 'ok',
    heading: { en: 'Enjoy the upgrade', ar: 'استمتع بالإضافة الجديدة' },
    line: { en: 'Your request is complete. A review of what you bought helps the next owner.', ar: 'اكتمل طلبك. تقييمك لما اشتريته يساعد المالك التالي.' },
    image: 'hero',
  },
  cancelled: {
    label: { en: 'Cancelled', ar: 'تم الإلغاء' },
    tone: 'no',
    heading: { en: 'Your request was cancelled', ar: 'تم إلغاء طلبك' },
    line: { en: 'Nothing more will happen with this request.', ar: 'لن يتم أي إجراء آخر على هذا الطلب.' },
    image: 'rear',
  },
}

const egp = (amount: number) => `${amount.toLocaleString('en-US')} EGP`

export function orderEmail(input: {
  number: string
  status: string
  itemCount: number
  totalEgp?: number
  agreedTotal: boolean
  note?: string
}): EmailContent {
  const status = ORDER_STATUS[input.status] ?? ORDER_STATUS.new!
  const details = [
    { label: { en: 'Request', ar: 'رقم الطلب' }, value: input.number },
    { label: { en: 'Status', ar: 'الحالة' }, value: `${status.label.en} · ${status.label.ar}` },
    { label: { en: 'Items', ar: 'عدد القطع' }, value: String(input.itemCount) },
  ]
  if (input.totalEgp) {
    details.push({
      label: input.agreedTotal ? { en: 'Agreed total', ar: 'الإجمالي المتفق عليه' } : { en: 'Estimated total', ar: 'الإجمالي التقديري' },
      value: egp(input.totalEgp),
    })
  }

  return {
    tag: `order-${input.status}`,
    subject: { en: `${input.number}: ${status.label.en}`, ar: `${input.number}: ${status.label.ar}` },
    preheader: status.line,
    image: status.image,
    badge: { label: status.label, tone: status.tone },
    heading: status.heading,
    paragraphs: [status.line],
    quote: input.note ? { label: { en: 'Message from the team', ar: 'رسالة من الفريق' }, text: input.note } : undefined,
    details,
    cta: { label: { en: 'Track your request', ar: 'تابع طلبك' }, url: pageUrl('account/orders') },
  }
}

export function newPostEmail(input: { title: string; excerpt: string; authorName: string; slug: string }): EmailContent {
  return {
    tag: 'new-post',
    subject: { en: `New owner post: ${input.title}`, ar: 'مقال جديد من الملاك' },
    preheader: { en: `${input.authorName} just posted.`, ar: `${input.authorName} نشر للتو.` },
    image: 'screen',
    badge: { label: { en: 'New owner post', ar: 'مقال جديد' }, tone: 'info' },
    heading: { en: input.title, ar: input.title },
    paragraphs: [
      {
        en: `${input.authorName} shared something new with the V27 community.`,
        ar: `${input.authorName} شارك شيئاً جديداً مع مجتمع V27.`,
      },
    ],
    quote: input.excerpt ? { label: { en: 'A taste', ar: 'مقتطف' }, text: `${input.excerpt.slice(0, 280)}…` } : undefined,
    cta: { label: { en: 'Read the post', ar: 'اقرأ المقال' }, url: pageUrl(`blog/${encodeURIComponent(input.slug)}`) },
  }
}

/** The photos an announcement may lead with. */
export const EMAIL_IMAGES: EmailImage[] = ['hero', 'cabin', 'screen', 'rear']

export type Announcement = {
  image: EmailImage
  subject: Lang
  heading: Lang
  body: Lang
  cta?: { label: Lang; url: string }
}

/** A message an admin writes in the panel, to everyone or to one person. */
export function announcementEmail(input: Announcement): EmailContent {
  return {
    tag: 'announcement',
    subject: input.subject,
    preheader: { en: firstLine(input.body.en), ar: firstLine(input.body.ar) },
    image: input.image,
    badge: { label: { en: 'From the team', ar: 'من فريق الدليل' }, tone: 'info' },
    heading: input.heading,
    // Blank lines separate paragraphs, the way people write in a textarea.
    paragraphs: paragraphsOf(input.body),
    cta: input.cta,
  }
}

const firstLine = (text: string) => (text.trim().split('\n')[0] ?? '').slice(0, 120)

function paragraphsOf(body: Lang): Lang[] {
  const split = (text: string) => text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  const en = split(body.en)
  const ar = split(body.ar)
  return Array.from({ length: Math.max(en.length, ar.length) }, (_, index) => ({ en: en[index] ?? '', ar: ar[index] ?? '' }))
}
