import { useState, type FormEvent } from 'react'
import { FileEdit, PenLine } from 'lucide-react'
import { Card } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import { RichTextEditor } from '../../components/editor/RichTextEditor'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { features } from '../../content'
import { api, type SuggestionTarget } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

export function PostComposer() {
  const tx = useShortText()
  const toast = useToast()
  const [titleEn, setTitleEn] = useState('')
  const [titleAr, setTitleAr] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [bodyAr, setBodyAr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      const { post } = await api.createPost({
        title: { en: titleEn, ar: titleAr },
        body: { en: bodyEn, ar: bodyAr },
      })
      toast(
        post.status === 'approved'
          ? tx('Published. Thank you.', 'تم النشر. شكرا لك.')
          : tx('Sent for review. Thank you.', 'تم الإرسال للمراجعة. شكرا لك.'),
      )
      window.location.hash = '#/account/posts'
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')))
      setBusy(false)
    }
  }

  return (
    <Card>
      <form className="auth-form wide panel-form" onSubmit={onSubmit}>
        <div className="panel-form-grid">
          <label>
            <span>{tx('Title (English)', 'العنوان (إنجليزي)')}</span>
            <input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} required maxLength={200} />
          </label>

          <label>
            <span>{tx('Title (Arabic)', 'العنوان (عربي)')}</span>
            <input value={titleAr} onChange={(event) => setTitleAr(event.target.value)} maxLength={200} dir="rtl" />
          </label>
        </div>

        <div className="editor-field">
          <span className="editor-label">{tx('Post (English)', 'المقال (إنجليزي)')}</span>
          <RichTextEditor value={bodyEn} onChange={setBodyEn} />
        </div>

        <div className="editor-field">
          <span className="editor-label">{tx('Post (Arabic)', 'المقال (عربي)')}</span>
          <RichTextEditor value={bodyAr} onChange={setBodyAr} dir="rtl" />
          <small className="editor-hint">
            {tx(
              'Write whichever language you are comfortable in. An admin can fill in the other side.',
              'اكتب باللغة التي تريحك، ويمكن للمشرف إكمال اللغة الأخرى.',
            )}
          </small>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="panel-form-actions">
          <button className="panel-button primary" type="submit" disabled={busy}>
            <PenLine size={16} aria-hidden="true" />
            {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send for review', 'أرسل للمراجعة')}
          </button>
        </div>
      </form>
    </Card>
  )
}

export function SuggestionComposer() {
  const { t } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const [kind, setKind] = useState<SuggestionTarget['kind']>('feature')
  const [targetId, setTargetId] = useState(features[0]?.slug ?? '')
  const [field, setField] = useState('')
  const [current, setCurrent] = useState('')
  const [proposed, setProposed] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      await api.createSuggestion({
        target: { kind, id: targetId, field: field || undefined },
        current,
        proposed,
        reason,
      })
      toast(tx('Sent for review. Thank you.', 'تم الإرسال للمراجعة. شكرا لك.'))
      window.location.hash = '#/account/suggestions'
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not send.', 'تعذر الإرسال.')))
      setBusy(false)
    }
  }

  return (
    <Card>
      <form className="auth-form wide panel-form" onSubmit={onSubmit}>
        <div className="panel-form-grid">
          <label>
            <span>{tx('What is this about?', 'عن ماذا هذا التصحيح؟')}</span>
            <select
              value={kind}
              onChange={(event) => {
                const next = event.target.value as SuggestionTarget['kind']
                setKind(next)
                setTargetId(next === 'feature' ? (features[0]?.slug ?? '') : '')
              }}
            >
              <option value="feature">{tx('A guide', 'دليل')}</option>
              <option value="spec">{tx('A specification', 'مواصفة')}</option>
              <option value="equipment">{tx('Trim equipment', 'تجهيزات الفئة')}</option>
              <option value="dealer">{tx('A dealer', 'وكيل')}</option>
              <option value="other">{tx('Something else', 'شيء آخر')}</option>
            </select>
          </label>

          <label>
            <span>{tx('Which one?', 'أي واحد؟')}</span>
            {kind === 'feature' ? (
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                {features.map((feature) => (
                  <option key={feature.slug} value={feature.slug}>
                    {t(feature.name)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                required
                maxLength={200}
                placeholder={tx('e.g. Ground clearance', 'مثال: الخلوص الأرضي')}
              />
            )}
          </label>
        </div>

        <label>
          <span>{tx('Field (optional)', 'الحقل (اختياري)')}</span>
          <input
            value={field}
            onChange={(event) => setField(event.target.value)}
            maxLength={200}
            placeholder={tx('e.g. Safety notes', 'مثال: ملاحظات السلامة')}
          />
        </label>

        <div className="panel-form-grid">
          <label>
            <span>{tx('What the site says now', 'ما يقوله الموقع الآن')}</span>
            <textarea value={current} onChange={(event) => setCurrent(event.target.value)} rows={4} maxLength={4000} />
          </label>

          <label>
            <span>{tx('What it should say', 'ما يجب أن يقوله')}</span>
            <textarea value={proposed} onChange={(event) => setProposed(event.target.value)} required rows={4} maxLength={4000} />
          </label>
        </div>

        <label>
          <span>{tx('How do you know?', 'ما مصدر معلوماتك؟')}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={3}
            maxLength={2000}
            placeholder={tx('Owner manual page, dealer confirmation, your own car…', 'صفحة من دليل المالك، تأكيد الوكيل، سيارتك نفسها…')}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="panel-form-actions">
          <button className="panel-button primary" type="submit" disabled={busy}>
            <FileEdit size={16} aria-hidden="true" />
            {busy ? tx('Sending…', 'جارٍ الإرسال…') : tx('Send for review', 'أرسل للمراجعة')}
          </button>
        </div>
      </form>
    </Card>
  )
}
