import styles from './Header.module.css'

const navItems = [
  { label: 'Docs', href: '#' },
  { label: 'Components', href: '#' },
  { label: 'GitHub', href: 'https://github.com' },
]

export function Header() {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.brand}>
        Starbloom
      </a>
      <nav className={styles.nav} aria-label="Main">
        {navItems.map((item) => (
          <a key={item.label} href={item.href} className={styles.navLink}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
