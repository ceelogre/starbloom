import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '../Button/Button'
import { SelectionCard } from '../SelectionCard/SelectionCard'
import { StepLayout } from '../StepLayout/StepLayout'
import {
  DELIVERY_PRICE,
  MEAT_PRICE_PER_KG,
  MEAT_PRODUCTS,
  MEAT_QUANTITY_OPTIONS,
  SAUSAGE_LABEL,
  SAUSAGE_QUANTITY_OPTIONS,
  SAUSAGE_PRICE_PER_PACK,
  VAT_RATE,
  formatPrice,
  unitPriceFor,
  vatIncludedIn,
} from '../../data/products'
import type {
  CartItem,
  Category,
  DeliveryDetails,
  OrderStep,
} from '../../types/order'
import heroImageWebp from '../../assets/startb3.webp'
import heroImageJpg from '../../assets/startb3.jpg'
import styles from './OrderFlow.module.css'

type OrderFlowProps = {
  onCartChange: (count: number) => void
  requestedStep: OrderStep | null
  onRequestedStepHandled: () => void
}

const STEP_ORDER: Record<OrderStep, number> = {
  home: 0,
  category: 1,
  product: 2,
  quantity: 3,
  cart: 4,
  delivery: 5,
  confirmation: 6,
}

function createCartItemId() {
  return crypto.randomUUID()
}

function formatCartItem(item: CartItem) {
  if (item.category === 'meat') {
    return `${item.productName} — ${item.quantity} kg`
  }

  const packLabel = item.quantity === 1 ? 'pack' : 'packs'
  return `${SAUSAGE_LABEL} — ${item.quantity} ${packLabel}`
}

function lineTotal(item: CartItem) {
  return item.quantity * item.unitPrice
}

function cartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0)
}

function orderTotal(items: CartItem[]) {
  return cartTotal(items) + DELIVERY_PRICE
}

export function OrderFlow({
  onCartChange,
  requestedStep,
  onRequestedStepHandled,
}: OrderFlowProps) {
  const [step, setStep] = useState<OrderStep>('home')
  const [category, setCategory] = useState<Category | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [delivery, setDelivery] = useState<DeliveryDetails>({
    name: '',
    phone: '',
    address: '',
    instructions: '',
  })
  const stepRef = useRef(step)
  stepRef.current = step

  const selectedProduct = MEAT_PRODUCTS.find((product) => product.id === selectedProductId)

  const navigate = useCallback((next: OrderStep, prepare?: () => void) => {
    const current = stepRef.current
    document.documentElement.dataset.navDirection =
      STEP_ORDER[next] >= STEP_ORDER[current] ? 'forward' : 'back'

    const update = () => {
      flushSync(() => {
        prepare?.()
        setStep(next)
      })
    }

    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(update)
      return
    }

    update()
  }, [])

  function resetSelection() {
    setCategory(null)
    setSelectedProductId(null)
    setQuantity(null)
  }

  function goHome() {
    navigate('home', resetSelection)
  }

  function startOrder() {
    navigate('category', resetSelection)
  }

  function selectCategory(nextCategory: Category) {
    navigate(nextCategory === 'meat' ? 'product' : 'quantity', () => {
      setCategory(nextCategory)
      setSelectedProductId(null)
      setQuantity(null)
    })
  }

  function selectProduct(productId: string) {
    navigate('quantity', () => {
      setSelectedProductId(productId)
      setQuantity(null)
    })
  }

  function addToCart() {
    if (!category || quantity === null) {
      return
    }

    let nextItem: CartItem

    if (category === 'meat') {
      if (!selectedProduct) {
        return
      }

      nextItem = {
        id: createCartItemId(),
        category: 'meat',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity,
        unit: 'kg',
        unitPrice: unitPriceFor('meat'),
      }
    } else {
      nextItem = {
        id: createCartItemId(),
        category: 'sausage',
        quantity,
        unit: 'pack',
        unitPrice: unitPriceFor('sausage'),
      }
    }

    navigate('cart', () => {
      const nextCart = [...cart, nextItem]
      setCart(nextCart)
      onCartChange(nextCart.length)
      resetSelection()
    })
  }

  function removeFromCart(itemId: string) {
    const nextCart = cart.filter((item) => item.id !== itemId)
    setCart(nextCart)
    onCartChange(nextCart.length)

    if (nextCart.length === 0 && step === 'cart') {
      navigate('category')
    }
  }

  function placeOrder() {
    navigate('confirmation')
  }

  function orderAgain() {
    navigate('home', () => {
      resetSelection()
      setCart([])
      setDelivery({ name: '', phone: '', address: '', instructions: '' })
      onCartChange(0)
    })
  }

  useEffect(() => {
    if (requestedStep === 'home') {
      if (stepRef.current !== 'home') {
        navigate('home', resetSelection)
      }
      onRequestedStepHandled()
      return
    }

    if (requestedStep === 'cart' && cart.length > 0) {
      navigate('cart')
      onRequestedStepHandled()
    }
  }, [requestedStep, cart.length, onRequestedStepHandled, navigate])

  const canAddToCart =
    quantity !== null && (category === 'sausage' || selectedProduct !== undefined)

  const canPlaceOrder =
    delivery.name.trim().length > 0 &&
    delivery.phone.trim().length > 0 &&
    delivery.address.trim().length > 0

  if (step === 'home') {
    return (
      <StepLayout
        title="Welcome"
        subtitle="Order pork meat and sausage for delivery."
        actions={
          <Button onClick={startOrder}>Start ordering</Button>
        }
      >
        <div className={styles.heroMedia}>
          <picture>
            <source srcSet={heroImageWebp} type="image/webp" />
            <img
              className={styles.heroImage}
              src={heroImageJpg}
              alt="A sealed Starbloom delivery box carrying a fresh sausage order."
              width={1200}
              height={960}
            />
          </picture>
        </div>
        <div className={styles.heroCard}>
          <p className={styles.heroLabel}>How it works</p>
          <ol className={styles.stepsList}>
            <li>Choose meat or sausage</li>
            <li>Pick your items and quantity</li>
            <li>Add delivery instructions and place your order</li>
          </ol>
        </div>
      </StepLayout>
    )
  }

  if (step === 'category') {
    return (
      <StepLayout
        title="What to order?"
        subtitle="Choose a category to get started."
        actions={
          <Button variant="secondary" onClick={goHome}>
            Back to homepage
          </Button>
        }
      >
        <SelectionCard
          label="Meat"
          description={`${formatPrice(MEAT_PRICE_PER_KG)} per kg — pork ribs, ham, and more.`}
          icon="🥩"
          onClick={() => selectCategory('meat')}
        />
        <SelectionCard
          label="Sausage"
          description={`${formatPrice(SAUSAGE_PRICE_PER_PACK)} per pack.`}
          icon="🌭"
          onClick={() => selectCategory('sausage')}
        />
      </StepLayout>
    )
  }

  if (step === 'product') {
    return (
      <StepLayout
        title="Choose your meat"
        subtitle="Select a product, then pick the weight in kilograms."
        actions={
          <Button variant="secondary" onClick={() => navigate('category')}>
            Back
          </Button>
        }
      >
        {MEAT_PRODUCTS.map((product) => (
          <SelectionCard
            key={product.id}
            label={product.name}
            description={`${formatPrice(MEAT_PRICE_PER_KG)} per kg`}
            onClick={() => selectProduct(product.id)}
          />
        ))}
      </StepLayout>
    )
  }

  if (step === 'quantity') {
    const quantityLabel =
      category === 'meat'
        ? selectedProduct
          ? `How many kilograms of ${selectedProduct.name}?`
          : 'How many kilograms?'
        : 'How many packs of sausage?'
    const selectedLineTotal =
      quantity !== null && category
        ? quantity * unitPriceFor(category)
        : null

    return (
      <StepLayout
        title="Quantity"
        subtitle={quantityLabel}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(category === 'meat' ? 'product' : 'category')}
            >
              Back
            </Button>
            <Button onClick={addToCart} disabled={!canAddToCart}>
              {selectedLineTotal === null
                ? 'Add to cart'
                : `Add to cart · ${formatPrice(selectedLineTotal)}`}
            </Button>
          </>
        }
      >
        <div className={styles.quantityGrid} role="group" aria-label={quantityLabel}>
          {(category === 'meat' ? MEAT_QUANTITY_OPTIONS : SAUSAGE_QUANTITY_OPTIONS).map(
            (value) => (
            <button
              key={value}
              type="button"
              className={[
                styles.quantityButton,
                quantity === value ? styles.quantityButtonSelected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setQuantity(value)}
              aria-pressed={quantity === value}
            >
              {value}
              <span className={styles.quantityUnit}>
                {category === 'meat' ? 'kg' : value === 1 ? 'pack' : 'packs'}
              </span>
            </button>
          ))}
        </div>
      </StepLayout>
    )
  }

  if (step === 'cart') {
    return (
      <StepLayout
        title="Your cart"
        subtitle="Review your items before checkout."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('category')}>
              Add more items
            </Button>
            <Button onClick={() => navigate('delivery')} disabled={cart.length === 0}>
              Continue to delivery
            </Button>
          </>
        }
      >
        {cart.length === 0 ? (
          <p className={styles.emptyState}>Your cart is empty.</p>
        ) : (
          <>
            <ul className={styles.cartList}>
              {cart.map((item) => (
                <li key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <span>{formatCartItem(item)}</span>
                    <span className={styles.cartItemPrice}>{formatPrice(lineTotal(item))}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.cartTotals}>
              <p className={styles.cartSubtotal}>
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal(cart))}</span>
              </p>
              <p className={styles.cartVat}>
                <span>VAT ({Math.round(VAT_RATE * 100)}% included)</span>
                <span>{formatPrice(vatIncludedIn(cartTotal(cart)))}</span>
              </p>
              <p className={styles.cartVat}>
                <span>Delivery</span>
                <span>{formatPrice(DELIVERY_PRICE)}</span>
              </p>
              <p className={styles.cartTotal}>
                <span>Total</span>
                <span>{formatPrice(orderTotal(cart))}</span>
              </p>
            </div>
          </>
        )}
      </StepLayout>
    )
  }

  if (step === 'delivery') {
    return (
      <StepLayout
        title="Delivery instructions"
        subtitle="Tell us where to deliver and any special notes."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('cart')}>
              Back to cart
            </Button>
            <Button onClick={placeOrder} disabled={!canPlaceOrder}>
              Place order
            </Button>
          </>
        }
      >
        <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.input}
              value={delivery.name}
              onChange={(event) =>
                setDelivery((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Your full name"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Phone number</span>
            <input
              className={styles.input}
              type="tel"
              autoComplete="tel"
              value={delivery.phone}
              onChange={(event) =>
                setDelivery((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="+250 780 123 456"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Delivery address</span>
            <input
              className={styles.input}
              value={delivery.address}
              onChange={(event) =>
                setDelivery((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="Street, city, postcode"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Delivery instructions</span>
            <textarea
              className={styles.textarea}
              value={delivery.instructions}
              onChange={(event) =>
                setDelivery((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
              placeholder="preferred time, gate instructions..."
              rows={4}
            />
          </label>
        </form>
      </StepLayout>
    )
  }

  return (
    <StepLayout
      title="Order placed"
      subtitle="Thanks! We'll prepare your order for delivery."
      actions={<Button onClick={orderAgain}>Order again</Button>}
    >
      <div className={styles.summaryCard}>
        <p className={styles.summaryLabel}>Deliver to</p>
        <p className={styles.summaryValue}>{delivery.name}</p>
        <p className={styles.summaryMuted}>{delivery.phone}</p>
        <p className={styles.summaryMuted}>{delivery.address}</p>
        <p className={styles.summaryLabel}>Instructions</p>
        <p className={styles.summaryMuted}>{delivery.instructions}</p>
        <p className={styles.summaryLabel}>Items</p>
        <ul className={styles.summaryList}>
          {cart.map((item) => (
            <li key={item.id}>
              <span>{formatCartItem(item)}</span>
              <span>{formatPrice(lineTotal(item))}</span>
            </li>
          ))}
        </ul>
        <p className={styles.summarySubtotal}>
          <span>Subtotal</span>
          <span>{formatPrice(cartTotal(cart))}</span>
        </p>
        <p className={styles.summaryVat}>
          <span>VAT ({Math.round(VAT_RATE * 100)}% included)</span>
          <span>{formatPrice(vatIncludedIn(cartTotal(cart)))}</span>
        </p>
        <p className={styles.summaryVat}>
          <span>Delivery</span>
          <span>{formatPrice(DELIVERY_PRICE)}</span>
        </p>
        <p className={styles.summaryTotal}>
          <span>Total</span>
          <span>{formatPrice(orderTotal(cart))}</span>
        </p>
      </div>
    </StepLayout>
  )
}

export type { OrderStep }
