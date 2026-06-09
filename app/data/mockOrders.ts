/**
 * Deterministic seeded mock order data.
 * All values derived from Math.sin so SSR and client produce identical output.
 * Keep business logic out of here — this is pure data.
 */

// ── Types ─────────────────────────────────────────────────────
export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'

export type OrderItem = {
  name: string
  variant: string
  qty: number
  price: number
}

export type Order = {
  id: string
  customer: string
  email: string
  phone: string
  date: string
  items: OrderItem[]
  shipping: number
  status: OrderStatus
  address: string
  city: string
  postcode: string
  notes: string
}

// ── Seed helpers ──────────────────────────────────────────────
function seed(i: number, offset = 0) {
  return (Math.sin(i * 7.3 + offset) + 1) / 2
}

// ── Lookup tables ─────────────────────────────────────────────
const CUSTOMERS = [
  ['Ahmad Razif',    'ahmad.razif@email.com',  '+60 12-345 6789', 'No 12, Jalan Puteri 2',    'Puchong',      '47100'],
  ['Sarah Tan',      'sarah.tan@email.com',    '+60 16-234 5678', 'Unit 3A, Sri Muda Condo',  'Shah Alam',    '40150'],
  ['Wei Kang Lim',   'weikang.l@email.com',   '+60 11-876 5432', 'Lot 7, Jalan SS21/35',     'Damansara',    '47400'],
  ['Priya Nair',     'priya.n@email.com',      '+60 17-543 2109', 'No 88, Taman Melati',      'Setapak',      '53100'],
  ['Haziq Amir',     'haziq.a@email.com',      '+60 14-678 9012', 'Blk B-15, Vista Komanwel', 'Bukit Jalil',  '57000'],
  ['Melissa Chong',  'melissa.c@email.com',    '+60 12-901 2345', 'No 3, Jalan 16/3',         'Petaling Jaya','46350'],
  ['Ravi Kumar',     'ravi.k@email.com',       '+60 16-456 7890', 'No 21, Jalan Ampang',      'Kuala Lumpur', '50450'],
  ['Nurul Ain',      'nurul.a@email.com',      '+60 11-234 5670', 'D-12-3, Endah Promena',    'Sri Petaling', '57000'],
  ['Daniel Yap',     'daniel.y@email.com',     '+60 17-890 1234', 'No 5, Jalan Dato Keramat', 'Kuala Lumpur', '54000'],
  ['Fatimah Zainol', 'fati.z@email.com',       '+60 19-012 3456', 'Taman Sri Raya, Lot 4',    'Ampang',       '68000'],
] as const

const PRODUCTS = [
  ['Wireless Headphones', 'Midnight Black',   189.00],
  ['USB-C Hub 7-in-1',    'Silver',           79.90],
  ['Laptop Stand',        'Aluminium',        129.00],
  ['Smart Watch',         'Obsidian Black',   399.00],
  ['Yoga Mat Premium',    'Teal / 6mm',       89.90],
  ['Resistance Band Set', 'Multicolour',      49.90],
  ['Stainless Water Bottle', '1L Rose Gold',  59.90],
  ['Specialty Coffee Blend', '250g',          38.90],
  ['Protein Bar Box',     '12-pack',          79.00],
  ['Essential Oil Set',   'Lavender & Mint',  129.00],
  ['Serum & Toner Kit',   '30ml + 150ml',     159.00],
  ['Board Game: Catan',   'Base Edition',     219.00],
  ['Running Shoes',       'Size 42, Navy',    289.00],
  ['Leather Bag',         'Caramel Brown',    459.00],
  ['Sunglasses',          'Polarised UV400',  149.00],
] as const

const STATUSES: OrderStatus[] = [
  'Delivered', 'Delivered', 'Shipped', 'Confirmed', 'Pending', 'Cancelled',
]

const NOTES = [
  'Please leave at the door if no one home.',
  'Ring doorbell twice.',
  '',
  'Fragile items — handle with care.',
  '',
  'Call before delivery.',
  '',
  'Leave with security guard.',
  '',
  '',
]

// ── Builder ───────────────────────────────────────────────────
function buildOrders(): Order[] {
  return Array.from({ length: 22 }, (_, i) => {
    const ci      = Math.floor(seed(i, 1.1) * CUSTOMERS.length)
    const c       = CUSTOMERS[ci]!
    const statusIdx = Math.floor(seed(i, 2.2) * STATUSES.length)
    const status  = STATUSES[statusIdx]!
    const itemCount = 1 + Math.floor(seed(i, 3.3) * 3)

    const items: OrderItem[] = Array.from({ length: itemCount }, (__, j) => {
      const pi  = Math.floor(seed(i * 5 + j, 4.4) * PRODUCTS.length)
      const p   = PRODUCTS[pi]!
      const qty = 1 + Math.floor(seed(i * 3 + j, 5.5) * 3)
      return { name: p[0], variant: p[1], qty, price: p[2] }
    })

    const noteIdx  = Math.floor(seed(i, 9.9) * NOTES.length)
    const shipping = seed(i, 6.6) > 0.4 ? 10.00 : 0.00
    const daysBack = Math.floor(seed(i, 7.7) * 60)
    const dayNum   = Math.max(1, 9 - (daysBack % 9))
    const monthNum = daysBack > 30 ? 4 : 5
    const date     = `2026-0${monthNum}-${String(dayNum).padStart(2, '0')}`

    return {
      id:       `ORD-${1020 + i}`,
      customer: c[0],
      email:    c[1],
      phone:    c[2],
      date,
      items,
      shipping,
      status,
      address:  c[3],
      city:     c[4],
      postcode: c[5],
      notes:    NOTES[noteIdx] ?? '',
    }
  })
}

export const mockOrders: Order[] = buildOrders()
