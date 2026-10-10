import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, apiConfigured, clearToken, getToken, setToken, type ApiUser } from '../lib/api'
import { AuthContext, type AuthContextValue, type RegisterInput } from './authContext'

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

  const register = useCallback(async (input: RegisterInput) => {
    const { user: created, token } = await api.register(input)
    setToken(token)
    setUser(created)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await api.me()
      setUser(current)
    } catch {
      // A failed refresh should not sign the user out mid-edit; the next
      // authenticated call will surface the real problem.
    }
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, isAdmin: user?.role === 'admin', signIn, register, signOut, refresh }),
    [user, loading, signIn, register, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
