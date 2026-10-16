/**
 * Turns the owner manual into the files the "Ask the manual" page loads:
 *
 *   public/manual/sections.json   the manual split into short sections, each with its pages
 *   public/manual/vectors.bin     one search vector per section (Float32)
 *
 * Input is the structured pages from extract.py, which knows the headings
 * from their font size:
 *
 *   python scripts/manual/extract.py manual.pdf pages.json
 *   node scripts/manual/build-index.mjs pages.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { pipeline } from '@huggingface/transformers'

/** Must match `EMBEDDING_MODEL` in src/features/manual/search.ts, or the vectors mean nothing. */
const EMBEDDING_MODEL = 'Xenova/multilingual-e5-small'
const OUT_DIR = 'public/manual'
/** Long enough to hold a whole procedure, short enough that a match points at one thing. */
const MAX_WORDS = 180
/** A topic shorter than this stays with the one before it rather than standing alone. */
const MIN_WORDS = 35

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/manual/build-index.mjs <pages.json>')
  process.exit(1)
}

/** @type {{ pdfPage: number, printed: number | null, lines: { kind: string, text: string }[] }[]} */
const pages = JSON.parse(await readFile(input, 'utf8'))

const words = (text) => text.split(/\s+/).filter(Boolean).length
const titleCase = (text) => (text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text)

const sections = []
let chapter = ''
let heading = ''
let subheading = ''
let current = null

function flush() {
  if (current && current.words > 0) sections.push(current)
  current = null
}

function start(page, title) {
  flush()
  current = { chapter, title, pages: [page.pdfPage], printed: page.printed ? [page.printed] : [], body: [], words: 0 }
}

function sectionTitle() {
  return [heading, subheading].filter(Boolean).join(' › ') || chapter
}

for (const page of pages) {
  // The contents and index pages match every question and answer none.
  if (page.lines.filter((line) => /\.{4,}/.test(line.text)).length > 4) continue

  for (const line of page.lines) {
    // Callout numbers on diagrams share the heading size.
    if (line.kind.endsWith('heading') && !/[A-Za-z]{3}/.test(line.text)) continue
    if (line.kind === 'chapter') {
      const match = line.text.match(/^(\d{1,2})\.\s+(.+)$/)
      const next = match ? `${match[1]}. ${titleCase(match[2])}` : titleCase(line.text)
      if (next !== chapter) {
        chapter = next
        heading = ''
        subheading = ''
      }
      continue
    }

    if (line.kind === 'heading') {
      heading = line.text
      subheading = ''
      start(page, sectionTitle())
      continue
    }
    if (line.kind === 'subheading' || line.kind === 'topic') {
      if (line.kind === 'subheading') subheading = line.text
      if (!current || current.words >= MIN_WORDS) start(page, line.kind === 'topic' ? `${sectionTitle()} › ${line.text}` : sectionTitle())
      current.body.push(`■ ${line.text}`)
      continue
    }

    if (!current) start(page, sectionTitle())
    const previous = current.body.at(-1) ?? ''
    if (current.words >= MAX_WORDS && /[.;:]$/.test(previous)) {
      const title = current.title
      start(page, title.endsWith('(continued)') ? title : `${title} (continued)`)
    }
    if (!current.pages.includes(page.pdfPage)) current.pages.push(page.pdfPage)
    if (page.printed && !current.printed.includes(page.printed)) current.printed.push(page.printed)
    current.body.push(line.text)
    current.words += words(line.text)
  }
}
flush()

/** Lines the page layout broke mid-sentence are joined back into paragraphs. */
function toText(lines) {
  let text = ''
  for (const line of lines) {
    const startsBlock = /^(■|•|\d+\.|WARNING|CAUTION|NOTE|READ|DANGER)/.test(line)
    const previousLine = text.slice(text.lastIndexOf('\n') + 1)
    const endsBlock = /[.:;!?]$/.test(text) || /^(WARNING|CAUTION|NOTE|READ|DANGER)$/.test(previousLine) || previousLine.startsWith('■')
    if (!text) text = line
    else if (startsBlock || endsBlock) text += `\n${line}`
    else text += /[-/]$/.test(text) ? line : ` ${line}`
  }
  return text
}

const output = sections
  .map((section) => ({
    chapter: section.chapter,
    title: section.title,
    pages: section.pages,
    printed: section.printed,
    text: toText(section.body),
  }))
  .filter((section) => words(section.text) >= 8)
  .map((section, id) => ({ id, ...section }))

console.log(`${pages.length} pages → ${output.length} sections`)

const embed = await pipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'q8' })
const parts = []
for (let first = 0; first < output.length; first += 16) {
  const batch = output.slice(first, first + 16).map((section) => `passage: ${section.chapter} — ${section.title}\n${section.text}`)
  const result = await embed(batch, { pooling: 'mean', normalize: true })
  parts.push(result.data)
  process.stdout.write(`\rEmbedded ${Math.min(first + 16, output.length)}/${output.length}`)
}
process.stdout.write('\n')

const flat = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0))
let offset = 0
for (const part of parts) {
  flat.set(part, offset)
  offset += part.length
}

await mkdir(OUT_DIR, { recursive: true })
await writeFile(
  `${OUT_DIR}/sections.json`,
  JSON.stringify({ model: EMBEDDING_MODEL, dimensions: flat.length / output.length, sections: output }),
)
await writeFile(`${OUT_DIR}/vectors.bin`, Buffer.from(flat.buffer))
console.log(`Wrote ${OUT_DIR}/sections.json and vectors.bin (${(flat.byteLength / 1024).toFixed(0)} KB)`)
