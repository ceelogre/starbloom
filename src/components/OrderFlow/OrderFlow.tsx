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
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  TAG_LABELS,
  formatPrice,
  formatQuantity,
  quantityOptionsFor,
  quantityStepFor,
} from '../../data/products'
import { fetchCatalog } from '../../lib/catalog'
import {
  formatCartItem,
  lineTotal,
  maxQuantityFor,
  mergeCartItem,
  adjustCartQuantity,
  MAX_LINE_QUANTITY,
} from '../../lib/cart'
import { placeGuestOrder } from '../../lib/orders'
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  UPCOMING_PAYMENT_METHODS,
} from '../../lib/payment'
import { cheapestPrice, isProductSoldOut, sellableVariants } from '../../types/catalog'
import type { Product, ProductTag, ProductVariant } from '../../types/catalog'
import type {
  CartItem,
  Category,
  DeliveryDetails,
  OrderStep,
  PaymentMethod,
} from '../../types/order'
import styles from './OrderFlow.module.css'

export type StepRequest = {
  step: OrderStep
  category?: Category
}

type OrderFlowProps = {
  onCartChange: (count: number) => void
  onStepChange: (step: OrderStep) => void
  requestedStep: StepRequest | null
  onRequestedStepHandled: () => void
}

const STEP_ORDER: Record<OrderStep, number> = {
  home: 0,
  category: 1,
  product: 2,
  variant: 3,
  quantity: 4,
  cart: 5,
  payment: 6,
  delivery: 7,
  confirmation: 8,
}

const CATEGORY_ORDER: Category[] = ['meat', 'sausage']
const TAG_ORDER: ProductTag[] = ['smoked', 'fresh']

function createCartItemId() {
  return crypto.randomUUID()
}

/** Picking a variant and a quantity read as one "how much?" step. */
const CHECKOUT_PROGRESS = {
  category: { current: 1, total: 6 },
  product: { current: 2, total: 6 },
  variant: { current: 3, total: 6 },
  quantity: { current: 3, total: 6 },
  cart: { current: 4, total: 6 },
  payment: { current: 5, total: 6 },
  delivery: { current: 6, total: 6 },
} as const

function variantDescription(variant: ProductVariant) {
  const price = `${formatPrice(variant.price)} / ${variant.unit}`

  // Only worth mentioning stock when it limits what can be ordered.
  if (!variant.trackStock || variant.stockQuantity > MAX_LINE_QUANTITY) {
    return price
  }

  return `${price} · ${formatQuantity(variant.stockQuantity, variant.unit)} left`
}

export function OrderFlow({
  onCartChange,
  onStepChange,
  requestedStep,
  onRequestedStepHandled,
}: OrderFlowProps) {
  const [step, setStep] = useState<OrderStep>('home')
  const [catalog, setCatalog] = useState<Product[]>([])
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [category, setCategory] = useState<Category | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    DEFAULT_PAYMENT_METHOD,
  )
  const [delivery, setDelivery] = useState<DeliveryDetails>({
    name: '',
    phone: '',
    email: '',
    address: '',
    instructions: '',
  })
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState<string | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const { user, displayName } = useAuth()
  const stepRef = useRef(step)
  stepRef.current = step

  const selectedProduct = catalog.find((product) => product.id === selectedProductId)
  const selectedVariant = selectedProduct?.variants.find(
    (variant) => variant.id === selectedVariantId,
  )

  const loadCatalog = useCallback(async () => {
    setCatalogError(null)
    try {
      setCatalog(await fetchCatalog())
    } catch (error) {
      setCatalogError(
        error instanceof Error ? error.message : 'Could not load the menu.',
      )
    } finally {
      setIsLoadingCatalog(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

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
    setSelectedVariantId(null)
    setQuantity(null)
  }

  function goHome() {
    navigate('home', resetSelection)
  }

  function startOrder() {
    navigate('category', resetSelection)
  }

  function selectCategory(nextCategory: Category) {
    navigate('product', () => {
      setCategory(nextCategory)
      setSelectedProductId(null)
      setSelectedVariantId(null)
      setQuantity(null)
    })
  }

  function selectProduct(product: Product) {
    const options = sellableVariants(product)

    if (options.length === 0) {
      return
    }

    // One way to buy it means there is nothing to choose between.
    const only = options.length === 1 ? options[0] : null

    navigate(only ? 'quantity' : 'variant', () => {
      setCategory(product.category)
      setSelectedProductId(product.id)
      setSelectedVariantId(only?.id ?? null)
      setQuantity(null)
    })
  }

  function selectVariant(variantId: string) {
    navigate('quantity', () => {
      setSelectedVariantId(variantId)
      setQuantity(null)
    })
  }

  function backFromQuantity() {
    if (!selectedProduct || sellableVariants(selectedProduct).length <= 1) {
      navigate('product')
      return
    }

    navigate('variant')
  }

  function addToCart() {
    if (!selectedProduct || !selectedVariant || quantity === null) {
      return
    }

    const nextItem: CartItem = {
      id: createCartItemId(),
      category: selectedProduct.category,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      variantId: selectedVariant.id,
      variantLabel: selectedVariant.label,
      quantity,
      unit: selectedVariant.unit,
      unitPrice: selectedVariant.price,
      stockLimit: selectedVariant.trackStock ? selectedVariant.stockQuantity : null,
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

  function selectPaymentMethod(method: PaymentMethod) {
    navigate('delivery', () => setPaymentMethod(method))
  }

  async function placeOrder() {
    if (isPlacing || !canPlaceOrder || cart.length === 0) {
      return
    }

    setPlaceError(null)
    setIsPlacing(true)

    try {
      const placed = await placeGuestOrder(cart, delivery, paymentMethod)
      setOrderNumber(placed.orderNumber)
      navigate('confirmation')
    } catch (error) {
      setPlaceError(
        error instanceof Error
          ? error.message
          : 'Could not place the order. Please try again.',
      )
      // Stock may have moved while the customer was filling the form.
      void loadCatalog()
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
      setPaymentMethod(DEFAULT_PAYMENT_METHOD)
      setDelivery({ name: '', phone: '', email: '', address: '', instructions: '' })
    })
    void loadCatalog()
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

    if (requestedStep.step === 'home') {
      if (stepRef.current !== 'home') {
        navigate('home', resetSelection)
      }
    } else if (requestedStep.step === 'category') {
      navigate('category', resetSelection)
    } else if (requestedStep.step === 'product') {
      navigate('product', () => {
        setCategory(requestedStep.category ?? 'sausage')
        setSelectedProductId(null)
        setSelectedVariantId(null)
        setQuantity(null)
      })
    } else if (requestedStep.step === 'cart' && cart.length > 0) {
      navigate('cart')
    }

    onRequestedStepHandled()
  }, [requestedStep, cart.length, onRequestedStepHandled, navigate])

  // The flow only offers what can actually be bought right now.
  const available = catalog.filter((product) => !isProductSoldOut(product))
  const categories = CATEGORY_ORDER.filter((value) =>
    available.some((product) => product.category === value),
  )
  const categoryProducts = available.filter((product) => product.category === category)
  const quantityLimit = selectedVariant ? maxQuantityFor({
    stockLimit: selectedVariant.trackStock ? selectedVariant.stockQuantity : null,
  }) : 0

  const canAddToCart = quantity !== null && selectedVariant !== undefined

  // An email is optional, so it stays out of canPlaceOrder.
  const canPlaceOrder =
    delivery.name.trim().length > 0 &&
    delivery.phone.trim().length > 0 &&
    delivery.address.trim().length > 0

  const accountEmail = user?.email ?? null
  /** Mirrors place_guest_order: a typed address wins, then the account's. */
  const notifyEmail = delivery.email.trim() || accountEmail

  if (step === 'home') {
    return (
      <HomeLanding
        catalog={catalog}
        onStartOrder={startOrder}
        onStartCategory={selectCategory}
      />
    )
  }

  if (isLoadingCatalog) {
    return (
      <StepLayout title="Loading the menu…">
        <p className={styles.emptyState}>One moment.</p>
      </StepLayout>
    )
  }

  if (catalogError) {
    return (
      <StepLayout
        title="The menu didn’t load"
        actions={
          <>
            <Button variant="secondary" onClick={goHome}>
              Back to homepage
            </Button>
            <Button onClick={() => void loadCatalog()}>Try again</Button>
          </>
        }
      >
        <p className={styles.formError} role="alert">
          {catalogError}
        </p>
      </StepLayout>
    )
  }

  if (step === 'category') {
    return (
      <StepLayout
        title="What are you ordering?"
        subtitle="Prices include VAT."
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
        {categories.length === 0 ? (
          <p className={styles.emptyState}>Nothing is available right now.</p>
        ) : (
          categories.map((value) => {
            const from = available
              .filter((product) => product.category === value)
              .map(cheapestPrice)
              .filter((price): price is number => price !== null)

            return (
              <SelectionCard
                key={value}
                label={CATEGORY_LABELS[value]}
                description={
                  from.length > 0
                    ? `${CATEGORY_DESCRIPTIONS[value]} From ${formatPrice(Math.min(...from))}.`
                    : CATEGORY_DESCRIPTIONS[value]
                }
                onClick={() => selectCategory(value)}
              />
            )
          })
        )}
      </StepLayout>
    )
  }

  if (step === 'product') {
    const tags = TAG_ORDER.filter((tag) =>
      categoryProducts.some((product) => product.tag === tag),
    )
    const untagged = categoryProducts.filter((product) => product.tag === null)

    const renderProduct = (product: Product) => {
      const from = cheapestPrice(product)

      return (
        <SelectionCard
          key={product.id}
          label={product.name}
          description={
            product.description ||
            (from === null ? undefined : `From ${formatPrice(from)}`)
          }
          onClick={() => selectProduct(product)}
        />
      )
    }

    return (
      <StepLayout
        title={category ? CATEGORY_LABELS[category] : 'Choose a product'}
        subtitle="Pick what you want, then how much."
        progress={CHECKOUT_PROGRESS.product}
        actions={
          <Button variant="secondary" onClick={() => navigate('category')}>
            Back
          </Button>
        }
      >
        {categoryProducts.length === 0 ? (
          <p className={styles.emptyState}>
            Everything in this range is sold out right now. Try the other range, or
            check back later.
          </p>
        ) : null}
        {untagged.map(renderProduct)}
        {tags.map((tag) => (
          <div key={tag} className={styles.group}>
            <h2 className={styles.groupTitle}>{TAG_LABELS[tag]}</h2>
            {categoryProducts
              .filter((product) => product.tag === tag)
              .map(renderProduct)}
          </div>
        ))}
      </StepLayout>
    )
  }

  if (step === 'variant' && selectedProduct) {
    return (
      <StepLayout
        title={selectedProduct.name}
        subtitle="How would you like it?"
        progress={CHECKOUT_PROGRESS.variant}
        actions={
          <Button variant="secondary" onClick={() => navigate('product')}>
            Back
          </Button>
        }
      >
        {sellableVariants(selectedProduct).map((variant) => (
          <SelectionCard
            key={variant.id}
            label={variant.label}
            description={variantDescription(variant)}
            onClick={() => selectVariant(variant.id)}
          />
        ))}
      </StepLayout>
    )
  }

  if (step === 'quantity' && selectedProduct && selectedVariant) {
    const options = quantityOptionsFor(selectedVariant.unit).filter(
      (value) => value <= quantityLimit,
    )
    const selectedLineTotal =
      quantity !== null ? quantity * selectedVariant.price : null

    return (
      <StepLayout
        title={selectedProduct.name}
        subtitle={`${selectedVariant.label} · ${formatPrice(selectedVariant.price)} per ${selectedVariant.unit}`}
        progress={CHECKOUT_PROGRESS.quantity}
        actions={
          <>
            <Button variant="secondary" onClick={backFromQuantity}>
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
        {options.length === 0 ? (
          <p className={styles.emptyState}>This one just sold out.</p>
        ) : (
          <div
            className={styles.quantityGrid}
            role="group"
            aria-label={selectedVariant.unit === 'kg' ? 'How many kilograms?' : 'How many boxes?'}
          >
            {options.map((value) => (
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
                  {selectedVariant.unit === 'kg' ? 'kg' : value === 1 ? 'box' : 'boxes'}
                </span>
              </button>
            ))}
          </div>
        )}
        {selectedVariant.trackStock &&
        selectedVariant.stockQuantity <= MAX_LINE_QUANTITY ? (
          <p className={styles.hint}>
            {formatQuantity(selectedVariant.stockQuantity, selectedVariant.unit)} left in
            stock.
          </p>
        ) : cart.length > 0 ? (
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
        subtitle="Adjust quantities, then choose how to pay."
        progress={CHECKOUT_PROGRESS.cart}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('category')}>
              Add more items
            </Button>
            <Button onClick={() => navigate('payment')} disabled={cart.length === 0}>
              Continue to payment
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
                    <span className={styles.cartItemName}>{item.productName}</span>
                    <span className={styles.cartItemPrice}>
                      {item.variantLabel} · {formatPrice(item.unitPrice)} / {item.unit}
                    </span>
                  </div>
                  <div className={styles.qtyControls}>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      onClick={() => changeCartQuantity(item.id, -quantityStepFor(item.unit))}
                      aria-label={`Decrease ${item.productName}`}
                    >
                      −
                    </button>
                    <span className={styles.qtyValue}>
                      {formatQuantity(item.quantity, item.unit)}
                    </span>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      onClick={() => changeCartQuantity(item.id, quantityStepFor(item.unit))}
                      aria-label={`Increase ${item.productName}`}
                      disabled={item.quantity >= maxQuantityFor(item)}
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

  if (step === 'payment') {
    return (
      <StepLayout
        title="How would you like to pay?"
        subtitle="Nothing is charged now."
        progress={CHECKOUT_PROGRESS.payment}
        actions={
          <Button variant="secondary" onClick={() => navigate('cart')}>
            Back to cart
          </Button>
        }
      >
        {PAYMENT_METHODS.map((option) => (
          <SelectionCard
            key={option.id}
            label={option.label}
            description={option.description}
            selected={paymentMethod === option.id}
            onClick={() => selectPaymentMethod(option.id)}
          />
        ))}
        {UPCOMING_PAYMENT_METHODS.length > 0 ? (
          <div className={styles.group}>
            <h2 className={styles.groupTitle}>Coming soon</h2>
            {UPCOMING_PAYMENT_METHODS.map((option) => (
              <SelectionCard
                key={option.label}
                label={option.label}
                description={option.description}
                disabled
              />
            ))}
          </div>
        ) : null}
        <p className={styles.hint}>
          We’re setting up online payment. Until then, orders are settled at the door.
        </p>
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
            <Button variant="secondary" onClick={() => navigate('payment')}>
              Back to payment
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
          <p className={styles.summaryNote}>
            Payment: {PAYMENT_METHOD_LABELS[paymentMethod]}
          </p>
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
          {accountEmail ? (
            <p className={styles.fieldHint}>
              We’ll email order updates to {accountEmail}.
            </p>
          ) : (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Email <span className={styles.optional}>(optional)</span>
              </span>
              <input
                className={styles.input}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={delivery.email}
                onChange={(event) =>
                  setDelivery((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="you@example.com"
              />
              <span className={styles.fieldHint}>
                Add it and we’ll email you when the order is confirmed and when it’s on
                the way.
              </span>
            </label>
          )}
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

  if (step === 'confirmation') {
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
          <p className={styles.summaryLabel}>Payment</p>
          <p className={styles.summaryValue}>{PAYMENT_METHOD_LABELS[paymentMethod]}</p>
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
            Nothing was charged here. Pay the driver when your order arrives — we’ll
            confirm the details by phone first.
          </p>
          {notifyEmail ? (
            <p className={styles.nextStep}>
              We’ll email {notifyEmail} when the order is confirmed and again when it
              leaves for delivery.
            </p>
          ) : null}
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

  // A selection went stale (e.g. the catalog reloaded without that product).
  return (
    <StepLayout
      title="Let’s start again"
      subtitle="That selection is no longer available."
      actions={<Button onClick={() => navigate('category', resetSelection)}>Browse the menu</Button>}
    >
      <p className={styles.emptyState}>Pick a product to continue.</p>
    </StepLayout>
  )
}

export type { OrderStep }
