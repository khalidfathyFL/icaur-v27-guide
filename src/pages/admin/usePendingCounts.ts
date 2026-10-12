import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export type PendingCounts = { posts: number; suggestions: number; comments: number; partReviews: number }

/**
 * Counts of work waiting, shown as sidebar badges and dashboard cards. Only
 * the queues this person may review are asked for, so a moderator with one
 * permission does not collect two 403s on every page load.
 */
export function usePendingCounts(can: (permission: string) => boolean) {
  const [counts, setCounts] = useState<PendingCounts | null>(null)

  const refresh = useCallback(() => {
    const none = Promise.resolve(null)
    Promise.allSettled([
      can('posts.review') ? api.listPosts({ status: 'pending' }) : none,
      can('suggestions.review') ? api.listSuggestions({ queue: true, status: 'pending' }) : none,
      can('comments.review') ? api.commentQueue('pending') : none,
      can('comments.review') ? api.partReviewQueue('pending') : none,
    ]).then(([posts, suggestions, comments, partReviews]) => {
      setCounts({
        posts: posts.status === 'fulfilled' && posts.value ? posts.value.posts.length : 0,
        suggestions: suggestions.status === 'fulfilled' && suggestions.value ? suggestions.value.suggestions.length : 0,
        comments: comments.status === 'fulfilled' && comments.value ? comments.value.comments.length : 0,
        partReviews: partReviews.status === 'fulfilled' && partReviews.value ? partReviews.value.reviews.length : 0,
      })
    })
  }, [can])

  useEffect(refresh, [refresh])

  return { counts, refresh }
}
