import { mockOrders, type Order, type OrderStatus } from '~/data/mockOrders'

// Module-level reactive singleton — status changes persist across composable calls
const _orders = ref<Order[]>(mockOrders.map(o => ({ ...o })))

// ── Status display config (shared with template via composable) ──
export type OrderStatusCfg = {
  color: string
  bg: string
  dot: string
  icon: string
}

export const ORDER_STATUS_CFG: Record<OrderStatus, OrderStatusCfg> = {
  Pending:   { color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-900/30  border-amber-200  dark:border-amber-800',  dot: 'bg-amber-500',  icon: 'i-lucide-clock'         },
  Confirmed: { color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800', dot: 'bg-violet-500', icon: 'i-lucide-check-circle'  },
  Shipped:   { color: 'text-sky-600    dark:text-sky-400',    bg: 'bg-sky-50    dark:bg-sky-900/30    border-sky-200    dark:border-sky-800',    dot: 'bg-sky-500',    icon: 'i-lucide-truck'         },
  Delivered: { color: 'text-teal-600   dark:text-teal-400',   bg: 'bg-teal-50   dark:bg-teal-900/30   border-teal-200   dark:border-teal-800',   dot: 'bg-teal-500',   icon: 'i-lucide-package-check' },
  Cancelled: { color: 'text-red-600    dark:text-red-400',    bg: 'bg-red-50    dark:bg-red-900/30    border-red-200    dark:border-red-800',    dot: 'bg-red-500',    icon: 'i-lucide-x-circle'      },
}

// ── Timeline builder ──────────────────────────────────────────
export function buildOrderTimeline(status: OrderStatus) {
  if (status === 'Cancelled') {
    return [
      { label: 'Order placed', done: true, icon: 'i-lucide-shopping-cart' },
      { label: 'Cancelled',    done: true, icon: 'i-lucide-x-circle'      },
    ]
  }
  const STEPS = [
    { label: 'Order placed', key: '_placed',   icon: 'i-lucide-shopping-cart' },
    { label: 'Confirmed',    key: 'Confirmed', icon: 'i-lucide-check-circle'  },
    { label: 'Shipped',      key: 'Shipped',   icon: 'i-lucide-truck'         },
    { label: 'Delivered',    key: 'Delivered', icon: 'i-lucide-package-check' },
  ]
  const ORDER_IDX: Record<string, number> = { _placed: 0, Confirmed: 1, Shipped: 2, Delivered: 3 }
  const current = ORDER_IDX[status] ?? 0
  return STEPS.map((s, i) => ({ label: s.label, done: i <= current, icon: s.icon }))
}

// ── Composable ────────────────────────────────────────────────
export function useOrders() {
  const search       = ref('')
  const statusFilter = ref<OrderStatus | 'all'>('all')

  const filtered = computed(() => {
    let rows = _orders.value
    if (statusFilter.value !== 'all')
      rows = rows.filter(o => o.status === statusFilter.value)
    if (search.value.trim()) {
      const q = search.value.toLowerCase()
      rows = rows.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q),
      )
    }
    return rows
  })

  const countByStatus = computed(() =>
    Object.fromEntries(
      (Object.keys(ORDER_STATUS_CFG) as OrderStatus[]).map(s => [
        s, _orders.value.filter(o => o.status === s).length,
      ]),
    ) as Record<OrderStatus, number>,
  )

  const totalRevenue = computed(() =>
    _orders.value.reduce((sum, o) => sum + orderTotal(o), 0),
  )

  // ── Status advancement ────────────────────────────────────────
  const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
    Pending: 'Confirmed',
    Confirmed: 'Shipped',
    Shipped: 'Delivered',
  }

  function advanceStatus(orderId: string) {
    const order = _orders.value.find(o => o.id === orderId)
    if (!order) return
    const next = STATUS_NEXT[order.status]
    if (next) order.status = next
  }

  // ── Slideover state ──────────────────────────────────────────
  const selected  = ref<Order | null>(null)
  const slideOpen = ref(false)

  function openDetail(o: Order) {
    selected.value  = o
    slideOpen.value = true
  }

  // ── Helpers ───────────────────────────────────────────────────
  function orderTotal(o: Order) {
    return o.items.reduce((s, i) => s + i.price * i.qty, 0) + o.shipping
  }

  function rm(n: number) {
    return `RM ${n.toFixed(2)}`
  }

  return {
    orders: _orders,
    search,
    statusFilter,
    filtered,
    countByStatus,
    totalRevenue,
    selected,
    slideOpen,
    openDetail,
    advanceStatus,
    orderTotal,
    rm,
  }
}
