export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled'

export type OrderItem = {
  id:         string
  name:       string
  variant:    string | null
  qty:        number
  price:      number
  product_id: string | null
  variant_id: string | null
  product:    {
    id:       string
    name:     string
    is_active: boolean
    variants: { stock_quantity: number; stock_on_hold: number }[]
  } | null
}

// Returns a warning string if the item has a stock problem, null otherwise
export function orderItemWarning(item: OrderItem): string | null {
  if (!item.product_id || !item.product) return null
  if (!item.product.is_active) return 'Discontinued'
  const available = item.product.variants.reduce(
    (s, v) => s + (v.stock_quantity - v.stock_on_hold), 0
  )
  if (available <= 0) return 'Out of stock'
  if (item.qty > available) return `Only ${available} in stock`
  return null
}

export type Order = {
  id:                uuid
  order_number:      string
  customer_id:       string | null
  customer_name:     string
  customer_email:    string | null
  customer_phone:    string | null
  customer_address:  string | null
  customer_city:     string | null
  customer_postcode: string | null
  shipping:          number
  status:            OrderStatus
  notes:             string | null
  created_at:        string
  updated_at:        string
  order_items:       OrderItem[]
}

type uuid = string

// ── Status display config ─────────────────────────────────────
export type OrderStatusCfg = {
  color: string
  bg:    string
  dot:   string
  icon:  string
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
  const toast = useAppToast()

  const { data: orders, pending, refresh } = useFetch<Order[]>('/api/orders', {
    default: () => [],
  })

  const search       = ref('')
  const statusFilter = ref<OrderStatus | 'all'>('all')

  const filtered = computed(() => {
    let rows = orders.value ?? []
    if (statusFilter.value !== 'all')
      rows = rows.filter(o => o.status === statusFilter.value)
    if (search.value.trim()) {
      const q = search.value.toLowerCase()
      rows = rows.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        (o.customer_email ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  })

  const countByStatus = computed(() =>
    Object.fromEntries(
      (Object.keys(ORDER_STATUS_CFG) as OrderStatus[]).map(s => [
        s, (orders.value ?? []).filter(o => o.status === s).length,
      ]),
    ) as Record<OrderStatus, number>,
  )

  const totalRevenue = computed(() =>
    (orders.value ?? [])
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + orderTotal(o), 0),
  )

  // ── Status advancement ────────────────────────────────────────
  const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
    Pending: 'Confirmed', Confirmed: 'Shipped', Shipped: 'Delivered',
  }

  const advancing = ref<string | null>(null)

  async function advanceStatus(orderId: string) {
    const order = (orders.value ?? []).find(o => o.id === orderId)
    if (!order) return
    const next = STATUS_NEXT[order.status]
    if (!next) return

    advancing.value = orderId
    try {
      const updated = await $fetch<Order>(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: { status: next },
      })
      // Replace the whole array ref so shallowRef triggers a re-render
      if (orders.value) orders.value = orders.value.map(o => o.id === orderId ? updated : o)
      if (selected.value?.id === orderId) selected.value = updated
    } catch (e: any) {
      toast.add({ title: 'Failed to update order', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
    } finally {
      advancing.value = null
    }
  }

  async function createOrder(payload: any) {
    const order = await $fetch<Order>('/api/orders', { method: 'POST', body: payload })
    orders.value = [order, ...(orders.value ?? [])]
    return order
  }

  async function updateOrder(orderId: string, payload: any) {
    const updated = await $fetch<Order>(`/api/orders/${orderId}`, { method: 'PATCH', body: payload })
    if (orders.value) orders.value = orders.value.map(o => o.id === orderId ? updated : o)
    if (selected.value?.id === orderId) selected.value = updated
    return updated
  }

  async function cancelOrder(orderId: string) {
    advancing.value = orderId
    try {
      const updated = await $fetch<Order>(`/api/orders/${orderId}`, {
        method: 'PATCH',
        body: { status: 'Cancelled' },
      })
      if (orders.value) orders.value = orders.value.map(o => o.id === orderId ? updated : o)
      if (selected.value?.id === orderId) selected.value = updated
    } catch (e: any) {
      toast.add({ title: 'Failed to cancel order', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
    } finally {
      advancing.value = null
    }
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
    return (o.order_items ?? []).reduce((s, i) => s + i.price * i.qty, 0) + (o.shipping ?? 0)
  }

  function rm(n: number) {
    return `RM ${n.toFixed(2)}`
  }

  return {
    orders,
    pending,
    refresh,
    search,
    statusFilter,
    filtered,
    countByStatus,
    totalRevenue,
    selected,
    slideOpen,
    openDetail,
    advanceStatus,
    cancelOrder,
    createOrder,
    updateOrder,
    advancing,
    orderTotal,
    rm,
  }
}
