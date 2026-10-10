import { useEffect } from 'react'

const SITE_NAME = 'iCAUR V27 Egypt Owner Guide'

/** Gives each page its own browser-tab title, so tabs and history are readable. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])
}
