import { Link } from 'react-router'
import { DELIVERY_PRICE, VAT_RATE, formatPrice } from '../../data/products'
import styles from './Footer.module.css'

type FooterProps = {
  onStartOrder: () => void
  onStartMeat: () => void
  onStartSausage: () => void
  onHomeClick: () => void
  onHowItWorksClick: () => void
}

export function Footer({
  onStartOrder,
  onStartMeat,
  onStartSausage,
  onHomeClick,
  onHowItWorksClick,
}: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <a
            href="/"
            className={styles.brand}
            onClick={(event) => {
              event.preventDefault()
              onHomeClick()
            }}
          >
            <span className={styles.brandMark} aria-hidden="true" />
            Starbloom
          </a>
          <p className={styles.tagline}>
            Pork meat and sausage prepared to order, delivered across Kigali.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Shop">
          <p className={styles.navLabel}>Order</p>
          <button type="button" className={styles.navButton} onClick={onStartMeat}>
            Pork meat
          </button>
          <button type="button" className={styles.navButton} onClick={onStartSausage}>
            Sausage
          </button>
          <button type="button" className={styles.navButton} onClick={onStartOrder}>
            Full menu
          </button>
        </nav>
        <div className={styles.contact}>
          <p className={styles.navLabel}>Visit</p>
          <p>Kigali, Rwanda</p>
          <p>Delivery {formatPrice(DELIVERY_PRICE)}</p>
          <p>Prices include {Math.round(VAT_RATE * 100)}% VAT</p>
          <button type="button" className={styles.navButton} onClick={onHowItWorksClick}>
            How it works
          </button>
        </div>
      </div>
      <div className={styles.legalRow}>
        <p>© {new Date().getFullYear()} Starbloom. All rights reserved.</p>
        <Link to="/admin/login" className={styles.staff}>
          Staff sign in
        </Link>
      </div>
    </footer>
  )
}
