import { useEffect, useState } from 'react'

/**
 * Hash routing keeps deep links working on GitHub Pages, where there is no
 * server to rewrite unknown paths back to index.html.
 */
export function currentHashRoute(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

/** Splits `/guides?topic=energy` into its path and query parameters. */
export function splitRoute(route: string): { path: string; params: URLSearchParams } {
  const [path, query = ''] = route.split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

/** Updates the query of the current route without triggering a navigation. */
export function replaceRouteQuery(path: string, params: Record<string, string | null>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const suffix = query.toString()
  window.history.replaceState(null, '', `#${path}${suffix ? `?${suffix}` : ''}`)
}

export function useHashRoute(onNavigate?: () => void): string {
  const [route, setRoute] = useState(currentHashRoute)

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(currentHashRoute())
      onNavigate?.()
      // A new page should start at the top immediately, not animate up from the footer.
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
    // `onNavigate` is a stable callback from the shell; re-subscribing on every
    // render would detach the listener mid-navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return route
}
