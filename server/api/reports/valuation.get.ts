export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, is_active, categories(name), variants(id, name, sku, cost_price, stock_quantity, stock_on_hold)')
    .eq('org_id', orgId)
    .order('name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (products ?? []).map(p => {
    const catName = (p.categories as any)?.name ?? null
    const variants = ((p.variants ?? []) as any[]).map(v => {
      const live  = Math.max(0, (v.stock_quantity ?? 0) - (v.stock_on_hold ?? 0))
      const cost  = v.cost_price != null ? Number(v.cost_price) : null
      return {
        variant_id:   v.id,
        variant_name: v.name,
        sku:          v.sku ?? null,
        cost_price:   cost,
        live_stock:   live,
        value:        cost != null ? Math.round(cost * live * 100) / 100 : 0,
      }
    })
    return {
      product_id:   p.id,
      product_name: p.name,
      category_name: catName,
      is_active:    p.is_active,
      variants,
      total_units: variants.reduce((s, v) => s + v.live_stock, 0),
      total_value: Math.round(variants.reduce((s, v) => s + v.value, 0) * 100) / 100,
    }
  })

  // Sort by total_value descending
  rows.sort((a, b) => b.total_value - a.total_value)

  const total_value = Math.round(rows.reduce((s, r) => s + r.total_value, 0) * 100) / 100
  const total_units = rows.reduce((s, r) => s + r.total_units, 0)
  const products_with_cost = rows.filter(r => r.variants.some(v => v.cost_price != null)).length

  return { total_value, total_units, products_with_cost, products_total: rows.length, rows }
})
