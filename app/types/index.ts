// ── Raw database row shapes ──────────────────────────────────
// Mirror the DB schema exactly. When you add a column to the DB,
// add it here first — then TypeScript will tell you everywhere it's used.

export type DbCategory = {
  id: string
  name: string
  created_at: string
}

export type DbVariant = {
  id: string
  product_id: string
  name: string
  sku: string | null
  stock_quantity: number
  stock_on_hold: number
  price_override: number | null
  created_at: string
}

export type DbProduct = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  price: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── API response shapes (with joins) ─────────────────────────
// What the server actually returns to the client.

export type VariantRow = Pick<DbVariant, 'id' | 'name' | 'sku' | 'stock_quantity' | 'stock_on_hold' | 'price_override'>

export type ProductRow = DbProduct & {
  categories: Pick<DbCategory, 'name'> | null
  variants: VariantRow[]
}

// ── Form / request payload shapes ────────────────────────────

export type VariantPayload = {
  id?: string          // present when editing an existing variant
  name: string
  sku?: string | null
  stock_quantity: number
  stock_on_hold: number
  price_override?: number | null
}

export type ExportColumn = { key: string; label: string }

export type ProductPayload = {
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  category_id?: string | null
  is_active: boolean
  variants: VariantPayload[]
}
