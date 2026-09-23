import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Trim } from '../content/types'
import { readStored, writeStored } from '../lib/storage'
import { TrimContext } from './trimContext'

const STORAGE_KEY = 'icaur-trim'

const isTrim = (value: unknown): value is Trim => value === 'play' || value === 'wild'

export function TrimProvider({ children }: { children: ReactNode }) {
  const [trim, setTrim] = useState<Trim>(() => {
    const stored = readStored(STORAGE_KEY)
    return isTrim(stored) ? stored : 'wild'
  })

  useEffect(() => {
    writeStored(STORAGE_KEY, trim)
  }, [trim])

  const value = useMemo(() => ({ trim, setTrim }), [trim])

  return <TrimContext.Provider value={value}>{children}</TrimContext.Provider>
}
