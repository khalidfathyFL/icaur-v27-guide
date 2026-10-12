import { useCallback, useEffect, useState } from 'react'
import { api, type ApiPost, type ApiSuggestion } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

/** The signed-in owner's own posts and corrections, newest first. */
export function useMyContributions(fallbackError: string) {
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [suggestions, setSuggestions] = useState<ApiSuggestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    Promise.all([api.listPosts({ mine: true }), api.listSuggestions()])
      .then(([postResult, suggestionResult]) => {
        setPosts(postResult.posts)
        setSuggestions(suggestionResult.suggestions)
        setError(null)
      })
      .catch((caught) => {
        setPosts((current) => current ?? [])
        setSuggestions((current) => current ?? [])
        setError(errorMessage(caught, fallbackError))
      })
  }, [fallbackError])

  useEffect(load, [load])

  return { posts, suggestions, error, reload: load }
}
