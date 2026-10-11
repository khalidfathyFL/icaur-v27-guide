import sanitizeHtml from 'sanitize-html'

/**
 * Cleans contributor HTML before it is ever stored.
 *
 * TipTap produces HTML, and HTML written by one visitor and served to every
 * other visitor is the textbook route to cross-site scripting. This runs in the
 * API rather than the browser on purpose: the endpoint can be called directly
 * with curl, so anything enforced only in the editor protects nothing.
 *
 * The allowlist matches what the editor's toolbar can actually produce.
 *
 * Iframes are permitted only from hosts with a real video player, enforced by
 * hostname rather than by a URL pattern. An iframe is a frame of someone
 * else's code inside the page, so the set of origins allowed to do that is
 * small, explicit, and checked here rather than in the editor.
 */

/** Keep in step with EMBED_HOSTNAMES in src/components/editor/embeds.ts. */
const EMBED_HOSTNAMES = ['www.youtube-nocookie.com', 'player.bilibili.com', 'player.vimeo.com']
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
    'iframe',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    iframe: ['src', 'title', 'loading', 'referrerpolicy', 'allowfullscreen'],
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
  // Any iframe whose src is not on this list is dropped entirely.
  allowedIframeHostnames: EMBED_HOSTNAMES,
  allowIframeRelativeUrls: false,
  // An iframe from a host that is not allowed keeps its tag but loses its src,
  // which would render as an empty box. Drop the element instead.
  exclusiveFilter: (frame) => frame.tag === 'iframe' && !frame.attribs.src,
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
