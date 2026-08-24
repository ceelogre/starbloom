import { Outlet } from 'react-router'
import styles from '../../App.module.css'
import { Header } from '../../components/Header/Header'
import adminStyles from '../admin/AdminShell.module.css'

export function CustomerShell() {
  return (
    <div className={styles.layout}>
      <Header variant="account" />
      <main className={adminStyles.main}>
        <Outlet />
      </main>
    </div>
  )
}
