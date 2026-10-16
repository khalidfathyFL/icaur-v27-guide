import { api } from '../../lib/api'
import { buildSections, passageText, readPage, type PageText, type TextRun } from './buildManual'
import { EMBEDDING_MODEL, loadEmbedder } from './search'

/**
 * Loads the owner manual from its PDF, entirely in the admin's browser: reads
 * every page's text, renders the page as an image, builds the search index,
 * and stores it all through the API. The PDF itself is never uploaded.
 */

export type ImportProgress =
  | { stage: 'reading'; done: number; total: number }
  | { stage: 'indexing'; done: number; total: number }
  | { stage: 'saving' }

export type ImportResult = { sections: number; pages: number; failedPages: number[] }

/** Matches the page images the assistant shows: readable, about 70 KB each. */
const PAGE_SCALE = 90 / 72
const JPEG_QUALITY = 0.72
const PARALLEL_UPLOADS = 4

/** The base64 part of a data URL, without building a huge string by hand. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.readAsDataURL(blob)
  })
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render the page.'))), 'image/jpeg', JPEG_QUALITY),
  )
}

export async function importManualPdf(file: File, onProgress: (progress: ImportProgress) => void): Promise<ImportResult> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  // fontExtraProperties keeps each font's real name, which is how bold sub-headings are told apart.
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), fontExtraProperties: true })
  const doc = await task.promise
  const total = doc.numPages
  const pages: PageText[] = []
  const failedPages: number[] = []
  const uploads = new Set<Promise<void>>()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot draw the pages.')

  try {
    for (let number = 1; number <= total; number++) {
      onProgress({ stage: 'reading', done: number - 1, total })
      const page = await doc.getPage(number)
      const viewport = page.getViewport({ scale: PAGE_SCALE })
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, canvasContext: context, viewport }).promise

      // Fonts are loaded once the page has been drawn, so their names can be read now.
      const content = await page.getTextContent()
      const runs: TextRun[] = []
      for (const item of content.items) {
        if (!('str' in item)) continue
        let font = ''
        try {
          font = (page.commonObjs.get(item.fontName) as { name?: string } | undefined)?.name ?? ''
        } catch {
          // A font that never loaded just counts as regular weight.
        }
        const [a, b] = item.transform as number[]
        runs.push({ text: item.str, size: Math.hypot(a, b), font, y: item.transform[5], endOfLine: item.hasEOL, upright: Math.abs(a) >= Math.abs(b) })
      }
      pages.push(readPage(number, runs, page.view[3]))

      const image = await canvasToJpeg(canvas)
      page.cleanup()

      const upload = blobToBase64(image)
        .then((base64) => api.uploadManualPage(number, base64))
        .then(
          () => undefined,
          () => {
            failedPages.push(number)
          },
        )
        .finally(() => uploads.delete(upload))
      uploads.add(upload)
      if (uploads.size >= PARALLEL_UPLOADS) await Promise.race(uploads)
    }
    await Promise.all(uploads)
  } finally {
    await task.destroy()
  }

  const sections = buildSections(pages)
  const embed = await loadEmbedder()
  const vectors: Float32Array[] = []
  for (let first = 0; first < sections.length; first += 16) {
    onProgress({ stage: 'indexing', done: first, total: sections.length })
    const result = await embed(sections.slice(first, first + 16).map(passageText), { pooling: 'mean', normalize: true })
    vectors.push(result.data as Float32Array)
  }
  const flat = new Float32Array(vectors.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of vectors) {
    flat.set(part, offset)
    offset += part.length
  }

  onProgress({ stage: 'saving' })
  await api.uploadManualIndex({
    model: EMBEDDING_MODEL,
    dimensions: flat.length / sections.length,
    sections,
    vectors: await blobToBase64(new Blob([flat.buffer])),
    pageCount: total,
  })

  return { sections: sections.length, pages: total, failedPages: failedPages.sort((a, b) => a - b) }
}
