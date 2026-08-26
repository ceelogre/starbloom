import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Menu, User, X, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { BRAND_NAME } from '../../data/brand'
import { BrandMark } from '../BrandMark/BrandMark'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './DashboardShell.module.css'

export type DashboardNavItem = {
  to: string
  label: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

type DashboardShellProps = {
  brandTo: string
  kicker?: string
  navLabel: string
  items: DashboardNavItem[]
  extras?: DashboardNavItem[]
  accountTo?: string
  signOutTo: string
}

export function DashboardShell({
  brandTo,
  kicker,
  navLabel,
  items,
  extras = [],
  accountTo = '/orders',
  signOutTo,
}: DashboardShellProps) {
  const { signOut, displayName, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileLabel = displayName.trim() || user?.email || 'Profile'

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen && !profileOpen) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      if (profileOpen) {
        setProfileOpen(false)
        return
      }

      setMenuOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, profileOpen])

  useEffect(() => {
    if (!profileOpen) {
      return
    }

    function onPointerDown(event: PointerEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [profileOpen])

  const brand = (
    <>
      <BrandMark className={styles.brandMark} />
      <span>
        {BRAND_NAME}
        {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
      </span>
    </>
  )

  function renderItem(item: DashboardNavItem) {
    const Icon = item.icon
    const active = item.isActive(location.pathname)

    return (
      <NavLink
        key={`${item.to}-${item.label}`}
        to={item.to}
        className={[styles.tab, active ? styles.tabActive : ''].filter(Boolean).join(' ')}
        onClick={() => setMenuOpen(false)}
      >
        <Icon className={styles.tabIcon} aria-hidden="true" strokeWidth={2} />
        {item.label}
      </NavLink>
    )
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topBarStart}>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="dashboard-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => {
              setProfileOpen(false)
              setMenuOpen((open) => !open)
            }}
          >
            {menuOpen ? (
              <X className={styles.actionIcon} strokeWidth={2} />
            ) : (
              <Menu className={styles.actionIcon} strokeWidth={2} />
            )}
          </button>
          <Link to={brandTo} className={`${styles.brand} ${styles.brandTop}`}>
            {brand}
          </Link>
        </div>
        <div className={styles.profile} ref={profileRef}>
          <button
            type="button"
            className={styles.profileButton}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-controls="profile-menu"
            onClick={() => {
              setMenuOpen(false)
              setProfileOpen((open) => !open)
            }}
          >
            <User className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
            <span className={styles.profileName}>{profileLabel}</span>
            <ChevronDown className={styles.profileChevron} aria-hidden="true" strokeWidth={2} />
          </button>
          {profileOpen ? (
            <div id="profile-menu" className={styles.profileMenu} role="menu">
              {user?.email ? (
                <p className={styles.profileEmail}>{user.email}</p>
              ) : null}
              <Link
                to={accountTo}
                role="menuitem"
                className={styles.profileItem}
                onClick={() => setProfileOpen(false)}
              >
                <User className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
                Account
              </Link>
              <button
                type="button"
                role="menuitem"
                className={styles.profileItem}
                onClick={() => {
                  setProfileOpen(false)
                  void signOut().then(() => navigate(signOutTo))
                }}
              >
                <LogOut className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {menuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        id="dashboard-nav"
        className={menuOpen ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
      >
        <Link to={brandTo} className={`${styles.brand} ${styles.brandSidebar}`}>
          {brand}
        </Link>
        <nav className={styles.nav} aria-label={navLabel}>
          {items.map(renderItem)}
        </nav>
        <div className={styles.footer}>
          {extras.map(renderItem)}
          <ThemeToggle />
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
