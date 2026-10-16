import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { BookOpenText, Cpu, Download, FileImage, Send, Square, Trash2, Upload } from 'lucide-react'
import { useAuth } from '../../auth/authContext'
import { PageHeader } from '../../components/panel/blocks'
import {
  ANSWER_MODELS,
  answerQuestion,
  isAnswerModelDownloaded,
  isAnswerModelLoaded,
  isArabic,
  loadAnswerModel,
  removeAnswerModel,
  toEnglishSearchQuery,
  webGpuAvailable,
} from '../../features/manual/answer'
import { importManualFolder, importManualPdf, type ImportProgress, type ImportResult } from '../../features/manual/importManual'
import { isEmbedderDownloaded, isEmbedderReady, loadEmbedder, loadIndex, pageImageUrl, resetIndex, searchManual, type ManualHit } from '../../features/manual/search'
import { useLanguage } from '../../i18n/languageContext'
import { api, ApiError, type ApiManualStatus } from '../../lib/api'
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

/** Where a model is: not on this computer, stored by the browser, or loaded and ready to use. */
type ModelState = 'missing' | 'downloaded' | 'ready'

async function readModelStates(gpu: boolean, modelId: string): Promise<{ search: ModelState; answer: ModelState }> {
  const [searchStored, answerStored] = await Promise.all([isEmbedderDownloaded(), gpu ? isAnswerModelDownloaded(modelId) : false])
  return {
    search: isEmbedderReady() ? 'ready' : searchStored ? 'downloaded' : 'missing',
    answer: isAnswerModelLoaded(modelId) ? 'ready' : answerStored ? 'downloaded' : 'missing',
  }
}

/**
 * A test screen, so the real reason is shown: the models fail in browser- and
 * GPU-specific ways that "Something went wrong" would hide.
 */
function describe(caught: unknown, fallback: string): string {
  console.error('Manual assistant:', caught)
  if (caught instanceof ApiError) return caught.message
  if (caught instanceof Error && caught.message) return `${fallback} ${caught.message}`
  return fallback
}

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
  const [models, setModels] = useState<{ search: ModelState; answer: ModelState } | null>(null)
  const abort = useRef<AbortController | null>(null)

  const checkModels = useCallback(() => {
    void readModelStates(gpu, modelId).then(setModels)
  }, [gpu, modelId])

  useEffect(() => {
    let cancelled = false
    void readModelStates(gpu, modelId).then((next) => {
      if (!cancelled) setModels(next)
    })
    return () => {
      cancelled = true
    }
  }, [gpu, modelId])

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

  /** Downloads (or, when already stored, just loads) both models ahead of the first question. */
  async function downloadModels() {
    setBusy(true)
    setSetupError(null)
    try {
      await loadEmbedder((fraction) =>
        setLoading(fraction < 1 ? { label: tx('Downloading the search model…', 'جارٍ تنزيل نموذج البحث…'), fraction } : null),
      )
      setLoading(null)
      if (gpu) await prepareModel(modelId)
    } catch (caught) {
      setLoading(null)
      setSetupError(describe(caught, tx('Could not download the models:', 'تعذر تنزيل النماذج:')))
    } finally {
      setBusy(false)
      checkModels()
    }
  }

  async function removeModel() {
    const model = ANSWER_MODELS.find((entry) => entry.id === modelId)
    if (!window.confirm(tx(`Remove ${model?.label ?? 'the AI model'} from this computer? It will download again when you next ask.`, `حذف ${model?.label ?? 'النموذج'} من هذا الجهاز؟ سيُنزّل مرة أخرى عند السؤال التالي.`))) return
    setBusy(true)
    try {
      await removeAnswerModel(modelId)
      setLoadedModel(null)
    } catch (caught) {
      setSetupError(describe(caught, tx('Could not remove the model:', 'تعذر حذف النموذج:')))
    } finally {
      setBusy(false)
      checkModels()
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
      update(index, { status: 'error', error: describe(caught, tx('Something went wrong:', 'حدث خطأ:')) })
    } finally {
      abort.current = null
      setBusy(false)
      checkModels()
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
        {models && (
          <div className="manual-models">
            <ModelLine label={tx('Search model · about 120 MB', 'نموذج البحث · حوالي 120 ميجابايت')} state={models.search} />
            {gpu && (
              <ModelLine
                label={`${tx('AI model', 'نموذج الإجابة')} · ${ANSWER_MODELS.find((entry) => entry.id === modelId)?.size ?? ''}`}
                state={models.answer}
              />
            )}
            <div className="manual-actions">
              {(models.search !== 'ready' || (gpu && models.answer !== 'ready')) && (
                <button type="button" className="primary-action" onClick={() => void downloadModels()} disabled={busy || loading !== null}>
                  <Download size={15} aria-hidden="true" />
                  {models.search === 'missing' || (gpu && models.answer === 'missing')
                    ? tx('Download models', 'تنزيل النماذج')
                    : tx('Load models', 'تحميل النماذج')}
                </button>
              )}
              {gpu && models.answer !== 'missing' && (
                <button type="button" className="secondary-button" onClick={() => void removeModel()} disabled={busy || loading !== null}>
                  <Trash2 size={15} aria-hidden="true" /> {tx('Remove AI model from this computer', 'حذف نموذج الإجابة من هذا الجهاز')}
                </button>
              )}
            </div>
            <p className="muted-note">
              {tx(
                'Downloaded once, then kept by this browser. Asking a question also downloads them if you have not.',
                'تُنزّل مرة واحدة ثم يحتفظ بها المتصفح. السؤال ينزّلها أيضًا إن لم تكن نزّلتها.',
              )}
            </p>
          </div>
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

function ModelLine({ label, state }: { label: string; state: ModelState }) {
  const { tx } = useLanguage()
  const text = {
    missing: tx('Not downloaded', 'غير منزّل'),
    downloaded: tx('Downloaded, on this computer', 'منزّل على هذا الجهاز'),
    ready: tx('Ready', 'جاهز'),
  }[state]
  return (
    <p className={`manual-model-line ${state}`}>
      <span>{label}</span>
      <strong>{text}</strong>
    </p>
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

function progressText(progress: ImportProgress, tx: (en: string, ar: string) => string): string {
  if (progress.stage === 'reading') {
    return tx(`Reading page ${progress.done + 1} of ${progress.total}…`, `جارٍ قراءة الصفحة ${progress.done + 1} من ${progress.total}…`)
  }
  if (progress.stage === 'uploading') {
    return tx(`Uploading page ${progress.done} of ${progress.total}…`, `جارٍ رفع الصفحة ${progress.done} من ${progress.total}…`)
  }
  if (progress.stage === 'indexing') {
    return tx(`Building the search index: ${progress.done} of ${progress.total} sections…`, `جارٍ بناء فهرس البحث: ${progress.done} من ${progress.total} قسم…`)
  }
  return tx('Saving…', 'جارٍ الحفظ…')
}

/**
 * Loads or replaces the manual from its PDF. The work happens in this browser
 * (importManual.ts); only the page images and the search index are sent, to
 * the database, never to git or public storage. Account managers only, like
 * the route.
 */
function ManualUpload({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { tx } = useLanguage()
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const running = progress !== null

  async function run(work: () => Promise<ImportResult>) {
    setError(null)
    setResult(null)
    setProgress({ stage: 'reading', done: 0, total: 0 })
    try {
      const done = await work()
      setResult(
        done.failedPages.length
          ? tx(
              `Loaded ${done.sections} sections from ${done.pages} pages. These page images did not upload: ${done.failedPages.join(', ')}. Upload the PDF again to retry.`,
              `تم تحميل ${done.sections} قسم من ${done.pages} صفحة. لم تُرفع صور هذه الصفحات: ${done.failedPages.join(', ')}. ارفع الملف مرة أخرى للمحاولة.`,
            )
          : tx(`Loaded ${done.sections} sections from ${done.pages} pages.`, `تم تحميل ${done.sections} قسم من ${done.pages} صفحة.`),
      )
      onDone()
    } catch (caught) {
      setError(describe(caught, tx('Could not read the manual:', 'تعذرت قراءة الدليل:')))
    } finally {
      setProgress(null)
    }
  }

  function choosePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setError(tx('Choose the manual as a PDF file.', 'اختر الدليل كملف PDF.'))
      return
    }
    void run(() => importManualPdf(file, setProgress))
  }

  function chooseFolder(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length) void run(() => importManualFolder(files, setProgress))
  }

  return (
    <details className="manual-upload" open={open || running}>
      <summary>
        <Upload size={15} aria-hidden="true" /> {tx('Upload or replace the manual', 'رفع الدليل أو استبداله')}
      </summary>
      <p className="muted-note">
        {tx(
          'Choose the owner manual PDF. This browser reads it, finds the sections and draws each page, which takes 5 to 10 minutes for the V27 manual: keep this tab open. Only the page images and the search index are saved, and only accounts allowed to use the assistant can read them.',
          'اختر ملف PDF لدليل المالك. هذا المتصفح يقرؤه ويقسمه ويرسم كل صفحة، ويستغرق ذلك من 5 إلى 10 دقائق لدليل V27: أبقِ هذه الصفحة مفتوحة. تُحفظ صور الصفحات وفهرس البحث فقط، ولا يقرؤها إلا من لديهم صلاحية المساعد.',
        )}
      </p>
      <div className="manual-actions">
        <label className="secondary-button manual-upload-button">
          <Upload size={15} aria-hidden="true" />
          {running ? tx('Working…', 'جارٍ العمل…') : tx('Choose the manual PDF', 'اختر ملف الدليل PDF')}
          <input type="file" accept="application/pdf,.pdf" hidden disabled={running} onChange={choosePdf} />
        </label>
        <label className="secondary-button manual-upload-button">
          <Upload size={15} aria-hidden="true" />
          {tx('Or a prepared folder', 'أو مجلد جاهز')}
          <input type="file" multiple hidden disabled={running} onChange={chooseFolder} {...{ webkitdirectory: '' }} />
        </label>
      </div>
      <p className="muted-note">
        {tx(
          'A prepared folder holds sections.json, vectors.bin and a pages folder of p-001.jpg… images. Choose the folder that contains them, not the pages folder.',
          'المجلد الجاهز يحتوي على sections.json و vectors.bin ومجلد pages بصور p-001.jpg… اختر المجلد الذي يحتويها، وليس مجلد pages.',
        )}
      </p>
      {progress && (
        <div className="manual-progress" role="status">
          <span>{progressText(progress, tx)}</span>
          {progress.stage === 'saving' ? (
            <progress />
          ) : (
            <progress value={progress.done} max={Math.max(progress.total, 1)} />
          )}
        </div>
      )}
      {result && <p className="form-success">{result}</p>}
      {error && <p className="form-error">{error}</p>}
    </details>
  )
}
