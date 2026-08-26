import { useEffect, useRef, useState } from 'react'
import { Menu, ShoppingCart, X } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { BRAND_NAME } from '../../data/brand'
import { BrandMark } from '../BrandMark/BrandMark'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './Header.module.css'

type ShopHeaderProps = {
  variant?: 'shop'
  cartCount: number
  onCartClick: () => void
  onHomeClick: () => void
  onHowItWorksClick: () => void
}

type SimpleHeaderProps = {
  variant: 'login' | 'account'
}

type HeaderProps = ShopHeaderProps | SimpleHeaderProps

function isShopHeader(props: HeaderProps): props is ShopHeaderProps {
  return props.variant !== 'login' && props.variant !== 'account'
}

export function Header(props: HeaderProps) {
  const { session } = useAuth()
  const location = useLocation()
  const trackHref = session ? '/orders' : '/login'
  const shop = isShopHeader(props) ? props : null
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  const brand = (
    <>
      <BrandMark className={styles.brandMark} />
      {BRAND_NAME}
    </>
  )

  return (
    <header className={styles.header}>
      {shop ? (
        <a
          href="/"
          className={styles.brand}
          onClick={(event) => {
            if (location.pathname === '/') {
              event.preventDefault()
              shop.onHomeClick()
            }
          }}
        >
          {brand}
        </a>
      ) : (
        <Link to="/" className={styles.brand}>
          {brand}
        </Link>
      )}
      <div className={styles.actions} ref={menuRef}>
        <ThemeToggle />
        {shop ? (
          <>
            <nav
              id="shop-nav"
              className={menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
              aria-label="Shop"
            >
              <button
                type="button"
                className={styles.navLink}
                onClick={() => {
                  setMenuOpen(false)
                  shop.onHowItWorksClick()
                }}
              >
                How it works
              </button>
              <Link to="/contact" className={styles.navLink} onClick={() => setMenuOpen(false)}>
                Contact
              </Link>
              <Link to={trackHref} className={styles.navLink} onClick={() => setMenuOpen(false)}>
                Track order
              </Link>
            </nav>
            <button
              type="button"
              className={styles.menuButton}
              aria-expanded={menuOpen}
              aria-controls="shop-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X className={styles.actionIcon} strokeWidth={2} />
              ) : (
                <Menu className={styles.actionIcon} strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              className={styles.cartButton}
              onClick={shop.onCartClick}
              aria-label={`View cart with ${shop.cartCount} ${shop.cartCount === 1 ? 'item' : 'items'}`}
            >
              <ShoppingCart className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
              Cart
              {shop.cartCount > 0 ? (
                <span className={styles.cartBadge}>{shop.cartCount}</span>
              ) : null}
            </button>
          </>
        ) : null}
      </div>
    </header>
  )
}
