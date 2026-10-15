import type { FaqEntry } from '../../content'
import type { ApiQuestion } from '../../lib/api'

const has = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle)

/**
 * Owners type either language whatever the page is set to, so the site's
 * answers match on both sides of every question and answer.
 */
export function matchesFaq(entry: FaqEntry, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [entry.question.en, entry.question.ar, entry.answer.en, entry.answer.ar].some((text) => has(text, needle))
}

export function matchesQuestion(question: ApiQuestion, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return has(question.title, needle) || has(question.body, needle)
}
