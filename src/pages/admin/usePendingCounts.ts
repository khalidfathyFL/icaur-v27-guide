import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'

export type PendingCounts = {
  posts: number
  suggestions: number
  comments: number
  partReviews: number
  centerReviews: number
  insurerReviews: number
  /** Requests nobody has answered yet. */
  orders: number
}

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
      can('comments.review') ? api.reviewQueue('part', 'pending') : none,
      can('comments.review') ? api.reviewQueue('center', 'pending') : none,
      can('comments.review') ? api.reviewQueue('insurer', 'pending') : none,
      can('orders.manage') ? api.orderQueue('new') : none,
    ]).then(([posts, suggestions, comments, partReviews, centerReviews, insurerReviews, orders]) => {
      setCounts({
        posts: posts.status === 'fulfilled' && posts.value ? posts.value.posts.length : 0,
        suggestions: suggestions.status === 'fulfilled' && suggestions.value ? suggestions.value.suggestions.length : 0,
        comments: comments.status === 'fulfilled' && comments.value ? comments.value.comments.length : 0,
        partReviews: partReviews.status === 'fulfilled' && partReviews.value ? partReviews.value.length : 0,
        centerReviews: centerReviews.status === 'fulfilled' && centerReviews.value ? centerReviews.value.length : 0,
        insurerReviews: insurerReviews.status === 'fulfilled' && insurerReviews.value ? insurerReviews.value.length : 0,
        orders: orders.status === 'fulfilled' && orders.value ? orders.value.orders.length : 0,
      })
    })
  }, [can])

  useEffect(refresh, [refresh])

  return { counts, refresh }
}
