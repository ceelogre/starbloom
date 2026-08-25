import { Outlet } from 'react-router'
import styles from '../../App.module.css'
import { Header } from '../../components/Header/Header'
import adminStyles from './AdminShell.module.css'

export function AdminShell() {
  return (
    <div className={styles.layout}>
      <Header variant="admin" />
      <main className={adminStyles.main}>
        <Outlet />
      </main>
    </div>
  )
}
