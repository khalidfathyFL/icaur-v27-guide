/**
 * localStorage access that never throws. Private-mode browsers and blocked
 * site data make both reads and writes throw, and a preference is never worth
 * taking the app down for.
 */

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* preference is not persisted; the session still works */
  }
}

/** The same, for sessionStorage: kept only until the browser is closed. */
export function readSessionStored(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSessionStored(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    /* not persisted; the in-memory session still works until reload */
  }
}
