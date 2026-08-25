import { Package, ShoppingBag, Truck } from 'lucide-react'
import { Button } from '../Button/Button'
import {
  DELIVERY_PRICE,
  MEAT_PRICE_PER_KG,
  MEAT_PRODUCTS,
  SAUSAGE_LABEL,
  SAUSAGE_PRICE_PER_PACK,
  VAT_RATE,
  formatPrice,
} from '../../data/products'
import heroImageWebp from '../../assets/startb3.webp'
import heroImageJpg from '../../assets/startb3.jpg'
import styles from './HomeLanding.module.css'

type HomeLandingProps = {
  onStartOrder: () => void
  onStartMeat: () => void
  onStartSausage: () => void
}

const STEPS = [
  {
    title: 'Pick a product',
    body: 'Pork ribs and ham by the kilogram, or sausage by the pack.',
    icon: 'choose' as const,
  },
  {
    title: 'Choose how much',
    body: 'Tap a quantity. Line totals update before anything goes in the cart.',
    icon: 'quantity' as const,
  },
  {
    title: 'Add delivery details',
    body: 'Name, phone, address, and any notes. Then place the order — no account needed.',
    icon: 'deliver' as const,
  },
]

export function HomeLanding({
  onStartOrder,
  onStartMeat,
  onStartSausage,
}: HomeLandingProps) {
  const vatPercent = Math.round(VAT_RATE * 100)
  const meatNames = MEAT_PRODUCTS.map((product) => product.name.toLowerCase()).join(' and ')

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
          <p className={styles.eyebrow}>Kigali · Prepared to order</p>
          <h1 id="home-heading" className={styles.headline}>
            Pork ribs, ham, and sausage — delivered
          </h1>
          <p className={styles.lede}>
            Order from Starbloom in a few steps. We pack fresh pork and bring it
            to your door. Prices below already include VAT.
          </p>
          <div className={styles.ctas}>
            <Button onClick={onStartOrder}>Start ordering</Button>
            <a className={styles.ghostLink} href="#menu">
              See the menu
            </a>
          </div>
          <dl className={styles.highlights}>
            <div>
              <dt>Meat</dt>
              <dd>
                {formatPrice(MEAT_PRICE_PER_KG)}
                <span> per kg</span>
              </dd>
            </div>
            <div>
              <dt>Sausage</dt>
              <dd>
                {formatPrice(SAUSAGE_PRICE_PER_PACK)}
                <span> per pack</span>
              </dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>
                {formatPrice(DELIVERY_PRICE)}
                <span> across Kigali</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="menu" className={styles.menu} aria-labelledby="menu-heading">
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Menu</p>
          <div className={styles.sectionIntro}>
            <h2 id="menu-heading" className={styles.sectionTitle}>
              What you can order today
            </h2>
            <p className={styles.sectionLede}>
              Two ranges, one checkout. VAT ({vatPercent}%) is included in every
              listed price.
            </p>
          </div>
          <div className={styles.menuGrid}>
            <button type="button" className={styles.menuCard} onClick={onStartMeat}>
              <p className={styles.menuKicker}>By the kilogram</p>
              <h3 className={styles.menuTitle}>Pork meat</h3>
              <p className={styles.menuMeta}>{meatNames}</p>
              <p className={styles.menuPrice}>
                {formatPrice(MEAT_PRICE_PER_KG)}
                <span> / kg</span>
              </p>
              <span className={styles.menuAction}>Order meat</span>
            </button>
            <button
              type="button"
              className={styles.menuCard}
              onClick={onStartSausage}
            >
              <p className={styles.menuKicker}>By the pack</p>
              <h3 className={styles.menuTitle}>{SAUSAGE_LABEL}</h3>
              <p className={styles.menuMeta}>Ready-quality packs for the table</p>
              <p className={styles.menuPrice}>
                {formatPrice(SAUSAGE_PRICE_PER_PACK)}
                <span> / pack</span>
              </p>
              <span className={styles.menuAction}>Order sausage</span>
            </button>
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
              No account. Add items to a cart, tell us where to deliver, and we
              take it from there.
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
