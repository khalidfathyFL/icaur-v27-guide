import { createContext, useContext } from 'react'

export type SearchContextValue = {
  /** Opens the search dialog, optionally pre-filled. */
  openSearch: (initialQuery?: string) => void
}

export const SearchContext = createContext<SearchContextValue | null>(null)

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext)
  if (!value) throw new Error('useSearch must be used inside a SearchProvider')
  return value
}
