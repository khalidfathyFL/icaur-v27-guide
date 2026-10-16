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

export function loadAnswerModel(modelId: string, onProgress: (text: string, fraction: number) => void): Promise<MLCEngine> {
  if (engine && engineModel === modelId) return Promise.resolve(engine)
  enginePromise = (async () => {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    if (engine) {
      await engine.unload()
      engine = null
    }
    const created = await CreateMLCEngine(modelId, {
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

const ARABIC = /[؀-ۿ]/

export const isArabic = (text: string) => ARABIC.test(text)

/** Turns "إزاي أشحن العربية في البيت؟" into words the English manual uses. */
export async function toEnglishSearchQuery(question: string): Promise<string> {
  if (!engine) throw new Error('The answer model is not loaded.')
  const reply = await engine.chat.completions.create({
    temperature: 0,
    max_tokens: 40,
    messages: [
      {
        role: 'system',
        content:
          'Translate the car owner\'s question (often Egyptian Arabic) into one short English search query for the car\'s owner manual. Use manual terms such as tailgate, spare tire, tire pressure, AC charging, DC charging, warning light, seat folding, range extender. Output only the query.',
      },
      { role: 'user', content: question },
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

export async function answerQuestion(question: string, hits: ManualHit[], onText: (text: string) => void, signal?: AbortSignal): Promise<string> {
  if (!engine) throw new Error('The answer model is not loaded.')
  const arabic = ARABIC.test(question)
  const stream = await engine.chat.completions.create({
    stream: true,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt(arabic) },
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
