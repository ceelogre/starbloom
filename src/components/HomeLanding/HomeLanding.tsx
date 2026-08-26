import { Package, ShoppingBag, Truck } from 'lucide-react'
import { Button } from '../Button/Button'
import { CategoryVisual } from '../CategoryVisual/CategoryVisual'
import { CITY, TAGLINE } from '../../data/brand'
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  formatPrice,
} from '../../data/products'
import { isProductSoldOut, sellableVariants } from '../../types/catalog'
import type { Product } from '../../types/catalog'
import type { Category } from '../../types/order'
import heroImageWebp from '../../assets/startb3.webp'
import heroImageJpg from '../../assets/startb3.jpg'
import styles from './HomeLanding.module.css'

type HomeLandingProps = {
  catalog: Product[]
  onStartOrder: () => void
  onStartCategory: (category: Category) => void
}

const CATEGORY_ORDER: Category[] = ['meat', 'sausage']

const TRUST = [
  'Pay on delivery',
  'No account needed',
  `Delivery across ${CITY}`,
]

const STEPS = [
  {
    title: 'Pick a product',
    body: 'Pork cuts by the kilogram, or sausage by the box or the kilo.',
    icon: 'choose' as const,
  },
  {
    title: 'Choose how much',
    body: 'Tap a quantity. Line totals update before anything goes in the cart.',
    icon: 'quantity' as const,
  },
  {
    title: 'Pay on delivery',
    body: 'Leave your name, phone, and address, then pay the driver at the door. No account needed.',
    icon: 'deliver' as const,
  },
]

type CategorySummary = {
  category: Category
  fromPrice: number | null
  fromUnit: string
  names: string
  soldOut: boolean
}

function summarise(catalog: Product[], category: Category): CategorySummary | null {
  const products = catalog.filter((product) => product.category === category)

  if (products.length === 0) {
    return null
  }

  const available = products.filter((product) => !isProductSoldOut(product))
  const cheapest = available
    .flatMap(sellableVariants)
    .sort((a, b) => a.price - b.price)[0]

  return {
    category,
    fromPrice: cheapest?.price ?? null,
    fromUnit: cheapest?.unit ?? 'kg',
    names: (available.length > 0 ? available : products)
      .map((product) => product.name)
      .join(' · '),
    soldOut: available.length === 0,
  }
}

export function HomeLanding({
  catalog,
  onStartOrder,
  onStartCategory,
}: HomeLandingProps) {
  const summaries = CATEGORY_ORDER.map((category) => summarise(catalog, category)).filter(
    (summary): summary is CategorySummary => summary !== null,
  )

  return (
    <div className={styles.page}>
      <section className={styles.jumbotron} aria-labelledby="home-heading">
        <div className={styles.jumbotronMedia} aria-hidden="true">
          <picture>
            <source srcSet={heroImageWebp} type="image/webp" />
            <img
              className={styles.jumbotronImage}
              src={heroImageJpg}
              alt=""
              width={1200}
              height={960}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <div className={styles.jumbotronInner}>
          <p className={styles.eyebrow}>
            {CITY} · {TAGLINE}
          </p>
          <h1 id="home-heading" className={styles.headline}>
            Sausage, ribs, and ham — delivered
          </h1>
          <p className={styles.lede}>
            Pork and beef sausage, packed to order, plus ribs and ham. We bring it to
            your door.
          </p>
          <div className={styles.ctas}>
            <Button onClick={onStartOrder}>Start ordering</Button>
            <a className={styles.ghostLink} href="#menu">
              See the menu
            </a>
          </div>
          <ul className={styles.trust}>
            {TRUST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <dl className={styles.highlights}>
            {summaries.map((summary) =>
              summary.fromPrice === null ? null : (
                <div key={summary.category}>
                  <dt>{CATEGORY_LABELS[summary.category]}</dt>
                  <dd>
                    {formatPrice(summary.fromPrice)}
                    <span> per {summary.fromUnit}</span>
                  </dd>
                </div>
              ),
            )}
          </dl>
        </div>
      </section>

      <section id="menu" className={styles.menu} aria-labelledby="menu-heading">
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <h2 id="menu-heading" className={styles.sectionTitle}>
              What you can order today
            </h2>
            <p className={styles.sectionLede}>
              Ready for quality sausages at a competitive price?
            </p>
          </div>
          <div className={styles.menuGrid}>
            {summaries.map((summary) => (
              <button
                key={summary.category}
                type="button"
                className={styles.menuCard}
                onClick={() => onStartCategory(summary.category)}
                disabled={summary.soldOut}
              >
                <CategoryVisual category={summary.category} className={styles.menuVisual} />
                <p className={styles.menuKicker}>
                  {CATEGORY_DESCRIPTIONS[summary.category]}
                </p>
                <h3 className={styles.menuTitle}>{CATEGORY_LABELS[summary.category]}</h3>
                <p className={styles.menuMeta}>{summary.names}</p>
                {summary.fromPrice === null ? null : (
                  <p className={styles.menuPrice}>
                    {formatPrice(summary.fromPrice)}
                    <span> / {summary.fromUnit}</span>
                  </p>
                )}
                <span className={styles.menuAction}>
                  {summary.soldOut
                    ? 'Sold out'
                    : `Order ${CATEGORY_LABELS[summary.category].toLowerCase()}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className={styles.how}
        aria-labelledby="how-heading"
      >
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>How it works</p>
          <div className={styles.sectionIntro}>
            <h2 id="how-heading" className={styles.sectionTitle}>
              Order in three steps
            </h2>
            <p className={styles.sectionLede}>
              No account, and nothing to pay up front. Add items to a cart, tell us
              where to deliver, and we take it from there.
            </p>
          </div>
          <ol className={styles.stepGrid}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.stepCard}>
                <div className={styles.stepVisual}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    <StepIcon name={step.icon} />
                  </span>
                  <span className={styles.stepIndex}>
                    Step {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}

function StepIcon({ name }: { name: (typeof STEPS)[number]['icon'] }) {
  const props = { strokeWidth: 1.75, absoluteStrokeWidth: true }

  if (name === 'choose') {
    return <ShoppingBag {...props} />
  }

  if (name === 'quantity') {
    return <Package {...props} />
  }

  return <Truck {...props} />
}
