import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { HomeLanding } from '../HomeLanding/HomeLanding'
import { Button } from '../Button/Button'
import { OrderTotals } from '../OrderTotals/OrderTotals'
import { SelectionCard } from '../SelectionCard/SelectionCard'
import { StepLayout } from '../StepLayout/StepLayout'
import {
  MEAT_PRICE_PER_KG,
  MEAT_PRODUCTS,
  MEAT_QUANTITY_OPTIONS,
  SAUSAGE_QUANTITY_OPTIONS,
  SAUSAGE_PRICE_PER_PACK,
  SAUSAGE_LABEL,
  formatPrice,
  unitPriceFor,
} from '../../data/products'
import { formatCartItem, lineTotal, mergeCartItem, adjustCartQuantity, moneyFromCart, MAX_LINE_QUANTITY } from '../../lib/cart'
import { placeGuestOrder } from '../../lib/orders'
import type {
  CartItem,
  Category,
  DeliveryDetails,
  OrderStep,
} from '../../types/order'
import styles from './OrderFlow.module.css'

type OrderFlowProps = {
  onCartChange: (count: number) => void
  onStepChange: (step: OrderStep) => void
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

const CHECKOUT_PROGRESS = {
  category: { current: 1, total: 4 },
  product: { current: 1, total: 4 },
  quantity: { current: 2, total: 4 },
  cart: { current: 3, total: 4 },
  delivery: { current: 4, total: 4 },
} as const

export function OrderFlow({
  onCartChange,
  onStepChange,
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
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const { user, displayName } = useAuth()
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
      if (next !== 'home') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    }

    if (typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(update)
      void transition.finished.finally(() => {
        delete document.documentElement.dataset.navDirection
      })
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
      setCart((current) => mergeCartItem(current, nextItem))
      resetSelection()
    })
  }

  function changeCartQuantity(itemId: string, delta: number) {
    const nextCart = adjustCartQuantity(cart, itemId, delta)
    setCart(nextCart)

    if (nextCart.length === 0 && step === 'cart') {
      navigate('category')
    }
  }

  function removeFromCart(itemId: string) {
    const nextCart = cart.filter((item) => item.id !== itemId)
    setCart(nextCart)

    if (nextCart.length === 0 && step === 'cart') {
      navigate('category')
    }
  }

  async function placeOrder() {
    if (isPlacing || !canPlaceOrder || cart.length === 0) {
      return
    }

    setPlaceError(null)
    setIsPlacing(true)

    try {
      const placed = await placeGuestOrder(cart, delivery, moneyFromCart(cart))
      setOrderNumber(placed.orderNumber)
      navigate('confirmation')
    } catch (error) {
      setPlaceError(
        error instanceof Error
          ? error.message
          : 'Could not place the order. Please try again.',
      )
    } finally {
      setIsPlacing(false)
    }
  }

  function orderAgain() {
    navigate('home', () => {
      resetSelection()
      setCart([])
      setOrderNumber(null)
      setPlaceError(null)
      setDelivery({ name: '', phone: '', address: '', instructions: '' })
    })
  }

  useEffect(() => {
    onCartChange(cart.length)
  }, [cart.length, onCartChange])

  useEffect(() => {
    onStepChange(step)
  }, [step, onStepChange])

  useEffect(() => {
    if (step !== 'delivery' || !displayName) {
      return
    }

    setDelivery((current) =>
      current.name.trim() ? current : { ...current, name: displayName },
    )
  }, [step, displayName])

  useEffect(() => {
    if (!requestedStep) {
      return
    }

    if (requestedStep === 'home') {
      if (stepRef.current !== 'home') {
        navigate('home', resetSelection)
      }
    } else if (requestedStep === 'category') {
      navigate('category', resetSelection)
    } else if (requestedStep === 'product') {
      navigate('product', () => {
        setCategory('meat')
        setSelectedProductId(null)
        setQuantity(null)
      })
    } else if (requestedStep === 'quantity') {
      navigate('quantity', () => {
        setCategory('sausage')
        setSelectedProductId(null)
        setQuantity(null)
      })
    } else if (requestedStep === 'cart' && cart.length > 0) {
      navigate('cart')
    }

    onRequestedStepHandled()
  }, [requestedStep, cart.length, onRequestedStepHandled, navigate])

  const canAddToCart =
    quantity !== null && (category === 'sausage' || selectedProduct !== undefined)

  const canPlaceOrder =
    delivery.name.trim().length > 0 &&
    delivery.phone.trim().length > 0 &&
    delivery.address.trim().length > 0

  if (step === 'home') {
    return (
      <HomeLanding
        onStartOrder={startOrder}
        onStartMeat={() => selectCategory('meat')}
        onStartSausage={() => selectCategory('sausage')}
      />
    )
  }

  if (step === 'category') {
    return (
      <StepLayout
        title="What are you ordering?"
        subtitle="Pork meat by the kilogram, or sausage by the pack."
        progress={CHECKOUT_PROGRESS.category}
        actions={
          <>
            <Button variant="secondary" onClick={goHome}>
              Back to homepage
            </Button>
            {cart.length > 0 ? (
              <Button onClick={() => navigate('cart')}>View cart · {cart.length}</Button>
            ) : null}
          </>
        }
      >
        <SelectionCard
          label="Pork meat"
          description={`${MEAT_PRODUCTS.map((product) => product.name).join(' and ')} · ${formatPrice(MEAT_PRICE_PER_KG)} per kg`}
          onClick={() => selectCategory('meat')}
        />
        <SelectionCard
          label={SAUSAGE_LABEL}
          description={`${formatPrice(SAUSAGE_PRICE_PER_PACK)} per pack`}
          onClick={() => selectCategory('sausage')}
        />
      </StepLayout>
    )
  }

  if (step === 'product') {
    return (
      <StepLayout
        title="Choose your cut"
        subtitle={`${formatPrice(MEAT_PRICE_PER_KG)} per kg, VAT included.`}
        progress={CHECKOUT_PROGRESS.product}
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
    const quantityTitle =
      category === 'meat'
        ? (selectedProduct?.name ?? 'Meat')
        : SAUSAGE_LABEL
    const quantityLabel =
      category === 'meat'
        ? 'How many kilograms?'
        : 'How many packs?'
    const selectedLineTotal =
      quantity !== null && category
        ? quantity * unitPriceFor(category)
        : null

    return (
      <StepLayout
        title={quantityTitle}
        subtitle={quantityLabel}
        progress={CHECKOUT_PROGRESS.quantity}
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
        {cart.length > 0 ? (
          <p className={styles.hint}>
            {cart.length} {cart.length === 1 ? 'item' : 'items'} already in your cart.
            This line will be combined if you add the same product again.
          </p>
        ) : (
          <p className={styles.hint}>You can add more items after this.</p>
        )}
      </StepLayout>
    )
  }

  if (step === 'cart') {
    return (
      <StepLayout
        title="Your cart"
        subtitle="Adjust quantities, then continue to delivery."
        progress={CHECKOUT_PROGRESS.cart}
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
                    <span className={styles.cartItemName}>
                      {item.category === 'meat' ? item.productName : SAUSAGE_LABEL}
                    </span>
                    <span className={styles.cartItemPrice}>
                      {formatPrice(item.unitPrice)} / {item.unit}
                    </span>
                  </div>
                  <div className={styles.qtyControls}>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      onClick={() => changeCartQuantity(item.id, item.unit === 'kg' ? -0.5 : -1)}
                      aria-label={`Decrease ${item.category === 'meat' ? item.productName : SAUSAGE_LABEL}`}
                    >
                      −
                    </button>
                    <span className={styles.qtyValue}>
                      {item.quantity} {item.unit}
                      {item.unit === 'pack' && item.quantity !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      onClick={() => changeCartQuantity(item.id, item.unit === 'kg' ? 0.5 : 1)}
                      aria-label={`Increase ${item.category === 'meat' ? item.productName : SAUSAGE_LABEL}`}
                      disabled={item.quantity >= MAX_LINE_QUANTITY}
                    >
                      +
                    </button>
                  </div>
                  <div className={styles.cartItemEnd}>
                    <span className={styles.cartLineTotal}>{formatPrice(lineTotal(item))}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <OrderTotals items={cart} />
          </>
        )}
      </StepLayout>
    )
  }

  if (step === 'delivery') {
    return (
      <StepLayout
        title="Delivery details"
        subtitle="Where should we bring this order?"
        progress={CHECKOUT_PROGRESS.delivery}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('cart')}>
              Back to cart
            </Button>
            <Button
              type="submit"
              form="delivery-form"
              disabled={!canPlaceOrder || isPlacing || cart.length === 0}
            >
              {isPlacing ? 'Placing order…' : 'Place order'}
            </Button>
          </>
        }
      >
        <div className={styles.checkoutSummary}>
          <p className={styles.summaryKicker}>Your order</p>
          <ul className={styles.summaryList}>
            {cart.map((item) => (
              <li key={item.id}>
                <span>{formatCartItem(item)}</span>
                <span>{formatPrice(lineTotal(item))}</span>
              </li>
            ))}
          </ul>
          <OrderTotals items={cart} variant="inline" />
        </div>
        {placeError ? (
          <p className={styles.formError} role="alert">
            {placeError}
          </p>
        ) : null}
        <form
          id="delivery-form"
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (canPlaceOrder) {
              void placeOrder()
            }
          }}
        >
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.input}
              autoComplete="name"
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
              inputMode="tel"
              autoComplete="tel"
              minLength={9}
              value={delivery.phone}
              onChange={(event) =>
                setDelivery((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="+250 780 123 456"
              required
            />
            <span className={styles.fieldHint}>We’ll use this to confirm the delivery.</span>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Delivery address</span>
            <input
              className={styles.input}
              autoComplete="street-address"
              value={delivery.address}
              onChange={(event) =>
                setDelivery((current) => ({ ...current, address: event.target.value }))
              }
              placeholder="Street, neighbourhood, landmarks"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Notes <span className={styles.optional}>(optional)</span>
            </span>
            <textarea
              className={styles.textarea}
              value={delivery.instructions}
              onChange={(event) =>
                setDelivery((current) => ({
                  ...current,
                  instructions: event.target.value,
                }))
              }
              placeholder="Gate code, preferred time, leave with a neighbour…"
              rows={4}
            />
          </label>
        </form>
      </StepLayout>
    )
  }

  return (
    <StepLayout
      title="Order received"
      subtitle={
        orderNumber
          ? `Keep this number handy: ${orderNumber}. We’ll prepare your order for delivery.`
          : 'We’ll prepare your order for delivery.'
      }
      actions={<Button onClick={orderAgain}>Order again</Button>}
    >
      <div className={styles.summaryCard}>
        {orderNumber ? (
          <>
            <p className={styles.summaryLabel}>Order number</p>
            <p className={styles.summaryValue}>{orderNumber}</p>
          </>
        ) : null}
        <p className={styles.summaryLabel}>Deliver to</p>
        <p className={styles.summaryValue}>{delivery.name}</p>
        <p className={styles.summaryMuted}>{delivery.phone}</p>
        <p className={styles.summaryMuted}>{delivery.address}</p>
        {delivery.instructions.trim() ? (
          <>
            <p className={styles.summaryLabel}>Notes</p>
            <p className={styles.summaryMuted}>{delivery.instructions}</p>
          </>
        ) : null}
        <p className={styles.summaryLabel}>Items</p>
        <ul className={styles.summaryList}>
          {cart.map((item) => (
            <li key={item.id}>
              <span>{formatCartItem(item)}</span>
              <span>{formatPrice(lineTotal(item))}</span>
            </li>
          ))}
        </ul>
        <OrderTotals items={cart} variant="inline" />
        <p className={styles.nextStep}>
          No payment is taken here. We’ll confirm the order and arrange delivery
          by phone.
        </p>
        {user ? (
          <p className={styles.nextStep}>
            <Link to="/orders">Track this order</Link> in your account.
          </p>
        ) : (
          <p className={styles.nextStep}>
            Sign in next time to track orders from this device.{' '}
            <Link to="/login">Get a sign-in link</Link>
          </p>
        )}
      </div>
    </StepLayout>
  )
}

export type { OrderStep }
