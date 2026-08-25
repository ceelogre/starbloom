import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button/Button'
import {
  CATEGORY_LABELS,
  TAG_LABELS,
  formatPrice,
  formatQuantity,
  quantityStepFor,
} from '../../data/products'
import {
  adjustStock,
  fetchInventory,
  fetchStockMovements,
  setProductActive,
  setStock,
  STOCK_REASON_LABELS,
} from '../../lib/catalog'
import { formatOrderTime } from '../../lib/order-status'
import {
  isVariantLow,
  isVariantSoldOut,
  type Product,
  type ProductVariant,
  type StockMovement,
} from '../../types/catalog'
import type { Category } from '../../types/order'
import styles from './AdminInventoryPage.module.css'

const CATEGORY_ORDER: Category[] = ['sausage', 'meat']

type MoveReason = 'restock' | 'waste' | 'count'

const REASON_LABELS: Record<MoveReason, string> = {
  restock: 'Add stock',
  waste: 'Remove (waste)',
  count: 'Set to counted',
}

export function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openHistory, setOpenHistory] = useState<string | null>(null)
  const [history, setHistory] = useState<StockMovement[]>([])

  const load = useCallback(async () => {
    setError(null)
    try {
      setProducts(await fetchInventory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the inventory.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That change did not go through.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleHistory(variantId: string) {
    if (openHistory === variantId) {
      setOpenHistory(null)
      return
    }

    setOpenHistory(variantId)
    setHistory([])
    try {
      setHistory(await fetchStockMovements(variantId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the stock history.')
    }
  }

  const tracked = products.flatMap((product) =>
    product.variants.filter((variant) => variant.isActive && variant.trackStock),
  )
  const soldOutCount = tracked.filter(isVariantSoldOut).length
  const lowCount = tracked.filter(isVariantLow).length

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1 className={styles.title}>Inventory</h1>
          <p className={styles.muted}>
            Prices and stock here are what customers see. Anything at zero stops selling.
          </p>
        </div>
        <Link to="/admin/inventory/new" className={styles.newLink}>
          New product
        </Link>
      </div>

      {!loading && tracked.length > 0 ? (
        <div className={styles.summary}>
          <span className={styles.summaryItem}>{tracked.length} tracked lines</span>
          {lowCount > 0 ? (
            <span className={styles.low}>{lowCount} running low</span>
          ) : null}
          {soldOutCount > 0 ? (
            <span className={styles.soldOut}>{soldOutCount} sold out</span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className={styles.muted}>Loading…</p> : null}

      {!loading && products.length === 0 ? (
        <p className={styles.muted}>
          No products yet. Run migration 003, or add one by hand.
        </p>
      ) : null}

      {CATEGORY_ORDER.filter((category) =>
        products.some((product) => product.category === category),
      ).map((category) => (
        <div key={category} className={styles.group}>
          <h2 className={styles.groupTitle}>{CATEGORY_LABELS[category]}</h2>
          <ul className={styles.list}>
            {products
              .filter((product) => product.category === category)
              .map((product) => (
                <li key={product.id} className={styles.product}>
                  <div className={styles.productHead}>
                    <div>
                      <h3 className={styles.productName}>
                        {product.name}
                        {product.tag ? (
                          <span className={styles.tag}>{TAG_LABELS[product.tag]}</span>
                        ) : null}
                        {product.isActive ? null : (
                          <span className={styles.paused}>Paused</span>
                        )}
                      </h3>
                      <p className={styles.slug}>{product.slug}</p>
                    </div>
                    <div className={styles.productActions}>
                      <Link to={`/admin/inventory/${product.id}`} className={styles.editLink}>
                        Edit
                      </Link>
                      <Button
                        variant="secondary"
                        disabled={busyId === product.id}
                        onClick={() =>
                          void run(product.id, () =>
                            setProductActive(product.id, !product.isActive),
                          )
                        }
                      >
                        {product.isActive ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
                  </div>

                  {product.variants.length === 0 ? (
                    <p className={styles.muted}>No sellable variant yet.</p>
                  ) : (
                    <ul className={styles.variants}>
                      {product.variants.map((variant) => (
                        <li key={variant.id} className={styles.variant}>
                          <VariantRow
                            variant={variant}
                            busy={busyId === variant.id}
                            historyOpen={openHistory === variant.id}
                            history={history}
                            onToggleHistory={() => void toggleHistory(variant.id)}
                            onMove={(reason, value) =>
                              run(variant.id, () =>
                                reason === 'count'
                                  ? setStock(variant, value)
                                  : adjustStock(
                                      variant.id,
                                      reason === 'waste' ? -value : value,
                                      reason,
                                    ),
                              )
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

type VariantRowProps = {
  variant: ProductVariant
  busy: boolean
  historyOpen: boolean
  history: StockMovement[]
  onToggleHistory: () => void
  onMove: (reason: MoveReason, value: number) => Promise<void>
}

function VariantRow({
  variant,
  busy,
  historyOpen,
  history,
  onToggleHistory,
  onMove,
}: VariantRowProps) {
  const [reason, setReason] = useState<MoveReason>('restock')
  const [amount, setAmount] = useState('1')

  const step = quantityStepFor(variant.unit)
  const value = Number(amount)
  const canSubmit =
    Number.isFinite(value) && value >= 0 && !(reason !== 'count' && value === 0)

  return (
    <>
      <div className={styles.variantHead}>
        <div className={styles.variantInfo}>
          <span className={styles.variantLabel}>{variant.label}</span>
          <span className={styles.variantPrice}>
            {formatPrice(variant.price)} / {variant.unit}
          </span>
        </div>
        <div className={styles.stock}>
          {variant.trackStock ? (
            <>
              <span className={styles.stockValue}>
                {formatQuantity(variant.stockQuantity, variant.unit)}
              </span>
              {isVariantSoldOut(variant) ? (
                <span className={styles.soldOut}>Sold out</span>
              ) : isVariantLow(variant) ? (
                <span className={styles.low}>Low</span>
              ) : null}
            </>
          ) : (
            <span className={styles.stockValue}>Not tracked</span>
          )}
          {variant.isActive ? null : <span className={styles.paused}>Paused</span>}
        </div>
      </div>

      {variant.trackStock ? (
        <form
          className={styles.moveForm}
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit && !busy) {
              void onMove(reason, value).then(() => setAmount('1'))
            }
          }}
        >
          <label className={styles.srOnly} htmlFor={`reason-${variant.id}`}>
            Stock change
          </label>
          <select
            id={`reason-${variant.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value as MoveReason)}
          >
            {(Object.keys(REASON_LABELS) as MoveReason[]).map((key) => (
              <option key={key} value={key}>
                {REASON_LABELS[key]}
              </option>
            ))}
          </select>
          <label className={styles.srOnly} htmlFor={`amount-${variant.id}`}>
            Amount in {variant.unit}
          </label>
          <input
            id={`amount-${variant.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <span className={styles.unitHint}>{variant.unit}</span>
          <Button type="submit" disabled={busy || !canSubmit}>
            {busy ? 'Saving…' : 'Apply'}
          </Button>
          <button type="button" className={styles.historyToggle} onClick={onToggleHistory}>
            {historyOpen ? 'Hide history' : 'History'}
          </button>
        </form>
      ) : null}

      {historyOpen ? (
        <ul className={styles.history}>
          {history.length === 0 ? (
            <li className={styles.muted}>No movements recorded yet.</li>
          ) : (
            history.map((movement) => (
              <li key={movement.id}>
                <span>
                  {STOCK_REASON_LABELS[movement.reason]}
                  {movement.note ? ` · ${movement.note}` : ''}
                </span>
                <span className={movement.delta < 0 ? styles.negative : styles.positive}>
                  {movement.delta > 0 ? '+' : ''}
                  {movement.delta} {variant.unit}
                </span>
                <span className={styles.muted}>{formatOrderTime(movement.createdAt)}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </>
  )
}
