import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { BookOpenText, Cpu, FileImage, Send, Square, Upload } from 'lucide-react'
import { useAuth } from '../../auth/authContext'
import { PageHeader } from '../../components/panel/blocks'
import { ANSWER_MODELS, answerQuestion, isArabic, loadAnswerModel, toEnglishSearchQuery, webGpuAvailable } from '../../features/manual/answer'
import { loadEmbedder, loadIndex, pageImageUrl, resetIndex, searchManual, type ManualHit, type ManualSection } from '../../features/manual/search'
import { useLanguage } from '../../i18n/languageContext'
import { api, type ApiManualStatus } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'

/** Questions to try first: everyday ones, ones phrased the way owners talk, and Arabic. */
const SAMPLE_QUESTIONS = [
  'How do I open the tailgate?',
  'What is the correct tire pressure?',
  'How long does DC fast charging take?',
  'Where is the warning triangle?',
  'How do I fold the rear seats?',
  'إزاي أشحن العربية في البيت؟',
  'فين كوتش الاستبن؟',
  'إيه معنى لمبة البطارية الحمرا؟',
]

/** How many manual sections the model reads. More helps recall but slows small models down. */
const SECTIONS_FOR_ANSWER = 4

type Turn = {
  question: string
  hits: ManualHit[]
  answer: string
  status: 'searching' | 'answering' | 'done' | 'sources-only' | 'error'
  error?: string
  /** The English rewrite of an Arabic question, shown so a tester can see why a search missed. */
  searchedFor?: string
  searchMs?: number
  answerMs?: number
}

type Loading = { label: string; fraction: number } | null

/**
 * Test bench for the free "ask the manual" assistant: search and answer both
 * run on the reader's device. It lives in the admin panel, behind its own
 * permission, until iCAUR clears publishing the manual and the answers are
 * good enough for owners.
 */
export function ManualAssistant() {
  const { tx, t, language } = useLanguage()
  const { can } = useAuth()
  const gpu = webGpuAvailable()
  const [modelId, setModelId] = useState(ANSWER_MODELS[0].id)
  const [loadedModel, setLoadedModel] = useState<string | null>(null)
  const [loading, setLoading] = useState<Loading>(null)
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [manual, setManual] = useState<ApiManualStatus | null>(null)
  const abort = useRef<AbortController | null>(null)

  const loadStatus = useCallback(() => {
    api
      .manualStatus()
      .then((next) => {
        setManual(next)
        setSetupError(null)
        // The index is about 2 MB; fetching it up front makes the first search quicker.
        if (next.uploaded) loadIndex().catch((caught) => setSetupError(errorMessage(caught, 'Could not load the manual index.')))
      })
      .catch((caught) => setSetupError(errorMessage(caught, 'Could not check the manual.')))
  }, [])

  useEffect(loadStatus, [loadStatus])

  const update = (index: number, patch: Partial<Turn>) =>
    setTurns((previous) => previous.map((turn, at) => (at === index ? { ...turn, ...patch } : turn)))

  async function prepareModel(id: string) {
    if (loadedModel === id) return
    setLoading({ label: tx('Downloading the AI model…', 'جارٍ تنزيل نموذج الذكاء الاصطناعي…'), fraction: 0 })
    try {
      await loadAnswerModel(id, (text, fraction) => setLoading({ label: text, fraction }))
      setLoadedModel(id)
    } finally {
      setLoading(null)
    }
  }

  async function ask(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy || !manual?.uploaded) return
    setBusy(true)
    setQuestion('')
    const index = turns.length
    setTurns((previous) => [...previous, { question: trimmed, hits: [], answer: '', status: 'searching' }])

    try {
      const searchStart = performance.now()
      await loadEmbedder((fraction) =>
        setLoading(fraction < 1 ? { label: tx('Downloading the search model…', 'جارٍ تنزيل نموذج البحث…'), fraction } : null),
      )
      setLoading(null)
      const queries = [trimmed]
      if (gpu && isArabic(trimmed)) {
        await prepareModel(modelId)
        const english = await toEnglishSearchQuery(trimmed)
        if (english) queries.push(english)
        update(index, { searchedFor: english })
      }
      const hits = await searchManual(queries, SECTIONS_FOR_ANSWER)
      update(index, { hits, searchMs: performance.now() - searchStart })

      if (!gpu) {
        update(index, { status: 'sources-only' })
        return
      }

      await prepareModel(modelId)
      update(index, { status: 'answering' })
      const answerStart = performance.now()
      abort.current = new AbortController()
      await answerQuestion(trimmed, hits, (partial) => update(index, { answer: partial }), abort.current.signal)
      update(index, { status: 'done', answerMs: performance.now() - answerStart })
    } catch (caught) {
      setLoading(null)
      update(index, { status: 'error', error: errorMessage(caught, tx('Something went wrong.', 'حدث خطأ.')) })
    } finally {
      abort.current = null
      setBusy(false)
    }
  }

  const answering = turns.at(-1)?.status === 'answering'
  const ready = Boolean(manual?.uploaded)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(question)
  }

  return (
    <>
      <PageHeader
        description={tx(
          'Test of the free owner-manual assistant. The answer comes only from the official owner manual, with the pages it used. Search and answer run in your browser, after a one-time download.',
          'تجربة مساعد دليل المالك المجاني. الإجابة من دليل المالك الرسمي فقط، مع الصفحات التي استخدمها. البحث والإجابة يعملان في متصفحك بعد تنزيل لمرة واحدة.',
        )}
      />
      <section className="manual-setup">
        <p className={gpu ? 'manual-gpu ok' : 'manual-gpu warn'}>
          <Cpu size={16} aria-hidden="true" />
          {gpu
            ? tx('This browser can run the AI model (WebGPU).', 'هذا المتصفح يستطيع تشغيل نموذج الذكاء الاصطناعي (WebGPU).')
            : tx(
                'This browser cannot run the AI model (no WebGPU). You will get the matching manual pages without a written answer. Try Chrome or Edge on a computer.',
                'هذا المتصفح لا يستطيع تشغيل النموذج (لا يدعم WebGPU). ستظهر صفحات الدليل المطابقة بدون إجابة مكتوبة. جرّب Chrome أو Edge على كمبيوتر.',
              )}
        </p>
        {gpu && (
          <label className="manual-model">
            <span>{tx('AI model', 'النموذج')}</span>
            <select value={modelId} onChange={(event) => setModelId(event.target.value)} disabled={busy || loading !== null}>
              {ANSWER_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} — {model.size} — {t(model.note)}
                  {loadedModel === model.id ? ` ✓` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {loading && (
          <div className="manual-progress" role="status">
            <span>{loading.label}</span>
            <progress value={loading.fraction} max={1} />
          </div>
        )}
        {manual && (
          <p className="muted-note">
            {manual.uploaded
              ? tx(
                  `Manual loaded: ${manual.sections} sections, ${manual.pages} page images${manual.uploadedAt ? `, uploaded ${formatDate(manual.uploadedAt, language)}` : ''}.`,
                  `الدليل محمّل: ${manual.sections} قسم، ${manual.pages} صورة صفحة${manual.uploadedAt ? `، رُفع ${formatDate(manual.uploadedAt, language)}` : ''}.`,
                )
              : tx('The manual has not been uploaded yet.', 'لم يتم رفع الدليل بعد.')}
          </p>
        )}
        {setupError && <p className="form-error">{setupError}</p>}
        {can('users.manage') && (
          <ManualUpload
            open={manual !== null && !manual.uploaded}
            onDone={() => {
              resetIndex()
              loadStatus()
            }}
          />
        )}
      </section>

      <div className="manual-turns">
        {turns.map((turn, index) => (
          <TurnView key={index} turn={turn} />
        ))}
      </div>

      <form className="comment-form manual-ask" onSubmit={submit}>
        <label>
          <span>{tx('Your question', 'سؤالك')}</span>
          <textarea
            dir="auto"
            rows={2}
            value={question}
            maxLength={400}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void ask(question)
              }
            }}
            placeholder={tx('e.g. How do I open the tailgate?', 'مثال: إزاي أفتح الشنطة؟')}
          />
        </label>
        <div className="manual-actions">
          {answering ? (
            <button type="button" className="secondary-button" onClick={() => abort.current?.abort()}>
              <Square size={15} aria-hidden="true" /> {tx('Stop', 'إيقاف')}
            </button>
          ) : (
            <button className="primary-action" type="submit" disabled={busy || !question.trim() || !ready}>
              <Send size={15} aria-hidden="true" /> {tx('Ask', 'اسأل')}
            </button>
          )}
        </div>
        <div className="manual-samples" aria-label={tx('Questions to try', 'أسئلة للتجربة')}>
          {SAMPLE_QUESTIONS.map((sample) => (
            <button key={sample} type="button" dir="auto" className="manual-sample" disabled={busy || !ready} onClick={() => void ask(sample)}>
              {sample}
            </button>
          ))}
        </div>
      </form>
    </>
  )
}

function TurnView({ turn }: { turn: Turn }) {
  const { tx } = useLanguage()
  const pages = [...new Set(turn.hits.flatMap((hit) => hit.section.pages))].slice(0, 6)

  return (
    <article className="manual-turn">
      <p className="manual-question" dir="auto">
        {turn.question}
      </p>

      {turn.searchedFor && (
        <p className="manual-timing" dir="ltr">
          {tx('Searched for', 'تم البحث عن')}: “{turn.searchedFor}”
        </p>
      )}
      {turn.status === 'searching' && <p className="muted-note">{tx('Searching the manual…', 'جارٍ البحث في الدليل…')}</p>}
      {turn.status === 'error' && <p className="form-error">{turn.error}</p>}

      {(turn.answer || turn.status === 'answering') && (
        <div className="manual-answer" dir="auto">
          {turn.answer || <span className="muted-note">{tx('Writing the answer…', 'جارٍ كتابة الإجابة…')}</span>}
        </div>
      )}

      {turn.hits.length > 0 && (
        <details className="manual-sources" open={turn.status === 'sources-only'}>
          <summary>
            <BookOpenText size={15} aria-hidden="true" />
            {tx('From the manual', 'من الدليل')} ·{' '}
            {turn.hits
              .map((hit) => hit.section.printed[0] ?? hit.section.pages[0])
              .filter((page, at, all) => all.indexOf(page) === at)
              .map((page) => `p. ${page}`)
              .join(', ')}
          </summary>
          {turn.hits.map(({ section }) => (
            <div key={section.id} className="manual-source" dir="ltr" lang="en">
              <p className="manual-source-title">
                {section.chapter} › {section.title}
                <span className="muted-note"> · p. {(section.printed.length ? section.printed : section.pages).join(', ')}</span>
              </p>
              <p className="manual-source-text">{section.text}</p>
            </div>
          ))}
        </details>
      )}

      {pages.length > 0 && (
        <div className="manual-pages" aria-label={tx('Manual pages', 'صفحات الدليل')}>
          {pages.map((page) => (
            <PageThumb key={page} page={page} />
          ))}
        </div>
      )}

      {(turn.searchMs !== undefined || turn.answerMs !== undefined) && (
        <p className="manual-timing">
          {turn.searchMs !== undefined && `${tx('search', 'البحث')} ${(turn.searchMs / 1000).toFixed(1)}s`}
          {turn.answerMs !== undefined && ` · ${tx('answer', 'الإجابة')} ${(turn.answerMs / 1000).toFixed(1)}s`}
        </p>
      )}
    </article>
  )
}

/** Page images come from the API with the sign-in header, so each one is fetched and shown from memory. */
function PageThumb({ page }: { page: number }) {
  const { tx } = useLanguage()
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    pageImageUrl(page)
      .then((next) => {
        if (!cancelled) setUrl(next)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  const label = (
    <span>
      <FileImage size={13} aria-hidden="true" /> PDF {page}
    </span>
  )
  if (!url) {
    return (
      <div className="manual-page-placeholder" aria-busy={!failed}>
        <div>{failed ? tx('Missing', 'غير موجودة') : '…'}</div>
        {label}
      </div>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title={tx('Open the full page', 'افتح الصفحة كاملة')}>
      <img src={url} alt={tx(`Manual page ${page}`, `صفحة الدليل ${page}`)} />
      {label}
    </a>
  )
}

type UploadProgress = { done: number; total: number; failed: number[] }

/** The base64 part of a data URL, without building a huge string by hand. */
function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Uploads the output of scripts/manual/ (the public/manual folder: sections.json,
 * vectors.bin and pages/p-001.jpg…) into the database, so the manual never
 * goes into git or public storage. Account managers only, like the route.
 */
function ManualUpload({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { tx } = useLanguage()
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    const sections = files.find((file) => file.name === 'sections.json')
    const vectors = files.find((file) => file.name === 'vectors.bin')
    const pages = files
      .map((file) => ({ file, page: Number(file.name.match(/^p-(\d+)\.jpe?g$/i)?.[1]) }))
      .filter((entry) => entry.page > 0)
      .sort((a, b) => a.page - b.page)
    if (!sections || !vectors) {
      setError(
        tx(
          'Choose the public/manual folder: it must hold sections.json and vectors.bin.',
          'اختر مجلد public/manual: يجب أن يحتوي على sections.json و vectors.bin.',
        ),
      )
      return
    }

    setError(null)
    setRunning(true)
    try {
      const meta = JSON.parse(await sections.text()) as { model: string; dimensions: number; sections: ManualSection[] }
      await api.uploadManualIndex({ ...meta, vectors: await fileToBase64(vectors) })

      const state: UploadProgress = { done: 0, total: pages.length, failed: [] }
      setProgress({ ...state })
      let next = 0
      // A few at a time: fast enough, and gentle on the function and the database.
      const worker = async () => {
        while (next < pages.length) {
          const { file, page } = pages[next++]
          try {
            await api.uploadManualPage(page, await fileToBase64(file))
          } catch {
            state.failed.push(page)
          }
          state.done++
          setProgress({ ...state, failed: [...state.failed] })
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()])
      onDone()
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not upload the manual.', 'تعذر رفع الدليل.')))
    } finally {
      setRunning(false)
    }
  }

  return (
    <details className="manual-upload" open={open || running}>
      <summary>
        <Upload size={15} aria-hidden="true" /> {tx('Upload or replace the manual', 'رفع الدليل أو استبداله')}
      </summary>
      <p className="muted-note">
        {tx(
          'Run scripts/manual/extract.py and build-index.mjs, render the pages with pdftoppm, then choose the public/manual folder. It is stored in the database and only accounts allowed to use the assistant can read it.',
          'شغّل scripts/manual/extract.py و build-index.mjs، واستخرج الصفحات بـ pdftoppm، ثم اختر مجلد public/manual. يُحفظ في قاعدة البيانات ولا يقرؤه إلا من لديهم صلاحية المساعد.',
        )}
      </p>
      <label className="secondary-button manual-upload-button">
        <Upload size={15} aria-hidden="true" />
        {running ? tx('Uploading…', 'جارٍ الرفع…') : tx('Choose the manual folder', 'اختر مجلد الدليل')}
        <input type="file" multiple hidden disabled={running} onChange={upload} {...{ webkitdirectory: '' }} />
      </label>
      {progress && (
        <div className="manual-progress" role="status">
          <span>
            {tx(`Pages: ${progress.done} of ${progress.total}`, `الصفحات: ${progress.done} من ${progress.total}`)}
            {progress.failed.length > 0 && ` · ${tx('failed', 'فشل')}: ${progress.failed.join(', ')}`}
          </span>
          <progress value={progress.done} max={Math.max(progress.total, 1)} />
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </details>
  )
}
