import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Header } from '../components/Header/Header'
import { clearAuthNext, peekAuthNext } from '../lib/auth-redirect'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import styles from '../components/ProtectedRoute/ProtectedRoute.module.css'

export function AuthCallbackPage() {
  const { session, ready } = useAuth()
  const [waited, setWaited] = useState(false)
  const [next] = useState(() => peekAuthNext())

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      void supabase.auth.exchangeCodeForSession(code)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 4000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (session) {
      clearAuthNext()
    }
  }, [session])

  if (session) {
    return <Navigate to={next} replace />
  }

  if (ready && waited && !session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <Header variant="account" />
      <p className={styles.status}>Signing you in…</p>
    </div>
  )
}
