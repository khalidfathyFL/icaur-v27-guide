import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStored, writeStored } from '../lib/storage'
import { ThemeContext, type Theme } from './themeContext'

const STORAGE_KEY = 'icaur-theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

/** Stored choice wins; otherwise follow the operating system. */
function preferredTheme(): Theme {
  const stored = readStored(STORAGE_KEY)
  if (isTheme(stored)) return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(preferredTheme)

  useEffect(() => {
    writeStored(STORAGE_KEY, theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
