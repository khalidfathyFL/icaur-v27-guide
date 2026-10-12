import { createContext, useContext } from 'react'
import type { ApiUser, ProfileInput } from '../lib/api'

export type RegisterInput = { name: string; email: string; password: string } & ProfileInput

export type AuthContextValue = {
  user: ApiUser | null
  /** True until the stored token has been checked against the server. */
  loading: boolean
  isAdmin: boolean
  /**
   * Mirrors the server's `hasPermission`: an admin holds every permission,
   * anyone else only what was granted to them. The server still checks every
   * call; this only decides what the panel offers.
   */
  can: (permission: string) => boolean
  /** `remember` keeps the browser signed in after it is closed. */
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
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
