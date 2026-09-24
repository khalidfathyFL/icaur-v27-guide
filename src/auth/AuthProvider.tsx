import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, apiConfigured, clearToken, getToken, setToken, type ApiUser } from '../lib/api'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(apiConfigured && Boolean(getToken()))

  // A stored token may be expired or belong to a since-blocked account, so it
  // is confirmed against the server before the session is treated as valid.
  useEffect(() => {
    if (!apiConfigured || !getToken()) return

    let cancelled = false

    api
      .me()
      .then(({ user: current }) => {
        if (!cancelled) setUser(current)
      })
      .catch(() => {
        if (!cancelled) {
          clearToken()
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: signedIn, token } = await api.login({ email, password })
    setToken(token)
    setUser(signedIn)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: created, token } = await api.register({ name, email, password })
    setToken(token)
    setUser(created)
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === 'admin', signIn, register, signOut }),
    [user, loading, signIn, register, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
