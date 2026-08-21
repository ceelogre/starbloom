import styles from './Header.module.css'

type HeaderProps = {
  cartCount: number
  onCartClick: () => void
  onHomeClick: () => void
}

export function Header({ cartCount, onCartClick, onHomeClick }: HeaderProps) {
  return (
    <header className={styles.header}>
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
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cartButton}
          onClick={onCartClick}
          disabled={cartCount === 0}
          aria-label={`View cart with ${cartCount} items`}
        >
          Cart
          {cartCount > 0 ? <span className={styles.cartBadge}>{cartCount}</span> : null}
        </button>
      </div>
    </header>
  )
}
