import type { Localized } from '../content/types'
import type { Language } from '../i18n/translator'

type Side = 'en' | 'ar'

/**
 * Posts may be written in English only, Arabic only, or both. A reader sees
 * their own language when the post has it, otherwise the language the post
 * was written in, rather than an empty heading.
 */
export function postSide(post: { title: Localized; body: Localized }, language: Language): Side {
  const preferred: Side = language === 'ar' ? 'ar' : 'en'
  const other: Side = preferred === 'en' ? 'ar' : 'en'
  const written = (side: Side) => Boolean(post.title[side] && post.body[side])

  if (written(preferred)) return preferred
  return written(other) ? other : preferred
}

/** For lists and headings, where only the title is needed. */
export function postTitle(post: { title: Localized; body: Localized }, language: Language): string {
  return post.title[postSide(post, language)] || post.title.en || post.title.ar
}

export const sideDir = (side: Side) => (side === 'ar' ? 'rtl' : 'ltr')

/** The editor leaves `<p></p>` behind when cleared, which is not a written post. */
const hasContent = (html: string) => html.replace(/<[^>]*>/g, '').trim() !== '' || /<(iframe|img)\b/.test(html)

/**
 * Mirrors the API's rule for an instant message: English, Arabic or both, but
 * each language used needs a title and a post. The API enforces it either way.
 */
export function postDraftProblem(title: Localized, body: Localized): Localized | null {
  const written = { en: hasContent(body.en), ar: hasContent(body.ar) }

  if (!written.en && !written.ar && !title.en.trim() && !title.ar.trim()) {
    return { en: 'Write the post in English, Arabic or both.', ar: 'اكتب المقال بالإنجليزية أو العربية أو كلتيهما.' }
  }
  if (title.en.trim() && !written.en) return { en: 'The English title has no English post.', ar: 'العنوان الإنجليزي بلا مقال إنجليزي.' }
  if (written.en && !title.en.trim()) return { en: 'Give the English post a title.', ar: 'أضف عنوانا للمقال الإنجليزي.' }
  if (title.ar.trim() && !written.ar) return { en: 'The Arabic title has no Arabic post.', ar: 'العنوان العربي بلا مقال عربي.' }
  if (written.ar && !title.ar.trim()) return { en: 'Give the Arabic post a title.', ar: 'أضف عنوانا للمقال العربي.' }

  return null
}
