import { Link } from 'react-router'
import { BRAND_NAME, CITY, INSTAGRAM_URL, TAGLINE, WHATSAPP_URL } from '../../data/brand'
import { BrandMark } from '../BrandMark/BrandMark'
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
            <BrandMark className={styles.brandMark} />
            {BRAND_NAME}
          </a>
          <p className={styles.tagline}>
            {TAGLINE}. Pork and beef sausage, ribs, and ham — prepared to order and
            delivered across {CITY}.
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
          <p>{CITY}, Rwanda</p>
          <button type="button" className={styles.navButton} onClick={onHowItWorksClick}>
            How it works
          </button>
          <Link to="/contact" className={styles.navLink}>
            Contact
          </Link>
          {INSTAGRAM_URL ? (
            <a className={styles.navLink} href={INSTAGRAM_URL} rel="noreferrer" target="_blank">
              Instagram
            </a>
          ) : null}
          {WHATSAPP_URL ? (
            <a className={styles.navLink} href={WHATSAPP_URL} rel="noreferrer" target="_blank">
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
      <div className={styles.legalRow}>
        <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
        <Link to="/admin/login" className={styles.staff}>
          Staff sign in
        </Link>
      </div>
    </footer>
  )
}
