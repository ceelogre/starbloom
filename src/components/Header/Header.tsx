import { LogOut, ShoppingCart } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
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
  variant: 'admin' | 'login' | 'account'
}

type HeaderProps = ShopHeaderProps | SimpleHeaderProps

function isShopHeader(props: HeaderProps): props is ShopHeaderProps {
  return props.variant !== 'admin' && props.variant !== 'login' && props.variant !== 'account'
}

export function Header(props: HeaderProps) {
  const { session, isStaff, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const staffHref = isStaff ? '/admin' : '/admin/login'
  const trackHref = session ? '/orders' : '/login'
  const shop = isShopHeader(props) ? props : null

  const brand = (
    <>
      <span className={styles.brandMark} aria-hidden="true" />
      Starbloom
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
      <div className={styles.actions}>
        <ThemeToggle />
        {props.variant === 'admin' ? (
          <button
            type="button"
            className={styles.cartButton}
            onClick={() => {
              void signOut().then(() => navigate('/admin/login'))
            }}
          >
            <LogOut className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
            Sign out
          </button>
        ) : null}
        {props.variant === 'account' && session ? (
          <>
            {isStaff ? (
              <Link to="/admin" className={styles.staffLink}>
                Staff inbox
              </Link>
            ) : null}
            <button
              type="button"
              className={styles.cartButton}
              onClick={() => {
                void signOut().then(() => navigate('/'))
              }}
            >
              <LogOut className={styles.actionIcon} aria-hidden="true" strokeWidth={2} />
              Sign out
            </button>
          </>
        ) : null}
        {shop ? (
          <>
            <button
              type="button"
              className={styles.staffLink}
              onClick={shop.onHowItWorksClick}
            >
              How it works
            </button>
            <Link to={trackHref} className={styles.staffLink}>
              Track order
            </Link>
            <Link to={staffHref} className={styles.staffLink}>
              Staff
            </Link>
            <button
              type="button"
              className={styles.cartButton}
              onClick={shop.onCartClick}
              disabled={shop.cartCount === 0}
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
        {props.variant === 'account' && !session ? (
          <Link to={staffHref} className={styles.staffLink}>
            Staff
          </Link>
        ) : null}
      </div>
    </header>
  )
}
