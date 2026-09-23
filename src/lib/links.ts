/**
 * Bundled documents (the PDF brief, manuals) are served from the site base,
 * which is not `/` on GitHub Pages project sites.
 */
export function sourceHref(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`
}

export const guideHref = (slug: string) => `#/guides/${slug}`
