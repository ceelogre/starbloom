import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button/Button'
import { CATEGORY_LABELS, TAG_LABELS, UNIT_LABELS } from '../../data/products'
import {
  createProduct,
  createVariants,
  fetchProduct,
  updateProduct,
  updateVariant,
} from '../../lib/catalog'
import type {
  ProductDraft,
  ProductTag,
  VariantDraft,
  VariantUnit,
} from '../../types/catalog'
import type { Category } from '../../types/order'
import styles from './AdminProductPage.module.css'

const CATEGORIES: Category[] = ['sausage', 'meat']
const TAGS: ProductTag[] = ['smoked', 'fresh']
const UNITS: VariantUnit[] = ['box', 'kg']

type VariantRow = VariantDraft & {
  id: string | null
  stockQuantity: number
}

const EMPTY_PRODUCT: ProductDraft = {
  slug: '',
  category: 'sausage',
  name: '',
  tag: null,
  description: '',
  sortOrder: 0,
  isActive: true,
}

function newVariantRow(unit: VariantUnit, sortOrder: number): VariantRow {
  return {
    id: null,
    unit,
    label: unit === 'box' ? 'Box · 5 pcs' : 'Per kg',
    pieces: unit === 'box' ? 5 : null,
    price: 0,
    lowStockAt: 0,
    trackStock: true,
    isActive: true,
    sortOrder,
    stockQuantity: 0,
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function AdminProductPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const isNew = productId === undefined

  const [draft, setDraft] = useState<ProductDraft>(EMPTY_PRODUCT)
  const [variants, setVariants] = useState<VariantRow[]>([newVariantRow('box', 1)])
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) {
      return
    }

    let cancelled = false
    setLoading(true)

    void fetchProduct(productId)
      .then((product) => {
        if (cancelled) {
          return
        }

        setDraft({
          slug: product.slug,
          category: product.category,
          name: product.name,
          tag: product.tag,
          description: product.description,
          sortOrder: product.sortOrder,
          isActive: product.isActive,
        })
        setVariants(
          product.variants.map((variant) => ({
            id: variant.id,
            unit: variant.unit,
            label: variant.label,
            pieces: variant.pieces,
            price: variant.price,
            lowStockAt: variant.lowStockAt,
            trackStock: variant.trackStock,
            isActive: variant.isActive,
            sortOrder: variant.sortOrder,
            stockQuantity: variant.stockQuantity,
          })),
        )
        setSlugTouched(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load this product.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  function patchVariant(index: number, patch: Partial<VariantRow>) {
    setVariants((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  }

  function addVariant() {
    const used = new Set(variants.map((row) => row.unit))
    const unit = UNITS.find((value) => !used.has(value))

    if (!unit) {
      return
    }

    setVariants((current) => [...current, newVariantRow(unit, current.length + 1)])
  }

  function removeVariant(index: number) {
    setVariants((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  async function save() {
    if (saving) {
      return
    }

    const slug = (slugTouched ? draft.slug : slugify(draft.name)).trim()

    if (!draft.name.trim() || !slug) {
      setError('A name and a slug are required.')
      return
    }

    if (variants.length === 0) {
      setError('Add at least one way to buy this product.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payload = { ...draft, slug }

      if (!productId) {
        await createProduct(
          payload,
          variants.map(({ id: _id, stockQuantity: _stock, ...variant }) => variant),
        )
      } else {
        await updateProduct(productId, payload)

        const fresh: VariantDraft[] = []
        for (const { id, stockQuantity: _stock, ...variant } of variants) {
          if (id) {
            await updateVariant(id, variant)
          } else {
            fresh.push(variant)
          }
        }

        if (fresh.length > 0) {
          await createVariants(productId, fresh)
        }
      }

      navigate('/admin/inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this product.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className={styles.muted}>Loading…</p>
  }

  return (
    <section className={styles.page}>
      <Link to="/admin/inventory" className={styles.back}>
        Back to inventory
      </Link>
      <h1 className={styles.title}>{isNew ? 'New product' : draft.name || 'Product'}</h1>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Smoked Pork Sausage"
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Slug</span>
            <input
              value={slugTouched ? draft.slug : slugify(draft.name)}
              onChange={(event) => {
                setSlugTouched(true)
                setDraft((current) => ({ ...current, slug: event.target.value }))
              }}
              placeholder="smoked-pork-sausage"
            />
            <span className={styles.hint}>Used on printed tickets and past orders.</span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value as Category,
                }))
              }
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Menu group</span>
            <select
              value={draft.tag ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  tag: event.target.value === '' ? null : (event.target.value as ProductTag),
                }))
              }
            >
              <option value="">None</option>
              {TAGS.map((value) => (
                <option key={value} value={value}>
                  {TAG_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Sort order</span>
            <input
              type="number"
              value={draft.sortOrder}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            <span>Selling now</span>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Description</span>
          <input
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Shown under the name in the shop"
          />
        </label>

        <div className={styles.variants}>
          <div className={styles.variantsHead}>
            <h2 className={styles.subtitle}>Ways to buy it</h2>
            <Button
              variant="secondary"
              onClick={addVariant}
              disabled={variants.length >= UNITS.length}
            >
              Add unit
            </Button>
          </div>

          {variants.map((variant, index) => (
            <div key={variant.id ?? `new-${index}`} className={styles.variant}>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span className={styles.label}>Unit</span>
                  <select
                    value={variant.unit}
                    disabled={variant.id !== null}
                    onChange={(event) =>
                      patchVariant(index, { unit: event.target.value as VariantUnit })
                    }
                  >
                    {UNITS.map((value) => (
                      <option key={value} value={value}>
                        {UNIT_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Label</span>
                  <input
                    value={variant.label}
                    onChange={(event) => patchVariant(index, { label: event.target.value })}
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Pieces</span>
                  <input
                    type="number"
                    min={1}
                    value={variant.pieces ?? ''}
                    onChange={(event) =>
                      patchVariant(index, {
                        pieces: event.target.value === '' ? null : Number(event.target.value),
                      })
                    }
                    placeholder="—"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Price (RWF)</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={variant.price}
                    onChange={(event) =>
                      patchVariant(index, { price: Number(event.target.value) || 0 })
                    }
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Low stock at</span>
                  <input
                    type="number"
                    min={0}
                    step={variant.unit === 'kg' ? 0.5 : 1}
                    value={variant.lowStockAt}
                    onChange={(event) =>
                      patchVariant(index, { lowStockAt: Number(event.target.value) || 0 })
                    }
                  />
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={variant.trackStock}
                    onChange={(event) =>
                      patchVariant(index, { trackStock: event.target.checked })
                    }
                  />
                  <span>Track stock</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(event) => patchVariant(index, { isActive: event.target.checked })}
                  />
                  <span>Selling now</span>
                </label>
              </div>
              <div className={styles.variantFoot}>
                <span className={styles.hint}>
                  {variant.id
                    ? `On hand: ${variant.stockQuantity} ${variant.unit}. Change it from the inventory list.`
                    : 'Starts at zero stock.'}
                </span>
                {variant.id ? null : (
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => removeVariant(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/inventory')}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  )
}
