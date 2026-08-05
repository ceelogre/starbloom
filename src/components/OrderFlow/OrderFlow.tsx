import { useEffect, useState } from 'react'
import { Button } from '../Button/Button'
import { SelectionCard } from '../SelectionCard/SelectionCard'
import { StepLayout } from '../StepLayout/StepLayout'
import { MEAT_PRODUCTS, QUANTITY_OPTIONS, SAUSAGE_LABEL } from '../../data/products'
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
    address: '',
    instructions: '',
  })

  const selectedProduct = MEAT_PRODUCTS.find((product) => product.id === selectedProductId)

  function resetSelection() {
    setCategory(null)
    setSelectedProductId(null)
    setQuantity(null)
  }

  function goHome() {
    resetSelection()
    setStep('home')
  }

  function startOrder() {
    resetSelection()
    setStep('category')
  }

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory)
    setSelectedProductId(null)
    setQuantity(null)
    setStep(nextCategory === 'meat' ? 'product' : 'quantity')
  }

  function selectProduct(productId: string) {
    setSelectedProductId(productId)
    setQuantity(null)
    setStep('quantity')
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
      }
    } else {
      nextItem = {
        id: createCartItemId(),
        category: 'sausage',
        quantity,
        unit: 'pack',
      }
    }

    const nextCart = [...cart, nextItem]
    setCart(nextCart)
    onCartChange(nextCart.length)
    resetSelection()
    setStep('cart')
  }

  function removeFromCart(itemId: string) {
    const nextCart = cart.filter((item) => item.id !== itemId)
    setCart(nextCart)
    onCartChange(nextCart.length)

    if (nextCart.length === 0 && step === 'cart') {
      setStep('category')
    }
  }

  function placeOrder() {
    setStep('confirmation')
  }

  function orderAgain() {
    resetSelection()
    setCart([])
    setDelivery({ name: '', address: '', instructions: '' })
    onCartChange(0)
    setStep('home')
  }

  useEffect(() => {
    if (requestedStep === 'cart' && cart.length > 0) {
      setStep('cart')
      onRequestedStepHandled()
    }
  }, [requestedStep, cart.length, onRequestedStepHandled])

  const canAddToCart =
    quantity !== null && (category === 'sausage' || selectedProduct !== undefined)

  const canPlaceOrder =
    delivery.name.trim().length > 0 &&
    delivery.address.trim().length > 0 &&
    delivery.instructions.trim().length > 0

  if (step === 'home') {
    return (
      <StepLayout
        title="Welcome"
        subtitle="Order fresh meat and sausage for delivery."
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
          description="Pork ribs, ham, and more — sold by the kilogram."
          icon="🥩"
          onClick={() => selectCategory('meat')}
        />
        <SelectionCard
          label="Sausage"
          description="Sold in packs — choose how many you need."
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
          <Button variant="secondary" onClick={() => setStep('category')}>
            Back
          </Button>
        }
      >
        {MEAT_PRODUCTS.map((product) => (
          <SelectionCard
            key={product.id}
            label={product.name}
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

    return (
      <StepLayout
        title="Quantity"
        subtitle={quantityLabel}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setStep(category === 'meat' ? 'product' : 'category')}
            >
              Back
            </Button>
            <Button onClick={addToCart} disabled={!canAddToCart}>
              Add to cart
            </Button>
          </>
        }
      >
        <div className={styles.quantityGrid} role="group" aria-label={quantityLabel}>
          {QUANTITY_OPTIONS.map((value) => (
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
            <Button variant="secondary" onClick={() => setStep('category')}>
              Add more items
            </Button>
            <Button onClick={() => setStep('delivery')} disabled={cart.length === 0}>
              Continue to delivery
            </Button>
          </>
        }
      >
        {cart.length === 0 ? (
          <p className={styles.emptyState}>Your cart is empty.</p>
        ) : (
          <ul className={styles.cartList}>
            {cart.map((item) => (
              <li key={item.id} className={styles.cartItem}>
                <span>{formatCartItem(item)}</span>
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
            <Button variant="secondary" onClick={() => setStep('cart')}>
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
              placeholder="Gate code, preferred time, drop-off notes..."
              rows={4}
              required
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
        <p className={styles.summaryMuted}>{delivery.address}</p>
        <p className={styles.summaryLabel}>Instructions</p>
        <p className={styles.summaryMuted}>{delivery.instructions}</p>
        <p className={styles.summaryLabel}>Items</p>
        <ul className={styles.summaryList}>
          {cart.map((item) => (
            <li key={item.id}>{formatCartItem(item)}</li>
          ))}
        </ul>
      </div>
    </StepLayout>
  )
}

export type { OrderStep }
