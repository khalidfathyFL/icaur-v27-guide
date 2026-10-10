import { createContext, useContext } from 'react'
import type { ApiUser, ProfileInput } from '../lib/api'

export type RegisterInput = { name: string; email: string; password: string } & ProfileInput

export type AuthContextValue = {
  user: ApiUser | null
  /** True until the stored token has been checked against the server. */
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  signOut: () => void
  /** Re-reads the signed-in user, after a profile change for example. */
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside an AuthProvider')
  return value
}
