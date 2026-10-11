/**
 * Which videos may become an embedded player, and what their player URL is.
 *
 * Only hosts with a real embed player are listed. Everything else becomes an
 * ordinary link rather than an iframe, because an iframe pointing at an
 * arbitrary origin is a frame of someone else's code running inside the page.
 *
 * This list exists twice on purpose. Here it decides what the editor will
 * insert; `api/_lib/sanitize.ts` decides what survives being saved, and that
 * copy is the one that matters, because the endpoint can be called without
 * the editor. Keep them in step.
 */

export const EMBED_HOSTNAMES = [
  'www.youtube-nocookie.com',
  'player.bilibili.com',
  'player.vimeo.com',
] as const

type Resolver = (url: URL) => string | null

/** youtu.be/ID and youtube.com/watch?v=ID both reduce to the same player. */
const youtube: Resolver = (url) => {
  const id =
    url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : (url.searchParams.get('v') ?? url.pathname.split('/').pop())

  // IDs are 11 characters of a restricted alphabet; anything else is not an id.
  if (!id || !/^[\w-]{11}$/.test(id)) return null
  return `https://www.youtube-nocookie.com/embed/${id}`
}

const bilibili: Resolver = (url) => {
  const bvid = url.pathname.split('/').find((part) => /^BV[\w]{10}$/.test(part))
  if (!bvid) return null
  return `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0`
}

const vimeo: Resolver = (url) => {
  const id = url.pathname.split('/').find((part) => /^\d{6,12}$/.test(part))
  if (!id) return null
  return `https://player.vimeo.com/video/${id}`
}

const RESOLVERS: Record<string, Resolver> = {
  'youtube.com': youtube,
  'www.youtube.com': youtube,
  'm.youtube.com': youtube,
  'youtu.be': youtube,
  'bilibili.com': bilibili,
  'www.bilibili.com': bilibili,
  'vimeo.com': vimeo,
  'www.vimeo.com': vimeo,
}

/**
 * The player URL for a pasted link, or null when the host has no embeddable
 * player. Douyin and Facebook are deliberately absent: neither offers a plain
 * iframe player, so owners' links to them stay links.
 */
export function toEmbedUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  return RESOLVERS[url.hostname]?.(url) ?? null
}

/** A short label for the player, used as the iframe title. */
export function embedTitle(embedUrl: string): string {
  if (embedUrl.includes('youtube')) return 'YouTube video'
  if (embedUrl.includes('bilibili')) return 'Bilibili video'
  if (embedUrl.includes('vimeo')) return 'Vimeo video'
  return 'Embedded video'
}
