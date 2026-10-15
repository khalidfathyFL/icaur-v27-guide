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

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const { user: signedIn, token } = await api.login({ email, password, remember })
    setToken(token, remember)
    // The login answer is the bare account; the full one carries permissions,
    // roles and any listings run as a merchant, which decide what the panel offers.
    const full = await api.me().then(({ user: current }) => current).catch(() => signedIn)
    setUser(full)
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

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = user?.role === 'admin'
    const granted = new Set(user?.permissions ?? [])
    // A merchant holds no permission over the whole catalog, only over their
    // own listings; these two keys let the panel offer them that section.
    if (user?.manages?.insurers.length) granted.add('merchant.insurer')
    if (user?.manages?.centers.length) granted.add('merchant.center')
    if (user?.manages?.installers?.length) granted.add('merchant.installer')
    const can = (permission: string) => isAdmin || granted.has(permission)
    return { user, loading, isAdmin, can, signIn, register, signOut, refresh }
  }, [user, loading, signIn, register, signOut, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
