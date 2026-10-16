/**
 * Turns the text of the owner manual into short searchable sections. Pure
 * functions, no browser APIs, so the logic can be checked on its own; the PDF
 * reading itself is in importManual.ts.
 *
 * Headings are found by font size, because plain text runs a heading into
 * the first step under it. In the V27 manual:
 *
 *   11.5 pt        chapter running header, "2. BATTERY ELECTRIC SYSTEM"
 *   10 pt          section heading, "AC Charging (Slow Charging)"
 *   10 pt bold     sub-heading, "Warning triangle"
 *   "■ ..."        topic within a section
 *   9.5 pt         body text and the page number
 *   under 7 pt     image codes ("OMV27-2060"), dropped
 */

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

/**
 * One run of text as the PDF reader reports it. `y` is measured up from the
 * bottom of the page; `upright` is false for the chapter tabs printed sideways
 * along the page edge.
 */
export type TextRun = { text: string; size: number; font: string; y: number; endOfLine: boolean; upright: boolean }

export type LineKind = 'chapter' | 'heading' | 'subheading' | 'topic' | 'text'
export type PageText = { pdfPage: number; printed: number | null; lines: { kind: LineKind; text: string }[] }

const CALLOUTS = /^(WARNING|CAUTION|NOTE|READ|DANGER)\b/
/** Long enough to hold a whole procedure, short enough that a match points at one thing. */
const MAX_WORDS = 180
/** A topic shorter than this stays with the one before it rather than standing alone. */
const MIN_WORDS = 35

function lineKind(runs: TextRun[]): { kind: LineKind | null; text: string } {
  const text = runs.map((run) => run.text).join('').replace(/\s+/g, ' ').trim()
  const sized = runs.filter((run) => run.text.trim())
  if (!sized.length || !text) return { kind: null, text: '' }
  const main = sized.reduce((longest, run) => (run.text.trim().length > longest.text.trim().length ? run : longest))
  const size = Math.round(main.size * 10) / 10
  if (size < 7) return { kind: null, text: '' }
  if (size >= 11) return { kind: 'chapter', text }
  if (size >= 9.9 && !CALLOUTS.test(text)) return { kind: /Bold/i.test(main.font) ? 'subheading' : 'heading', text }
  if (text.startsWith('■')) return { kind: 'topic', text: text.replace(/^■\s*/, '') }
  return { kind: 'text', text: text.replace(/�/g, '•') }
}

/** Groups a page's runs into lines and labels each one. */
export function readPage(pdfPage: number, runs: TextRun[], pageHeight: number): PageText {
  const grouped: TextRun[][] = []
  let current: TextRun[] = []
  for (const run of runs) {
    if (!run.upright) continue
    // A new line starts after an end-of-line mark or when the baseline moves.
    if (current.length && Math.abs(current[0].y - run.y) > 2) {
      grouped.push(current)
      current = []
    }
    current.push(run)
    if (run.endOfLine) {
      grouped.push(current)
      current = []
    }
  }
  if (current.length) grouped.push(current)

  let printed: number | null = null
  const lines: PageText['lines'] = []
  for (const runsOfLine of grouped) {
    const { kind, text } = lineKind(runsOfLine)
    if (!kind) continue
    const nearFoot = runsOfLine[0].y < pageHeight * 0.12
    // The page number sits alone at the foot of the page.
    if (kind === 'text' && nearFoot && /^\d{1,3}$/.test(text)) {
      printed = Number(text)
      continue
    }
    // A running footer beside the page number: "2 Pictorial Index", "FOREWORD 1".
    const footer = nearFoot && text.length < 40 ? text.match(/^(\d{1,3})\s+\D.*$|^\D.*\s(\d{1,3})$/) : null
    if (footer) {
      printed = Number(footer[1] ?? footer[2])
      continue
    }
    lines.push({ kind, text })
  }
  // The chapter header is drawn last on some pages; it names the whole page, so it goes first.
  lines.sort((a, b) => Number(b.kind === 'chapter') - Number(a.kind === 'chapter'))
  return { pdfPage, printed, lines }
}

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length
const titleCase = (text: string) => (text === text.toUpperCase() ? text.charAt(0) + text.slice(1).toLowerCase() : text)

/** Lines the page layout broke mid-sentence are joined back into paragraphs. */
function joinLines(lines: string[]): string {
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

type Draft = { chapter: string; title: string; pages: number[]; printed: number[]; body: string[]; words: number }

export function buildSections(pages: PageText[]): ManualSection[] {
  const drafts: Draft[] = []
  let chapter = ''
  let heading = ''
  let subheading = ''
  // Typed through `as`: it is reassigned inside start(), which TypeScript's narrowing cannot see.
  let current = null as Draft | null

  const start = (page: PageText, title: string): Draft => {
    if (current && current.words > 0) drafts.push(current)
    current = { chapter, title, pages: [page.pdfPage], printed: page.printed ? [page.printed] : [], body: [], words: 0 }
    return current
  }
  const sectionTitle = () => [heading, subheading].filter(Boolean).join(' › ') || chapter

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
        let draft: Draft | null = current
        if (!draft || draft.words >= MIN_WORDS) {
          draft = start(page, line.kind === 'topic' ? `${sectionTitle()} › ${line.text}` : sectionTitle())
        }
        draft.body.push(`■ ${line.text}`)
        continue
      }

      let draft: Draft = current ?? start(page, sectionTitle())
      if (draft.words >= MAX_WORDS && /[.;:]$/.test(draft.body.at(-1) ?? '')) {
        const title = draft.title
        draft = start(page, title.endsWith('(continued)') ? title : `${title} (continued)`)
      }
      if (!draft.pages.includes(page.pdfPage)) draft.pages.push(page.pdfPage)
      if (page.printed && !draft.printed.includes(page.printed)) draft.printed.push(page.printed)
      draft.body.push(line.text)
      draft.words += countWords(line.text)
    }
  }
  if (current && current.words > 0) drafts.push(current)

  return drafts
    .map((draft) => ({ chapter: draft.chapter, title: draft.title, pages: draft.pages, printed: draft.printed, text: joinLines(draft.body) }))
    .filter((section) => countWords(section.text) >= 8)
    .map((section, id) => ({ id, ...section }))
}

/** What the search model reads for a section; search.ts embeds questions to match. */
export const passageText = (section: ManualSection) => `passage: ${section.chapter} — ${section.title}\n${section.text}`
