import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthContextValue = {
  session: Session | null
  user: User | null
  ready: boolean
  isStaff: boolean
  displayName: string
  signIn: (email: string, password: string) => Promise<void>
  signInWithMagicLink: (email: string, next?: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
