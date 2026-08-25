import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

type ProfileRow = {
  role: 'customer' | 'staff'
  display_name: string
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [ready, setReady] = useState(!isSupabaseConfigured())

  const applySession = useCallback(async (nextSession: Session | null) => {
    const nextUser = nextSession?.user ?? null

    if (!nextUser) {
      setSession(null)
      setUser(null)
      setIsStaff(false)
      setDisplayName('')
      return
    }

    let { data } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', nextUser.id)
      .maybeSingle()

    if (!data) {
      await new Promise((resolve) => window.setTimeout(resolve, 400))
      const retry = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', nextUser.id)
        .maybeSingle()
      data = retry.data
    }

    const profile = data as ProfileRow | null
    setSession(nextSession)
    setUser(nextUser)
    setIsStaff(profile?.role === 'staff')
    setDisplayName(
      profile?.display_name?.trim() ||
        (typeof nextUser.user_metadata?.display_name === 'string'
          ? nextUser.user_metadata.display_name
          : '') ||
        nextUser.email?.split('@')[0] ||
        '',
    )
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    let cancelled = false

    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) {
        return
      }
      await applySession(data.session)
      if (!cancelled) {
        setReady(true)
      }
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.',
      )
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.',
      )
    }

    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      ready,
      isStaff,
      displayName,
      signIn,
      signInWithMagicLink,
      signOut,
    }),
    [session, user, ready, isStaff, displayName, signIn, signInWithMagicLink, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
