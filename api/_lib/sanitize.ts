import sanitizeHtml from 'sanitize-html'

/**
 * Cleans contributor HTML before it is ever stored.
 *
 * TipTap produces HTML, and HTML written by one visitor and served to every
 * other visitor is the textbook route to cross-site scripting. This runs in the
 * API rather than the browser on purpose: the endpoint can be called directly
 * with curl, so anything enforced only in the editor protects nothing.
 *
 * The allowlist matches what the editor's toolbar can actually produce. Images
 * and iframes are deliberately absent until uploads and an embed domain
 * allowlist exist.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    's',
    'code',
    'pre',
    'blockquote',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'a',
    'hr',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    // TipTap marks RTL paragraphs, which bilingual posts need.
    p: ['dir'],
    blockquote: ['dir'],
    li: ['dir'],
  },
  // No javascript:, data: or vbscript: URLs.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  // Every outbound link is untrusted, so it cannot reach back through
  // window.opener, and search engines should not follow it.
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow ugc' },
    }),
  },
  disallowedTagsMode: 'discard',
}

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS)
}

/** Plain text for excerpts and search, with the markup stripped entirely. */
export function toPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim()
}
