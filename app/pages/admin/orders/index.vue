<script setup lang="ts">
definePageMeta({ layout: 'admin' })

// ── Types ──────────────────────────────────────────────────────
type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'

type OrderItem = {
  name: string
  variant: string
  qty: number
  price: number
}

type Order = {
  id: string
  customer: string
  email: string
  phone: string
  date: string           // ISO-like string: "2026-05-14"
  items: OrderItem[]
  shipping: number
  status: OrderStatus
  address: string
  city: string
  postcode: string
  notes: string
}

// ── Seeded mock data ───────────────────────────────────────────
// All values derived from Math.sin/cos so SSR === CSR
function seed(i: number, offset = 0) {
  return (Math.sin(i * 7.3 + offset) + 1) / 2   // 0..1
}

const CUSTOMERS = [
  ['Ahmad Razif',    'ahmad.razif@email.com',  '+60 12-345 6789', 'No 12, Jalan Puteri 2',  'Puchong',     '47100'],
  ['Sarah Tan',      'sarah.tan@email.com',    '+60 16-234 5678', 'Unit 3A, Sri Muda Condo', 'Shah Alam',   '40150'],
  ['Wei Kang Lim',   'weikang.l@email.com',   '+60 11-876 5432', 'Lot 7, Jalan SS21/35',   'Damansara',   '47400'],
  ['Priya Nair',     'priya.n@email.com',      '+60 17-543 2109', 'No 88, Taman Melati',    'Setapak',     '53100'],
  ['Haziq Amir',     'haziq.a@email.com',      '+60 14-678 9012', 'Blk B-15, Vista Komanwel','Bukit Jalil', '57000'],
  ['Melissa Chong',  'melissa.c@email.com',    '+60 12-901 2345', 'No 3, Jalan 16/3',       'Petaling Jaya','46350'],
  ['Ravi Kumar',     'ravi.k@email.com',       '+60 16-456 7890', 'No 21, Jalan Ampang',    'Kuala Lumpur','50450'],
  ['Nurul Ain',      'nurul.a@email.com',      '+60 11-234 5670', 'D-12-3, Endah Promena',  'Sri Petaling','57000'],
  ['Daniel Yap',     'daniel.y@email.com',     '+60 17-890 1234', 'No 5, Jalan Dato Keramat','Kuala Lumpur','54000'],
  ['Fatimah Zainol', 'fati.z@email.com',       '+60 19-012 3456', 'Taman Sri Raya, Lot 4',  'Ampang',      '68000'],
] as const

const PRODUCTS = [
  ['Wireless Headphones', 'Midnight Black',    189.00],
  ['USB-C Hub 7-in-1',    'Silver',            79.90],
  ['Laptop Stand',        'Aluminium',         129.00],
  ['Smart Watch',         'Obsidian Black',    399.00],
  ['Yoga Mat Premium',    'Teal / 6mm',        89.90],
  ['Resistance Band Set', 'Multicolour',       49.90],
  ['Stainless Water Bottle','1L Rose Gold',    59.90],
  ['Specialty Coffee Blend','250g',            38.90],
  ['Protein Bar Box',     '12-pack',           79.00],
  ['Essential Oil Set',   'Lavender & Mint',   129.00],
  ['Serum & Toner Kit',   '30ml + 150ml',      159.00],
  ['Board Game: Catan',   'Base Edition',      219.00],
  ['Running Shoes',       'Size 42, Navy',     289.00],
  ['Leather Bag',         'Caramel Brown',     459.00],
  ['Sunglasses',          'Polarised UV400',   149.00],
] as const

const STATUSES: OrderStatus[] = ['Delivered', 'Delivered', 'Shipped', 'Confirmed', 'Pending', 'Cancelled']

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

// Build 22 deterministic orders
function buildOrders(): Order[] {
  return Array.from({ length: 22 }, (_, i) => {
    const ci = Math.floor(seed(i, 1.1) * CUSTOMERS.length)
    const c = CUSTOMERS[ci]!
    const statusIdx = Math.floor(seed(i, 2.2) * STATUSES.length)
    const status = STATUSES[statusIdx]!

    // 1-3 items per order
    const itemCount = 1 + Math.floor(seed(i, 3.3) * 3)
    const items: OrderItem[] = Array.from({ length: itemCount }, (__, j) => {
      const pi = Math.floor(seed(i * 5 + j, 4.4) * PRODUCTS.length)
      const p = PRODUCTS[pi]!
      const qty = 1 + Math.floor(seed(i * 3 + j, 5.5) * 3)
      return { name: p[0], variant: p[1], qty, price: p[2] }
    })

    const noteIdx = Math.floor(seed(i, 9.9) * NOTES.length)
    const shipping = seed(i, 6.6) > 0.4 ? 10.00 : 0.00

    // Date: within last 60 days — use a simple formula
    const daysBack = Math.floor(seed(i, 7.7) * 60)
    const dayNum = 9 - (daysBack % 9)  // keeps days in 1-9 range for simple string
    const monthNum = daysBack > 30 ? 4 : 5
    const dateStr = `2026-0${monthNum}-${String(dayNum < 1 ? 1 : dayNum).padStart(2, '0')}`

    return {
      id:       `ORD-${1020 + i}`,
      customer: c[0],
      email:    c[1],
      phone:    c[2],
      date:     dateStr,
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

const orders = buildOrders()

// ── Status config ─────────────────────────────────────────────
const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; dot: string; icon: string }> = {
  Pending:   { color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-900/30  border-amber-200  dark:border-amber-800', dot: 'bg-amber-500',  icon: 'i-lucide-clock'        },
  Confirmed: { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800', dot: 'bg-violet-500', icon: 'i-lucide-check-circle' },
  Shipped:   { color: 'text-sky-600    dark:text-sky-400',    bg: 'bg-sky-50    dark:bg-sky-900/30    border-sky-200    dark:border-sky-800',    dot: 'bg-sky-500',    icon: 'i-lucide-truck'        },
  Delivered: { color: 'text-teal-600   dark:text-teal-400',   bg: 'bg-teal-50   dark:bg-teal-900/30   border-teal-200   dark:border-teal-800',   dot: 'bg-teal-500',   icon: 'i-lucide-package-check'},
  Cancelled: { color: 'text-red-600    dark:text-red-400',    bg: 'bg-red-50    dark:bg-red-900/30    border-red-200    dark:border-red-800',     dot: 'bg-red-500',    icon: 'i-lucide-x-circle'    },
}

function timeline(status: OrderStatus): { label: string; done: boolean; icon: string }[] {
  const steps: { label: string; key: OrderStatus | '_placed'; icon: string }[] = [
    { label: 'Order placed',  key: '_placed',   icon: 'i-lucide-shopping-cart' },
    { label: 'Confirmed',     key: 'Confirmed', icon: 'i-lucide-check-circle'  },
    { label: 'Shipped',       key: 'Shipped',   icon: 'i-lucide-truck'         },
    { label: 'Delivered',     key: 'Delivered', icon: 'i-lucide-package-check' },
  ]
  if (status === 'Cancelled') {
    return [
      { label: 'Order placed', done: true,  icon: 'i-lucide-shopping-cart' },
      { label: 'Cancelled',    done: true,  icon: 'i-lucide-x-circle'      },
    ]
  }
  const order: Record<string, number> = { _placed: 0, Confirmed: 1, Shipped: 2, Delivered: 3 }
  const currentIdx = order[status] ?? 0
  return steps.map((s, i) => ({ label: s.label, done: i <= currentIdx, icon: s.icon }))
}

// ── Helpers ───────────────────────────────────────────────────
const rm = (n: number) => `RM ${n.toFixed(2)}`
const orderTotal = (o: Order) => o.items.reduce((s, i) => s + i.price * i.qty, 0) + o.shipping

// ── Reactive state ────────────────────────────────────────────
const search      = ref('')
const statusFilter = ref<OrderStatus | 'all'>('all')

const filtered = computed(() => {
  let rows = orders
  if (statusFilter.value !== 'all') rows = rows.filter(o => o.status === statusFilter.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    rows = rows.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q)
    )
  }
  return rows
})

// ── Summary stats ─────────────────────────────────────────────
const totalRevenue  = computed(() => orders.reduce((s, o) => s + orderTotal(o), 0))
const countByStatus = computed(() =>
  Object.fromEntries(
    (['Pending','Confirmed','Shipped','Delivered','Cancelled'] as OrderStatus[]).map(s => [
      s, orders.filter(o => o.status === s).length,
    ])
  ) as Record<OrderStatus, number>
)

// ── Detail slideover ──────────────────────────────────────────
const selected  = ref<Order | null>(null)
const slideOpen = ref(false)

function openDetail(o: Order) {
  selected.value = o
  slideOpen.value = true
}
</script>

<template>
  <section class="space-y-6">

    <AppPageHeader title="Orders" description="View and manage customer orders." />

    <!-- ── Summary chips ──────────────────────────────────────── -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <button
        v-for="s in (['Pending','Confirmed','Shipped','Delivered','Cancelled'] as OrderStatus[])"
        :key="s"
        class="text-left rounded-xl border px-4 py-3 transition-all hover:scale-[1.02]"
        :class="[
          STATUS_CFG[s].bg,
          statusFilter === s ? 'ring-2 ring-offset-1 ring-current scale-[1.02]' : '',
          STATUS_CFG[s].color,
        ]"
        @click="statusFilter = statusFilter === s ? 'all' : s"
      >
        <p class="text-2xl font-bold">{{ countByStatus[s] }}</p>
        <p class="text-xs mt-0.5 opacity-70">{{ s }}</p>
      </button>
    </div>

    <!-- ── Toolbar ────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search orders, customers…"
        class="w-full sm:w-72"
      />
      <div class="flex items-center gap-2">
        <span class="text-sm text-(--ui-text-muted)">{{ filtered.length }} orders</span>
        <UButton
          v-if="statusFilter !== 'all'"
          size="xs"
          variant="soft"
          color="neutral"
          icon="i-lucide-x"
          @click="statusFilter = 'all'"
        >
          Clear filter
        </UButton>
      </div>
    </div>

    <!-- ── Orders table ───────────────────────────────────────── -->
    <UCard :ui="{ body: 'p-0' }">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-(--ui-border)">
              <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap">Order</th>
              <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">Customer</th>
              <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap hidden sm:table-cell">Date</th>
              <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) hidden md:table-cell">Items</th>
              <th class="text-right px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap">Amount</th>
              <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">Status</th>
              <th class="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in filtered"
              :key="o.id"
              class="border-b border-(--ui-border) last:border-0 hover:bg-(--ui-bg-elevated) transition-colors cursor-pointer"
              @click="openDetail(o)"
            >
              <!-- Order ID -->
              <td class="px-4 py-3">
                <span class="font-mono text-xs font-semibold text-(--ui-text-highlighted)">{{ o.id }}</span>
              </td>

              <!-- Customer -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-bold text-(--ui-text-muted)">{{ o.customer.split(' ').map(w => w[0]).join('').slice(0, 2) }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-(--ui-text-highlighted) truncate leading-tight">{{ o.customer }}</p>
                    <p class="text-xs text-(--ui-text-muted) truncate">{{ o.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Date -->
              <td class="px-4 py-3 text-(--ui-text-muted) whitespace-nowrap hidden sm:table-cell">{{ o.date }}</td>

              <!-- Items count -->
              <td class="px-4 py-3 hidden md:table-cell">
                <span class="text-(--ui-text-muted)">{{ o.items.reduce((s, i) => s + i.qty, 0) }} item{{ o.items.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : '' }}</span>
              </td>

              <!-- Amount -->
              <td class="px-4 py-3 text-right font-semibold text-(--ui-text-highlighted) whitespace-nowrap">
                {{ rm(orderTotal(o)) }}
              </td>

              <!-- Status badge -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="[STATUS_CFG[o.status].color, STATUS_CFG[o.status].bg]"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="STATUS_CFG[o.status].dot" />
                  {{ o.status }}
                </span>
              </td>

              <!-- Chevron -->
              <td class="px-4 py-3">
                <UIcon name="i-lucide-chevron-right" class="size-4 text-(--ui-text-muted)" />
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div v-if="filtered.length === 0" class="py-16 text-center">
          <UIcon name="i-lucide-search-x" class="size-10 text-(--ui-text-muted) mx-auto mb-3" />
          <p class="font-medium text-(--ui-text-highlighted)">No orders found</p>
          <p class="text-sm text-(--ui-text-muted) mt-1">Try a different search or filter.</p>
        </div>
      </div>
    </UCard>

    <!-- ── Revenue footnote ───────────────────────────────────── -->
    <p class="text-xs text-(--ui-text-muted) text-right">
      Total across all orders: <span class="font-semibold text-(--ui-text-highlighted)">{{ rm(totalRevenue) }}</span>
    </p>

    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Order detail slideover                                   -->
    <!-- ════════════════════════════════════════════════════════ -->
    <USlideover
      v-model:open="slideOpen"
      side="right"
      class="max-w-lg"
    >
      <template #content>
        <div v-if="selected" class="flex flex-col h-full overflow-y-auto">

          <!-- Header -->
          <div class="px-6 py-5 border-b border-(--ui-border) flex items-start justify-between gap-4 shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-sm font-bold text-(--ui-text-highlighted)">{{ selected.id }}</span>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                  :class="[STATUS_CFG[selected.status].color, STATUS_CFG[selected.status].bg]"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="STATUS_CFG[selected.status].dot" />
                  {{ selected.status }}
                </span>
              </div>
              <p class="text-sm text-(--ui-text-muted)">Placed on {{ selected.date }}</p>
            </div>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="slideOpen = false"
            />
          </div>

          <!-- Body -->
          <div class="flex-1 px-6 py-5 space-y-6">

            <!-- Timeline -->
            <div>
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Order progress</p>
              <div class="flex items-center gap-0">
                <template v-for="(step, i) in timeline(selected.status)" :key="step.label">
                  <!-- Step -->
                  <div class="flex flex-col items-center gap-1 flex-1">
                    <div
                      class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
                      :class="step.done
                        ? (selected.status === 'Cancelled' && i === 1 ? 'bg-red-500 border-red-500' : 'bg-teal-500 border-teal-500')
                        : 'bg-(--ui-bg) border-(--ui-border)'"
                    >
                      <UIcon
                        :name="step.icon"
                        class="size-3.5"
                        :class="step.done ? 'text-white' : 'text-(--ui-text-muted)'"
                      />
                    </div>
                    <span class="text-[10px] text-center leading-tight" :class="step.done ? 'text-(--ui-text-highlighted) font-medium' : 'text-(--ui-text-muted)'">
                      {{ step.label }}
                    </span>
                  </div>
                  <!-- Connector -->
                  <div
                    v-if="i < timeline(selected.status).length - 1"
                    class="h-0.5 flex-1 mb-5 rounded-full transition-colors"
                    :class="timeline(selected.status)[i + 1]?.done ? 'bg-teal-500' : 'bg-(--ui-border)'"
                  />
                </template>
              </div>
            </div>

            <!-- Customer info -->
            <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) p-4 space-y-2">
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">Customer</p>
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-(--ui-bg) border border-(--ui-border) flex items-center justify-center shrink-0">
                  <span class="text-xs font-bold text-(--ui-text-muted)">
                    {{ selected.customer.split(' ').map(w => w[0]).join('').slice(0, 2) }}
                  </span>
                </div>
                <div>
                  <p class="font-semibold text-(--ui-text-highlighted)">{{ selected.customer }}</p>
                  <p class="text-xs text-(--ui-text-muted)">{{ selected.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-1">
                <UIcon name="i-lucide-phone" class="size-3.5 text-(--ui-text-muted)" />
                <span class="text-sm text-(--ui-text-muted)">{{ selected.phone }}</span>
              </div>
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-map-pin" class="size-3.5 text-(--ui-text-muted) mt-0.5" />
                <span class="text-sm text-(--ui-text-muted)">{{ selected.address }}, {{ selected.city }}, {{ selected.postcode }}</span>
              </div>
              <div v-if="selected.notes" class="flex items-start gap-2 pt-1 border-t border-(--ui-border) mt-2">
                <UIcon name="i-lucide-message-square" class="size-3.5 text-(--ui-text-muted) mt-0.5 shrink-0" />
                <span class="text-sm text-(--ui-text-muted) italic">{{ selected.notes }}</span>
              </div>
            </div>

            <!-- Order items -->
            <div>
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Items</p>
              <div class="rounded-xl border border-(--ui-border) overflow-hidden">
                <div
                  v-for="(item, idx) in selected.items"
                  :key="idx"
                  class="flex items-center gap-3 px-4 py-3 border-b border-(--ui-border) last:border-0"
                >
                  <div class="w-9 h-9 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-package" class="size-4 text-(--ui-text-muted)" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ item.name }}</p>
                    <p class="text-xs text-(--ui-text-muted)">{{ item.variant }} · qty {{ item.qty }}</p>
                  </div>
                  <p class="text-sm font-semibold text-(--ui-text-highlighted) whitespace-nowrap">
                    {{ rm(item.price * item.qty) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) divide-y divide-(--ui-border)">
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-(--ui-text-muted)">Subtotal</span>
                <span class="text-(--ui-text-highlighted)">{{ rm(selected.items.reduce((s, i) => s + i.price * i.qty, 0)) }}</span>
              </div>
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-(--ui-text-muted)">Shipping</span>
                <span :class="selected.shipping === 0 ? 'text-teal-500 font-medium' : 'text-(--ui-text-highlighted)'">
                  {{ selected.shipping === 0 ? 'Free' : rm(selected.shipping) }}
                </span>
              </div>
              <div class="flex justify-between px-4 py-3 font-semibold">
                <span class="text-(--ui-text-highlighted)">Total</span>
                <span class="text-teal-500">{{ rm(orderTotal(selected)) }}</span>
              </div>
            </div>

          </div>

          <!-- Footer actions -->
          <div class="px-6 py-4 border-t border-(--ui-border) flex gap-3 shrink-0">
            <UButton
              v-if="selected.status === 'Pending'"
              icon="i-lucide-check-circle"
              class="flex-1"
              @click="slideOpen = false"
            >
              Confirm Order
            </UButton>
            <UButton
              v-if="selected.status === 'Confirmed'"
              icon="i-lucide-truck"
              class="flex-1"
              @click="slideOpen = false"
            >
              Mark Shipped
            </UButton>
            <UButton
              v-if="selected.status === 'Shipped'"
              icon="i-lucide-package-check"
              class="flex-1"
              @click="slideOpen = false"
            >
              Mark Delivered
            </UButton>
            <UButton
              variant="outline"
              color="neutral"
              icon="i-lucide-printer"
              @click="slideOpen = false"
            >
              Print
            </UButton>
          </div>

        </div>
      </template>
    </USlideover>

  </section>
</template>
