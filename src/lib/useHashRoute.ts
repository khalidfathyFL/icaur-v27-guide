import { useEffect, useState } from 'react'

/**
 * Hash routing keeps deep links working on GitHub Pages, where there is no
 * server to rewrite unknown paths back to index.html.
 */
export function currentHashRoute(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

export function useHashRoute(onNavigate?: () => void): string {
  const [route, setRoute] = useState(currentHashRoute)

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(currentHashRoute())
      onNavigate?.()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
    // `onNavigate` is a stable callback from the shell; re-subscribing on every
    // render would detach the listener mid-navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return route
}
