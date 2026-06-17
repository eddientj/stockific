export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()

  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString()
  const d60 = new Date(now.getTime() - 60 * 86400000).toISOString()

  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, status, shipping, created_at, order_items(qty, price)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  type RawOrder = typeof allOrders extends (infer T)[] | null ? T : never

  const withTotal = (allOrders ?? []).map((o: RawOrder) => ({
    ...(o as any),
    _total: ((o as any).order_items ?? []).reduce((s: number, i: any) => s + i.qty * i.price, 0) + ((o as any).shipping ?? 0),
  }))

  const statusCounts: Record<string, number> = { Pending: 0, Confirmed: 0, Shipped: 0, Delivered: 0, Cancelled: 0 }
  for (const o of withTotal) {
    if (o.status in statusCounts) statusCounts[o.status]++
  }

  const current30    = withTotal.filter(o => o.status !== 'Cancelled' && o.created_at >= d30)
  const prev30       = withTotal.filter(o => o.status !== 'Cancelled' && o.created_at >= d60 && o.created_at < d30)
  const currentRevenue = current30.reduce((s, o) => s + o._total, 0)
  const prevRevenue    = prev30.reduce((s, o) => s + o._total, 0)
  const revenueChange  = prevRevenue > 0
    ? +((((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
    : 100

  const dailyMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dailyMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const o of current30) {
    const day = (o.created_at as string).slice(0, 10)
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + o._total)
  }
  const revenueChart = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }))

  const totalRevenue = withTotal
    .filter(o => o.status !== 'Cancelled')
    .reduce((s, o) => s + o._total, 0)

  const recentOrders = withTotal.slice(0, 6).map(o => ({
    id:            o.id,
    order_number:  o.order_number,
    customer_name: o.customer_name,
    status:        o.status,
    total:         Math.round(o._total * 100) / 100,
    item_count:    (o.order_items ?? []).reduce((s: number, i: any) => s + i.qty, 0),
    created_at:    o.created_at,
  }))

  return {
    totalOrders:     withTotal.length,
    totalRevenue:    Math.round(totalRevenue * 100) / 100,
    currentRevenue:  Math.round(currentRevenue * 100) / 100,
    prevRevenue:     Math.round(prevRevenue * 100) / 100,
    revenueChange,
    ordersByStatus:  statusCounts,
    revenueChart,
    recentOrders,
  }
})
