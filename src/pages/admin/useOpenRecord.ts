import { useState } from 'react'
import { replaceRouteQuery } from '../../lib/useHashRoute'

/**
 * The open record lives in the URL (`?id=`), so a drawer can be linked to,
 * survives a refresh, and the search palette can open one directly.
 */
export function useOpenRecord(path: string, params: URLSearchParams) {
  const [openId, setOpenId] = useState<string | null>(params.get('id'))

  const open = (id: string) => {
    setOpenId(id)
    replaceRouteQuery(path, { id })
  }
  const close = () => {
    setOpenId(null)
    replaceRouteQuery(path, {})
  }

  return { openId, open, close }
}
