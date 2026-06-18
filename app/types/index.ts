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

// ── Customer ──────────────────────────────────────────────────

export type CustomerRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postcode: string | null
  notes: string | null
  created_at: string
}

export type CustomerPayload = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  notes?: string | null
}

// ── CRM ───────────────────────────────────────────────────────

export type PipelineStage = {
  id: string
  name: string
  color: string
  position: number
  is_closed_won: boolean
  is_closed_lost: boolean
  created_at: string
}

export type CompanyRow = {
  id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

export type ActivityType = 'call' | 'email' | 'note' | 'meeting'

export type ActivityRow = {
  id: string
  type: ActivityType
  body: string
  lead_id: string | null
  company_id: string | null
  created_by: string | null
  created_at: string
}

export type LeadRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  value: number | null
  source: string | null
  notes: string | null
  order_id: string | null
  created_at: string
  updated_at: string
  stage: Pick<PipelineStage, 'id' | 'name' | 'color'> | null
  company: Pick<CompanyRow, 'id' | 'name'> | null
}

export type LeadDetail = LeadRow & {
  stage: (Pick<PipelineStage, 'id' | 'name' | 'color' | 'is_closed_won' | 'is_closed_lost'>) | null
  company: Pick<CompanyRow, 'id' | 'name' | 'phone' | 'email' | 'website'> | null
  order: { id: string; order_number: string; status: string; created_at: string } | null
  activities: ActivityRow[]
}

// ── IMS — Suppliers & Purchase Orders ────────────────────────

export type SupplierRow = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PoStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'

export type PurchaseOrderItem = {
  id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  product: { id: string; name: string } | null
  variant: { id: string; name: string; sku: string | null; stock_quantity: number; cost_price: number | null } | null
}

export type PurchaseOrderRow = {
  id: string
  po_number: string
  status: PoStatus
  notes: string | null
  expected_at: string | null
  created_at: string
  updated_at: string
  supplier: { id: string; name: string } | null
}

export type PurchaseOrderDetail = PurchaseOrderRow & {
  supplier: { id: string; name: string; email: string | null; phone: string | null } | null
  items: PurchaseOrderItem[]
}

export type StockAdjustmentRow = {
  id: string
  qty: number
  reason: string
  created_at: string
  product: { id: string; name: string } | null
  variant: { id: string; name: string; sku: string | null } | null
}

// ── Invoice ───────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded'

export type InvoiceItemRow = {
  id: string
  invoice_id: string
  description: string
  qty: number
  unit_price: number
  subtotal: number
}

export type InvoiceRow = {
  id: string
  invoice_number: string
  customer_id: string | null
  customer_name: string | null
  issue_date: string
  due_date: string | null
  status: InvoiceStatus
  subtotal: number
  tax_rate: number
  discount: number
  total: number
  notes: string | null
  payment_terms: string | null
  created_at: string
  updated_at: string
  customers: Pick<CustomerRow, 'name' | 'email'> | null
  invoice_items: InvoiceItemRow[]
}

export type InvoiceItemPayload = {
  id?: string
  description: string
  qty: number
  unit_price: number
}

export type InvoicePayload = {
  customer_id?: string | null
  customer_name?: string | null
  issue_date: string
  due_date?: string | null
  status?: InvoiceStatus
  tax_rate?: number
  discount?: number
  notes?: string | null
  payment_terms?: string | null
  items: InvoiceItemPayload[]
}
