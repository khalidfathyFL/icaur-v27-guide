import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SearchContext } from './searchContext'
import { SearchDialog } from './SearchDialog'

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** Owns the site-wide search dialog and its keyboard shortcuts: `/` and Ctrl/⌘+K. */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState('')

  const openSearch = useCallback((query = '') => {
    setInitialQuery(query)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandK = event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)
      const slash = event.key === '/' && !isTypingTarget(event.target)
      if (commandK || slash) {
        event.preventDefault()
        openSearch()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openSearch])

  // Any navigation (a result, the back button) should leave search closed.
  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  const value = useMemo(() => ({ openSearch }), [openSearch])

  return (
    <SearchContext.Provider value={value}>
      {children}
      {open && <SearchDialog initialQuery={initialQuery} onClose={() => setOpen(false)} />}
    </SearchContext.Provider>
  )
}
