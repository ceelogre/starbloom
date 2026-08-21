import styles from './Header.module.css'

type HeaderProps = {
  cartCount: number
  onCartClick: () => void
}

export function Header({ cartCount, onCartClick }: HeaderProps) {
  return (
    <header className={styles.header}>
      <span className={styles.brand}>Starbloom</span>
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
