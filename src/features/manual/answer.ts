import type { MLCEngine } from '@mlc-ai/web-llm'
import type { ManualHit } from './search'

/**
 * Writes the answer on the reader's own device with a small open model
 * (WebLLM on WebGPU). Nothing leaves the browser and nothing is billed; the
 * cost is a one-time download that the browser then keeps.
 */

/** `size` is the graphics memory WebLLM says the model needs, close to its download. */
export type AnswerModel = { id: string; label: string; size: string; note: { en: string; ar: string } }

/** Qwen handles Arabic best among the models WebLLM ships. */
export const ANSWER_MODELS: AnswerModel[] = [
  { id: 'Qwen3.5-2B-q4f16_1-MLC', label: 'Qwen 3.5 · 2B', size: '2.2 GB', note: { en: 'Balanced (default)', ar: 'متوازن (الافتراضي)' } },
  { id: 'Qwen3.5-4B-q4f16_1-MLC', label: 'Qwen 3.5 · 4B', size: '3.9 GB', note: { en: 'Better answers, needs a good PC', ar: 'إجابات أفضل، يحتاج جهاز قوي' } },
  { id: 'Qwen3.5-0.8B-q4f16_1-MLC', label: 'Qwen 3.5 · 0.8B', size: '1.6 GB', note: { en: 'Fastest, for phones', ar: 'الأسرع، للموبايل' } },
]

export const webGpuAvailable = () => typeof navigator !== 'undefined' && 'gpu' in navigator

let engine: MLCEngine | null = null
let engineModel: string | null = null
let enginePromise: Promise<MLCEngine> | null = null

/**
 * The q4f16 builds need the GPU's 16-bit float feature; plenty of graphics
 * cards lack it, and the same model in q4f32 runs there instead.
 */
async function buildFor(modelId: string): Promise<string> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu
    const adapter = await gpu?.requestAdapter()
    if (adapter && !adapter.features.has('shader-f16')) return modelId.replace('q4f16_1', 'q4f32_1')
  } catch {
    // Unknown: try the model as chosen and let WebLLM report what is missing.
  }
  return modelId
}

export function loadAnswerModel(modelId: string, onProgress: (text: string, fraction: number) => void): Promise<MLCEngine> {
  if (engine && engineModel === modelId) return Promise.resolve(engine)
  enginePromise = (async () => {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    if (engine) {
      await engine.unload()
      engine = null
    }
    const build = await buildFor(modelId)
    const created = await CreateMLCEngine(build, {
      initProgressCallback: (report) => onProgress(report.text, report.progress),
    })
    engine = created
    engineModel = modelId
    return created
  })()
  enginePromise.catch(() => {
    enginePromise = null
  })
  return enginePromise
}

export const isAnswerModelLoaded = (modelId: string) => engine !== null && engineModel === modelId

/** Whether the model's files are already in this browser's storage, so loading needs no download. */
export async function isAnswerModelDownloaded(modelId: string): Promise<boolean> {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')
    return await hasModelInCache(await buildFor(modelId))
  } catch {
    return false
  }
}

/** Frees the gigabytes a model takes in this browser's storage. */
export async function removeAnswerModel(modelId: string): Promise<void> {
  if (engine && engineModel === modelId) {
    await engine.unload()
    engine = null
    engineModel = null
    enginePromise = null
  }
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm')
  await deleteModelAllInfoInCache(await buildFor(modelId))
}

const ARABIC = /[\u0600-\u06FF]/

export const isArabic = (text: string) => ARABIC.test(text)

/** An earlier question and its answer, so the next one can follow on from it. */
export type ChatTurn = { question: string; answer: string }

/** Small models have short memories: only the latest turns go back in, and long answers are cut. */
const HISTORY_TURNS = 3
const HISTORY_ANSWER_CHARS = 600

const recent = (history: ChatTurn[]) =>
  history.slice(-HISTORY_TURNS).map(({ question, answer }) => ({
    question,
    answer: answer.length > HISTORY_ANSWER_CHARS ? `${answer.slice(0, HISTORY_ANSWER_CHARS)}…` : answer,
  }))

/**
 * Turns the owner's question into one English search query in the manual's own
 * words. "إزاي أشحن العربية في البيت؟" becomes "AC charging at home", and a
 * follow-up such as "and how do I turn it off?" is resolved against the chat so
 * far, so the search knows what "it" is.
 */
export async function toEnglishSearchQuery(question: string, history: ChatTurn[] = []): Promise<string> {
  if (!engine) throw new Error('The answer model is not loaded.')
  const context = recent(history)
    .map(({ question: asked, answer }) => `Owner: ${asked}\nAssistant: ${answer}`)
    .join('\n\n')
  const reply = await engine.chat.completions.create({
    temperature: 0,
    max_tokens: 40,
    messages: [
      {
        role: 'system',
        content: [
          'Turn the car owner\'s latest question (often Egyptian Arabic) into one short English search query for the car\'s owner manual.',
          'Use manual terms such as tailgate, spare tire, tire pressure, AC charging, DC charging, warning light, seat folding, range extender.',
          context
            ? 'The question may be a follow-up: use the conversation to replace words like "it", "that" or "this" with what they refer to.'
            : '',
          'Output only the query.',
        ]
          .filter(Boolean)
          .join(' '),
      },
      { role: 'user', content: context ? `Conversation so far:\n${context}\n\nLatest question: ${question}` : question },
    ],
    extra_body: { enable_thinking: false },
  })
  return stripThinking(reply.choices[0]?.message?.content ?? '')
    .split('\n')[0]
    .replace(/^["'\s]+|["'\s]+$/g, '')
}

function systemPrompt(arabic: boolean): string {
  return [
    'You are the owner-manual assistant for the iCAUR V27 (extended-range EV).',
    'Answer ONLY from the manual excerpts the user gives you. Never use outside knowledge and never guess numbers.',
    'If the excerpts do not contain the answer, say exactly that the manual pages found do not cover it, and suggest asking the authorized service center.',
    'Keep it short. Use numbered steps for procedures. Mention any WARNING or CAUTION from the excerpts.',
    'After each fact, cite its page like (p. 35) using the page numbers given.',
    arabic
      ? 'The owner asked in Arabic: answer in clear, simple Arabic that an Egyptian owner understands. Keep button names and on-screen labels in English as they appear on the car.'
      : 'Answer in English.',
  ].join('\n')
}

function excerpts(hits: ManualHit[]): string {
  return hits
    .map(({ section }) => {
      const page = section.printed.length ? section.printed.join(', ') : section.pages.join(', ')
      return `[Excerpt — page ${page} — ${section.chapter} › ${section.title}]\n${section.text}`
    })
    .join('\n\n')
}

/** Some Qwen builds still open with a <think> block; the reader should never see it. */
const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trimStart()

export async function answerQuestion(
  question: string,
  hits: ManualHit[],
  onText: (text: string) => void,
  signal?: AbortSignal,
  history: ChatTurn[] = [],
): Promise<string> {
  if (!engine) throw new Error('The answer model is not loaded.')
  const arabic = ARABIC.test(question)
  // Earlier turns go in as plain questions and answers; only the latest question carries manual excerpts.
  const earlier = recent(history).flatMap(({ question: asked, answer }) => [
    { role: 'user' as const, content: `Owner's question: ${asked}` },
    { role: 'assistant' as const, content: answer },
  ])
  const stream = await engine.chat.completions.create({
    stream: true,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt(arabic) },
      ...earlier,
      { role: 'user', content: `Manual excerpts:\n\n${excerpts(hits)}\n\nOwner's question: ${question}` },
    ],
    extra_body: { enable_thinking: false },
  })

  let text = ''
  for await (const chunk of stream) {
    if (signal?.aborted) {
      await engine.interruptGenerate()
      break
    }
    text += chunk.choices[0]?.delta?.content ?? ''
    onText(stripThinking(text))
  }
  return stripThinking(text)
}
