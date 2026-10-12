import { useEffect } from 'react'

/** Replaces the history entry, so Back does not bounce through the old address. */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(`#${to}`)
  }, [to])
  return null
}
