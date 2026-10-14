import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, Clock, FlaskConical, Mail, Monitor, Send, Smartphone, Users } from 'lucide-react'
import { Card, EmptyState, PageHeader, StatCard } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { Segmented } from '../../components/Segmented'
import { useShortText } from '../../i18n/languageContext'
import {
  api,
  type AnnouncementInput,
  type ApiEmailStatus,
  type ApiEmailTemplate,
  type EmailImage,
  type EmailSource,
} from '../../lib/api'
import { errorMessage } from '../../lib/errors'

/**
 * Everything about the emails the site sends: how much of today's Brevo
 * allowance is used, a preview of every built-in email with a button to send
 * yourself a test, and a composer for announcements.
 */
export function Emails() {
  const tx = useShortText()
  const toast = useToast()
  const [status, setStatus] = useState<ApiEmailStatus | null>(null)
  const [tab, setTab] = useState<'templates' | 'compose'>('templates')
  const [draining, setDraining] = useState(false)

  const loadStatus = useCallback(() => {
    api
      .emailStatus()
      .then(({ status: next }) => setStatus(next))
      .catch((caught) => toast(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.')), 'error'))
  }, [toast, tx])

  useEffect(loadStatus, [loadStatus])

  const waiting = status ? status.waiting.transactional + status.waiting.broadcast : 0

  async function drain() {
    setDraining(true)
    try {
      const result = await api.drainEmails()
      setStatus(result.status)
      if (result.error) {
        toast(tx(`Brevo refused: ${result.error}`, `رفض Brevo: ${result.error}`), 'error')
        return
      }
      toast(
        result.deferred > 0
          ? tx(`Sent ${result.sent}. ${result.deferred} wait for tomorrow.`, `تم إرسال ${result.sent}. ${result.deferred} تنتظر الغد.`)
          : tx(`Sent ${result.sent}.`, `تم إرسال ${result.sent}.`),
      )
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')), 'error')
    } finally {
      setDraining(false)
    }
  }

  return (
    <>
      <PageHeader
        description={tx(
          'Brevo’s free plan sends 300 emails a day. New-post emails and announcements may use 200 of them, so replies people are waiting for always have room. Anything over the limit goes out the next morning.',
          'خطة Brevo المجانية ترسل 300 رسالة يوميا. رسائل المقالات الجديدة والإعلانات تستخدم 200 منها كحد أقصى، لتبقى مساحة دائما للردود. ما يزيد عن الحد يُرسل صباح اليوم التالي.',
        )}
        actions={
          waiting > 0 && (
            <button type="button" className="panel-button" onClick={drain} disabled={draining}>
              <Clock size={16} aria-hidden="true" />
              {draining ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send waiting emails now', 'أرسل الرسائل المنتظرة الآن')}
            </button>
          )
        }
      />

      {status && !status.configured && (
        <div className="email-warning" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          {tx(
            'Email is not set up yet: add BREVO_API_KEY and EMAIL_FROM in Vercel and redeploy. Previews still work.',
            'البريد غير مُعد بعد: أضف BREVO_API_KEY و EMAIL_FROM في Vercel وأعد النشر. المعاينة تعمل.',
          )}
        </div>
      )}

      {status?.lastError && (
        <div className="email-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            {tx('Brevo refused the last email it was given:', 'رفض Brevo آخر رسالة أُرسلت إليه:')} <code dir="ltr">{status.lastError}</code>
          </span>
        </div>
      )}

      <div className="panel-grid stats">
        <StatCard
          icon={Mail}
          label={tx('Sent today', 'أُرسل اليوم')}
          value={status ? `${status.sentToday} / ${status.dailyLimit}` : null}
          tone="accent"
        />
        <StatCard
          icon={Send}
          label={tx('Posts and announcements today', 'المقالات والإعلانات اليوم')}
          value={status ? `${status.broadcastToday} / ${status.broadcastDailyLimit}` : null}
        />
        <StatCard
          icon={Clock}
          label={tx('Waiting for tomorrow', 'تنتظر الغد')}
          value={status ? waiting : null}
          tone={waiting > 0 ? 'warn' : 'neutral'}
          hint={status?.failed ? tx(`${status.failed} failed`, `${status.failed} فشلت`) : undefined}
        />
        <StatCard
          icon={Users}
          label={tx('Get announcements', 'يستقبلون الإعلانات')}
          value={status ? status.subscribers : null}
          tone="info"
        />
      </div>

      <Segmented
        label={tx('Section', 'القسم')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'templates', label: tx('Site emails', 'رسائل الموقع') },
          { value: 'compose', label: tx('Write an announcement', 'اكتب إعلانا') },
        ]}
      />

      {tab === 'templates' ? <Templates /> : <Compose status={status} onSent={loadStatus} />}
    </>
  )
}

/* ---------- the built-in emails ---------- */

function Templates() {
  const tx = useShortText()
  const toast = useToast()
  const [templates, setTemplates] = useState<ApiEmailTemplate[] | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api
      .emailTemplates()
      .then(({ templates: list }) => {
        setTemplates(list)
        setSelected((current) => current || list[0]?.key || '')
      })
      .catch((caught) => {
        setTemplates([])
        toast(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.')), 'error')
      })
  }, [toast, tx])

  const source = useMemo<EmailSource | null>(() => (selected ? { template: selected } : null), [selected])
  const current = templates?.find((item) => item.key === selected)

  const groups = useMemo(() => {
    const map = new Map<string, ApiEmailTemplate[]>()
    for (const item of templates ?? []) map.set(item.group, [...(map.get(item.group) ?? []), item])
    return [...map.entries()]
  }, [templates])

  async function sendTest() {
    if (!source) return
    setSending(true)
    try {
      const result = await api.sendTestEmail(source)
      toast(result.outcome === 'sent' ? tx(`Test sent to ${result.to}.`, `أُرسلت التجربة إلى ${result.to}.`) : result.message, result.outcome === 'sent' ? 'success' : result.outcome === 'failed' ? 'error' : 'info')
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')), 'error')
    } finally {
      setSending(false)
    }
  }

  if (templates && templates.length === 0) {
    return <EmptyState icon={Mail} title={tx('No emails to show', 'لا توجد رسائل للعرض')} />
  }

  return (
    <div className="email-layout">
      <Card title={tx('Emails the site sends', 'الرسائل التي يرسلها الموقع')} flush>
        <nav className="email-list" aria-label={tx('Emails', 'الرسائل')}>
          {groups.map(([group, items]) => (
            <div key={group}>
              <h4>{group}</h4>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-current={item.key === selected}
                  onClick={() => setSelected(item.key)}
                >
                  <span>{item.name}</span>
                  <small>{item.when}</small>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </Card>

      <Card
        title={current?.name ?? tx('Preview', 'معاينة')}
        description={current?.when}
        action={
          <button type="button" className="panel-button primary" onClick={sendTest} disabled={!source || sending}>
            <FlaskConical size={16} aria-hidden="true" />
            {sending ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send me a test', 'أرسل لي تجربة')}
          </button>
        }
      >
        <EmailPreview source={source} />
      </Card>
    </div>
  )
}

/* ---------- the preview frame ---------- */

/**
 * Renders on the server, so what is shown is byte for byte what is sent.
 * An announcement is re-rendered shortly after typing stops.
 */
function EmailPreview({ source, delay = 0 }: { source: EmailSource | null; delay?: number }) {
  const tx = useShortText()
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop')
  const frame = useRef<HTMLIFrameElement>(null)
  const key = source ? JSON.stringify(source) : ''

  useEffect(() => {
    if (!key) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      api
        .previewEmail(JSON.parse(key) as EmailSource)
        .then((result) => {
          if (cancelled) return
          setPreview(result)
          setError(null)
        })
        .catch((caught) => !cancelled && setError(errorMessage(caught, tx('Could not render.', 'تعذر العرض.'))))
    }, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [key, delay, tx])

  // While typing, the last render stays up rather than flashing empty; with nothing written, nothing shows.
  const shown = key ? preview : null

  /** The frame grows to the email's height, so the page scrolls instead of the frame. */
  const fit = useCallback(() => {
    const doc = frame.current?.contentDocument
    if (frame.current && doc?.documentElement) frame.current.style.height = `${doc.documentElement.scrollHeight + 4}px`
  }, [])

  return (
    <div className="email-preview">
      <div className="email-preview-bar">
        <div className="email-inbox">
          <small>{tx('Subject', 'الموضوع')}</small>
          <strong dir="auto">{shown?.subject ?? '—'}</strong>
        </div>
        <Segmented
          label={tx('Preview width', 'عرض المعاينة')}
          value={width}
          onChange={(next) => {
            setWidth(next)
            window.setTimeout(fit, 50)
          }}
          options={[
            { value: 'desktop', label: <Monitor size={16} aria-hidden="true" />, title: tx('Desktop', 'كمبيوتر') },
            { value: 'phone', label: <Smartphone size={16} aria-hidden="true" />, title: tx('Phone', 'هاتف') },
          ]}
        />
      </div>

      {key && error && <p className="form-error">{error}</p>}

      <div className={`email-stage ${width}`}>
        {shown ? (
          <iframe
            ref={frame}
            title={tx('Email preview', 'معاينة الرسالة')}
            srcDoc={shown.html}
            sandbox="allow-same-origin"
            onLoad={() => {
              fit()
              frame.current?.contentDocument?.querySelectorAll('img').forEach((image) => image.addEventListener('load', fit))
            }}
          />
        ) : (
          <p className="panel-muted email-placeholder">
            {source ? tx('Rendering…', 'جارٍ العرض…') : tx('Write a heading and a message to see the email.', 'اكتب عنوانا ورسالة لترى البريد.')}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------- announcements ---------- */

const PHOTOS: { value: EmailImage; label: { en: string; ar: string } }[] = [
  { value: 'hero', label: { en: 'Sunset drive', ar: 'قيادة الغروب' } },
  { value: 'rear', label: { en: 'Off-road', ar: 'الطرق الوعرة' } },
  { value: 'cabin', label: { en: 'Cabin', ar: 'المقصورة' } },
  { value: 'screen', label: { en: 'Tech', ar: 'التقنية' } },
]

const photoUrl = (image: EmailImage) => `${import.meta.env.BASE_URL}email/${image}.jpg`

const empty = { en: '', ar: '' }

function Compose({ status, onSent }: { status: ApiEmailStatus | null; onSent: () => void }) {
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()

  const [image, setImage] = useState<EmailImage>('hero')
  const [subject, setSubject] = useState(empty)
  const [heading, setHeading] = useState(empty)
  const [body, setBody] = useState(empty)
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState(empty)
  const [audience, setAudience] = useState<'all' | 'one'>('all')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'test' | 'send' | null>(null)

  const announcement: AnnouncementInput = { image, subject, heading, body, ctaUrl: ctaUrl.trim() || undefined, ctaLabel }
  const written = Boolean((heading.en.trim() && body.en.trim()) || (heading.ar.trim() && body.ar.trim()))
  const source = useMemo<EmailSource | null>(
    () => (written ? { announcement: { image, subject, heading, body, ctaUrl: ctaUrl.trim() || undefined, ctaLabel } } : null),
    [written, image, subject, heading, body, ctaUrl, ctaLabel],
  )

  async function sendTest() {
    setBusy('test')
    try {
      const result = await api.sendTestEmail({ announcement })
      toast(result.outcome === 'sent' ? tx(`Test sent to ${result.to}.`, `أُرسلت التجربة إلى ${result.to}.`) : result.message, result.outcome === 'sent' ? 'success' : result.outcome === 'failed' ? 'error' : 'info')
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()

    if (audience === 'all') {
      const people = status?.subscribers ?? 0
      const room = status ? Math.max(0, Math.min(status.broadcastDailyLimit - status.broadcastToday, status.dailyLimit - status.sentToday)) : 0
      const today = Math.min(people, room)
      const ok = await confirm({
        title: tx(`Email ${people} people?`, `إرسال إلى ${people} شخص؟`),
        message:
          people > today
            ? tx(
                `${today} get it today and the other ${people - today} over the next days, up to 200 a day. This cannot be undone.`,
                `${today} يستلمونها اليوم والباقي ${people - today} خلال الأيام التالية، بحد 200 يوميا. لا يمكن التراجع.`,
              )
            : tx('Everyone gets it now. This cannot be undone.', 'سيستلمها الجميع الآن. لا يمكن التراجع.'),
        confirmLabel: tx('Send to everyone', 'أرسل للجميع'),
      })
      if (!ok) return
    }

    setBusy('send')
    try {
      const result =
        audience === 'all'
          ? await api.sendAnnouncement({ announcement, audience: 'all' })
          : await api.sendAnnouncement({ announcement, audience: 'one', email: email.trim() })

      if (audience === 'all') {
        const later = result.recipients - (result.sentNow ?? 0)
        toast(
          later > 0
            ? tx(`Sent to ${result.sentNow}. ${later} more go out over the next days.`, `أُرسلت إلى ${result.sentNow}. و${later} خلال الأيام القادمة.`)
            : tx(`Sent to ${result.recipients} people.`, `أُرسلت إلى ${result.recipients} شخص.`),
          'success',
        )
      } else {
        toast(result.outcome === 'sent' ? tx(`Sent to ${email.trim()}.`, `أُرسلت إلى ${email.trim()}.`) : (result.message ?? ''), result.outcome === 'sent' ? 'success' : result.outcome === 'failed' ? 'error' : 'info')
      }
      onSent()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')), 'error')
    } finally {
      setBusy(null)
    }
  }

  const side = (value: { en: string; ar: string }, set: (next: { en: string; ar: string }) => void, lang: 'en' | 'ar', text: string) => {
    set({ ...value, [lang]: text })
  }

  return (
    <div className="email-layout compose">
      <Card title={tx('Your message', 'رسالتك')} description={tx('Write it in English, Arabic, or both. Leave a blank line between paragraphs.', 'اكتبها بالإنجليزية أو العربية أو كليهما. اترك سطرا فارغا بين الفقرات.')}>
        <form className="auth-form wide panel-form" onSubmit={onSubmit}>
          <fieldset className="email-photos">
            <legend>{tx('Photo', 'الصورة')}</legend>
            {PHOTOS.map((photo) => (
              <label key={photo.value} className={image === photo.value ? 'active' : undefined}>
                <input type="radio" name="email-photo" value={photo.value} checked={image === photo.value} onChange={() => setImage(photo.value)} />
                <img src={photoUrl(photo.value)} alt="" />
                <span>{tx(photo.label.en, photo.label.ar)}</span>
              </label>
            ))}
          </fieldset>

          {(['en', 'ar'] as const).map((lang) => (
            <fieldset key={lang} className="email-language" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <legend>{lang === 'en' ? 'English' : 'العربية'}</legend>
              <label>
                <span>{lang === 'en' ? 'Heading' : 'العنوان'}</span>
                <input id={`email-heading-${lang}`} value={heading[lang]} onChange={(e) => side(heading, setHeading, lang, e.target.value)} maxLength={150} />
              </label>
              <label>
                <span>{lang === 'en' ? 'Message' : 'الرسالة'}</span>
                <textarea id={`email-body-${lang}`} rows={6} value={body[lang]} onChange={(e) => side(body, setBody, lang, e.target.value)} maxLength={5000} />
              </label>
              <label>
                <span>{lang === 'en' ? 'Subject line (optional)' : 'سطر الموضوع (اختياري)'}</span>
                <input
                  id={`email-subject-${lang}`}
                  value={subject[lang]}
                  onChange={(e) => side(subject, setSubject, lang, e.target.value)}
                  maxLength={150}
                  placeholder={lang === 'en' ? 'Same as the heading' : 'نفس العنوان'}
                />
              </label>
            </fieldset>
          ))}

          <fieldset className="email-language">
            <legend>{tx('Button (optional)', 'زر (اختياري)')}</legend>
            <label>
              <span>{tx('Link', 'الرابط')}</span>
              <input id="email-cta-url" type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://khalidfathyfl.github.io/icaur-v27-guide/#/blog" dir="ltr" />
            </label>
            {ctaUrl.trim() && (
              <div className="panel-form-grid">
                <label>
                  <span>Button text</span>
                  <input id="email-cta-en" value={ctaLabel.en} onChange={(e) => side(ctaLabel, setCtaLabel, 'en', e.target.value)} maxLength={40} placeholder="Open the guide" />
                </label>
                <label dir="rtl">
                  <span>نص الزر</span>
                  <input id="email-cta-ar" value={ctaLabel.ar} onChange={(e) => side(ctaLabel, setCtaLabel, 'ar', e.target.value)} maxLength={40} placeholder="افتح الدليل" />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="email-language">
            <legend>{tx('Send to', 'أرسل إلى')}</legend>
            <Segmented
              label={tx('Send to', 'أرسل إلى')}
              value={audience}
              onChange={setAudience}
              options={[
                { value: 'all', label: tx(`Everyone (${status?.subscribers ?? '…'})`, `الجميع (${status?.subscribers ?? '…'})`) },
                { value: 'one', label: tx('One person', 'شخص واحد') },
              ]}
            />
            {audience === 'one' ? (
              <label>
                <span>{tx('Their account email', 'بريد حسابه')}</span>
                <input id="email-one" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </label>
            ) : (
              <small className="panel-muted">
                {tx(
                  'Goes to everyone who has not turned off new-post emails, with a link to stop them.',
                  'تصل لكل من لم يوقف رسائل المقالات الجديدة، مع رابط لإيقافها.',
                )}
              </small>
            )}
          </fieldset>

          <div className="panel-form-actions">
            <button type="button" className="panel-button" onClick={sendTest} disabled={!written || busy !== null}>
              <FlaskConical size={16} aria-hidden="true" />
              {busy === 'test' ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send me a test', 'أرسل لي تجربة')}
            </button>
            <button type="submit" className="panel-button primary" disabled={!written || busy !== null || (audience === 'one' && !email.trim())}>
              <Send size={16} aria-hidden="true" className="flip-rtl" />
              {busy === 'send' ? tx('Sending…', 'جارٍ الإرسال…') : audience === 'all' ? tx('Send to everyone', 'أرسل للجميع') : tx('Send', 'أرسل')}
            </button>
          </div>
        </form>
      </Card>

      <Card title={tx('Preview', 'معاينة')} description={tx('Exactly what people receive. It updates as you type.', 'تماما كما يستلمها الناس. تتحدث أثناء الكتابة.')}>
        <EmailPreview source={source} delay={500} />
      </Card>
    </div>
  )
}
