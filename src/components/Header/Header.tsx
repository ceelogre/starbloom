import { useEffect, useRef, useState } from 'react'
import { Menu, ShoppingCart, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { BRAND_NAME } from '../../data/brand'
import { CART_CHANGED_EVENT, loadStoredCart } from '../../lib/checkout-storage'
import { BrandMark } from '../BrandMark/BrandMark'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './Header.module.css'

function cartCountFromStorage() {
  try {
    return loadStoredCart().length
  } catch {
    return 0
  }
}

export function Header() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const trackHref = session ? '/orders' : '/login'
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(cartCountFromStorage)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function syncCartCount() {
      setCartCount(cartCountFromStorage())
    }

    window.addEventListener(CART_CHANGED_EVENT, syncCartCount)
    window.addEventListener('storage', syncCartCount)
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, syncCartCount)
      window.removeEventListener('storage', syncCartCount)
    }
  }, [])

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

  function goShop(start: 'home' | 'cart' | 'how-it-works') {
    setMenuOpen(false)
    const onShop = location.pathname === '/'
    navigate('/', { replace: onShop, state: { start } })
  }

  return (
    <header className={styles.header}>
      <Link
        to="/"
        className={styles.brand}
        onClick={(event) => {
          if (location.pathname === '/') {
            event.preventDefault()
            goShop('home')
          }
        }}
      >
        <BrandMark className={styles.brandMark} />
        {BRAND_NAME}
      </Link>
      <div className={styles.actions} ref={menuRef}>
        <ThemeToggle />
        <nav
          id="site-nav"
          className={menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
          aria-label="Site"
        >
          <button type="button" className={styles.navLink} onClick={() => goShop('how-it-works')}>
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
          aria-controls="site-nav"
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
          onClick={() => goShop('cart')}
          aria-label={`View cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
        >
          <ShoppingCart className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
          Cart
          {cartCount > 0 ? <span className={styles.cartBadge}>{cartCount}</span> : null}
        </button>
      </div>
    </header>
  )
}
