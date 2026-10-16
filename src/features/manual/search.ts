import type { FeatureExtractionPipeline } from '@huggingface/transformers'
import { api } from '../../lib/api'

/**
 * Finds the owner-manual sections that answer a question, entirely in the
 * browser. Two rankings are merged: meaning (a small multilingual model, so an
 * Arabic question still finds the English manual) and exact words (so "AUTO
 * HOLD" lands on the section that names it, whatever the model thinks).
 *
 * The index is built by scripts/manual/build-index.mjs and uploaded from the
 * admin screen. The API serves it only to accounts with `assistant.use`.
 */

/** Must match the build script, or the stored vectors mean nothing. */
const EMBEDDING_MODEL = 'Xenova/multilingual-e5-small'

export type ManualSection = {
  id: number
  chapter: string
  title: string
  /** Pages in the PDF, 1-based, which is how the page images are numbered. */
  pages: number[]
  /** Page numbers printed in the manual, for "see page 35". */
  printed: number[]
  text: string
}

export type ManualHit = { section: ManualSection; score: number }

type Index = {
  sections: ManualSection[]
  vectors: Float32Array
  dimensions: number
  terms: Map<string, number>[]
  documentFrequency: Map<string, number>
  lengths: number[]
  averageLength: number
}

let indexPromise: Promise<Index> | null = null
let embedderPromise: Promise<FeatureExtractionPipeline> | null = null

const STOP_WORDS = new Set(
  'a an and are as at be by can do does for from how i in is it my of on or the to what when where which why with you your'.split(' '),
)

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => word.length > 1 && !STOP_WORDS.has(word))
}

export function loadIndex(): Promise<Index> {
  indexPromise ??= (async () => {
    const meta = await api.manualIndex<ManualSection>()
    const bytes = Uint8Array.from(atob(meta.vectors), (char) => char.charCodeAt(0))
    if (meta.model !== EMBEDDING_MODEL) throw new Error(`The manual index was built with ${meta.model}.`)

    const terms = meta.sections.map((section) => {
      const counts = new Map<string, number>()
      for (const word of tokenize(`${section.title} ${section.title} ${section.text}`)) counts.set(word, (counts.get(word) ?? 0) + 1)
      return counts
    })
    const documentFrequency = new Map<string, number>()
    for (const counts of terms) for (const word of counts.keys()) documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1)
    const lengths = terms.map((counts) => [...counts.values()].reduce((sum, count) => sum + count, 0))

    return {
      sections: meta.sections,
      vectors: new Float32Array(bytes.buffer),
      dimensions: meta.dimensions,
      terms,
      documentFrequency,
      lengths,
      averageLength: lengths.reduce((sum, length) => sum + length, 0) / lengths.length,
    }
  })()
  indexPromise.catch(() => {
    indexPromise = null
  })
  return indexPromise
}

/** About 120 MB on first use, then cached by the browser. */
export function loadEmbedder(onProgress?: (fraction: number) => void): Promise<FeatureExtractionPipeline> {
  embedderPromise ??= (async () => {
    const { pipeline } = await import('@huggingface/transformers')
    const device = 'gpu' in navigator ? 'webgpu' : 'wasm'
    const loaded = new Map<string, { loaded: number; total: number }>()
    return pipeline('feature-extraction', EMBEDDING_MODEL, {
      dtype: 'q8',
      device,
      progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (event.status !== 'progress' || !event.file || !event.total) return
        loaded.set(event.file, { loaded: event.loaded ?? 0, total: event.total })
        const sum = [...loaded.values()].reduce((acc, file) => ({ loaded: acc.loaded + file.loaded, total: acc.total + file.total }), { loaded: 0, total: 0 })
        onProgress?.(sum.loaded / sum.total)
      },
    }) as Promise<FeatureExtractionPipeline>
  })()
  embedderPromise.catch(() => {
    embedderPromise = null
  })
  return embedderPromise
}

function keywordScores(index: Index, query: string): Float64Array {
  const scores = new Float64Array(index.sections.length)
  const total = index.sections.length
  for (const word of new Set(tokenize(query))) {
    const frequency = index.documentFrequency.get(word)
    if (!frequency) continue
    const idf = Math.log(1 + (total - frequency + 0.5) / (frequency + 0.5))
    index.terms.forEach((counts, id) => {
      const count = counts.get(word)
      if (!count) return
      scores[id] += (idf * count * 2.2) / (count + 1.2 * (0.25 + (0.75 * index.lengths[id]) / index.averageLength))
    })
  }
  return scores
}

function ranks(scores: ArrayLike<number>): Map<number, number> {
  const order = Array.from({ length: scores.length }, (_, id) => id)
    .filter((id) => scores[id] > 0)
    .sort((a, b) => scores[b] - scores[a])
  return new Map(order.map((id, rank) => [id, rank]))
}

/**
 * `queries` are the owner's words plus, for Arabic, an English rewrite: the
 * small search model reads Egyptian Arabic poorly, the rewrite uses the
 * manual's own terms.
 */
export async function searchManual(queries: string[], limit = 5): Promise<ManualHit[]> {
  const [index, embed] = await Promise.all([loadIndex(), loadEmbedder()])
  const rankings: Map<number, number>[] = []

  for (const query of queries) {
    const output = await embed(`query: ${query}`, { pooling: 'mean', normalize: true })
    const queryVector = output.data as Float32Array
    const meaning = new Float64Array(index.sections.length)
    for (let id = 0; id < index.sections.length; id++) {
      let dot = 0
      const offset = id * index.dimensions
      for (let d = 0; d < index.dimensions; d++) dot += queryVector[d] * index.vectors[offset + d]
      meaning[id] = dot
    }
    rankings.push(ranks(meaning), ranks(keywordScores(index, query)))
  }

  // Reciprocal rank fusion: a section near the top of any list rises,
  // without having to put cosine similarity and word counts on one scale.
  const fused = index.sections.map((section) => {
    let score = 0
    for (const ranking of rankings) {
      const rank = ranking.get(section.id)
      if (rank !== undefined) score += 1 / (60 + rank)
    }
    return { section, score }
  })
  return fused.sort((a, b) => b.score - a.score).slice(0, limit)
}

const pageUrls = new Map<number, Promise<string>>()

/** An object URL for a manual page, fetched once per visit with the sign-in header. */
export function pageImageUrl(pdfPage: number): Promise<string> {
  let url = pageUrls.get(pdfPage)
  if (!url) {
    url = api.manualPage(pdfPage).then((blob) => URL.createObjectURL(blob))
    url.catch(() => pageUrls.delete(pdfPage))
    pageUrls.set(pdfPage, url)
  }
  return url
}

/** Forgets the cached index, so a fresh upload is used without reloading the page. */
export function resetIndex() {
  indexPromise = null
  pageUrls.clear()
}
