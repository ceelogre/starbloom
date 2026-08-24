import { NavLink, Outlet } from 'react-router'
import styles from '../../App.module.css'
import { Header } from '../../components/Header/Header'
import adminStyles from './AdminShell.module.css'

const TABS = [
  { to: '/admin', label: 'Orders', end: true },
  { to: '/admin/inventory', label: 'Inventory', end: false },
]

export function AdminShell() {
  return (
    <div className={styles.layout}>
      <Header variant="admin" />
      <nav className={adminStyles.nav} aria-label="Admin sections">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              [adminStyles.tab, isActive ? adminStyles.tabActive : '']
                .filter(Boolean)
                .join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <main className={adminStyles.main}>
        <Outlet />
      </main>
    </div>
  )
}
