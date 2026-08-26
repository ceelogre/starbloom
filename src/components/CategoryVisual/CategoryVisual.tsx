import type { Category } from '../../types/order'
import { BrandMark } from '../BrandMark/BrandMark'
import heroImageWebp from '../../assets/startb3.webp'
import heroImageJpg from '../../assets/startb3.jpg'
import styles from './CategoryVisual.module.css'

type CategoryVisualProps = {
  category: Category
  className?: string
}

export function CategoryVisual({ category, className }: CategoryVisualProps) {
  const classes = [styles.visual, className].filter(Boolean).join(' ')

  if (category === 'sausage') {
    return (
      <span className={classes}>
        <picture>
          <source srcSet={heroImageWebp} type="image/webp" />
          <img className={styles.photo} src={heroImageJpg} alt="" width={600} height={480} />
        </picture>
      </span>
    )
  }

  return (
    <span className={`${classes} ${styles.markPanel}`}>
      <BrandMark className={styles.mark} />
    </span>
  )
}
