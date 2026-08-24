import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import styles from './ProtectedRoute.module.css'

type ProtectedRouteProps = {
  staffOnly?: boolean
}

export function ProtectedRoute({ staffOnly = false }: ProtectedRouteProps) {
  const { session, ready, isStaff } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <p className={styles.status}>Loading…</p>
  }

  if (!session) {
    const to = staffOnly ? '/admin/login' : '/login'
    return <Navigate to={to} replace state={{ from: location.pathname }} />
  }

  if (staffOnly && !isStaff) {
    return <Navigate to="/orders" replace />
  }

  return <Outlet />
}
