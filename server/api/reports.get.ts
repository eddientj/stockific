export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const query  = getQuery(event)
  const period = (query.period as string) || '3M'
  const months = ({ '1M': 1, '3M': 3, '6M': 6, '1Y': 12 } as Record<string, number>)[period] ?? 3

  const supabase = useSupabaseAdmin()

  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const sinceIso = since.toISOString()
  const prevSince = new Date(since.getTime() - months * 30.44 * 86400000).toISOString()

  const { data: orders } = await supabase
    .from('orders')
    .select(`id, status, shipping, created_at, order_items(name, qty, price, product_id, product:products(name, categories(name)))`)
    .eq('org_id', orgId)
    .gte('created_at', sinceIso)
    .neq('status', 'Cancelled')

  const { data: prevOrders } = await supabase
    .from('orders')
    .select('shipping, order_items(qty, price)')
    .eq('org_id', orgId)
    .gte('created_at', prevSince)
    .lt('created_at', sinceIso)
    .neq('status', 'Cancelled')

  const withTotal = (orders ?? []).map((o: any) => ({
    ...o,
    _total: (o.order_items ?? []).reduce((s: number, i: any) => s + i.qty * i.price, 0) + (o.shipping ?? 0),
    _month: (o.created_at as string).slice(0, 7),
  }))

  const prevTotal = (prevOrders ?? []).reduce((s: number, o: any) =>
    s + (o.order_items ?? []).reduce((ss: number, i: any) => ss + i.qty * i.price, 0) + (o.shipping ?? 0), 0)

  const totalRevenue  = withTotal.reduce((s, o) => s + o._total, 0)
  const totalOrders   = withTotal.length
  const aov           = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const revenueChange = prevTotal > 0
    ? +((((totalRevenue - prevTotal) / prevTotal) * 100).toFixed(1))
    : 100

  const monthlyMap = new Map<string, { revenue: number; orders: number }>()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    monthlyMap.set(d.toISOString().slice(0, 7), { revenue: 0, orders: 0 })
  }
  for (const o of withTotal) {
    const m = monthlyMap.get(o._month)
    if (m) { m.revenue += o._total; m.orders++ }
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const revenueByMonth = Array.from(monthlyMap.entries()).map(([month, d]) => ({
    month,
    label:   MONTH_NAMES[new Date(month + '-01').getMonth()]!,
    revenue: Math.round(d.revenue * 100) / 100,
    orders:  d.orders,
  }))

  const productMap = new Map<string, { name: string; category: string; revenue: number; units: number }>()
  for (const o of withTotal) {
    for (const item of (o.order_items ?? []) as any[]) {
      const key  = item.product_id ?? item.name
      const prev = productMap.get(key) ?? { name: item.product?.name ?? item.name, category: item.product?.categories?.name ?? 'Uncategorised', revenue: 0, units: 0 }
      prev.revenue += item.qty * item.price
      prev.units   += item.qty
      productMap.set(key, prev)
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue).slice(0, 7)
    .map(p => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))

  const COLORS = ['#008080','#0EA5E9','#8B5CF6','#F59E0B','#F472B6','#22C55E']
  const catMap = new Map<string, number>()
  for (const o of withTotal) {
    for (const item of (o.order_items ?? []) as any[]) {
      const cat = item.product?.categories?.name ?? 'Uncategorised'
      catMap.set(cat, (catMap.get(cat) ?? 0) + item.qty * item.price)
    }
  }
  const catTotal = Array.from(catMap.values()).reduce((s, v) => s + v, 0)
  const categoryBreakdown = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, revenue], i) => ({
      name,
      revenue: Math.round(revenue * 100) / 100,
      pct:     catTotal > 0 ? Math.round((revenue / catTotal) * 100) : 0,
      color:   COLORS[i % COLORS.length]!,
    }))

  return { totalRevenue: Math.round(totalRevenue * 100) / 100, totalOrders, aov: Math.round(aov * 100) / 100, revenueChange, revenueByMonth, topProducts, categoryBreakdown }
})
