import { createContext, useContext } from 'react'
import type { ApiUser } from '../lib/api'

export type AuthContextValue = {
  user: ApiUser | null
  /** True until the stored token has been checked against the server. */
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside an AuthProvider')
  return value
}
