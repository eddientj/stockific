import type { ProductPayload } from '~~/app/types'

export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing product id' })

  const body = await readJsonBody<Partial<ProductPayload>>(event)
  const update: Record<string, unknown> = {}

  if ('name' in body)        update.name        = requireString(body as any, 'name', 200)
  if ('description' in body) update.description = optionalString(body as any, 'description', 5000)
  if ('price' in body)       update.price       = requireNumber(body as any, 'price', { min: 0, max: 1_000_000 })
  if ('image_url' in body)   update.image_url   = optionalString(body as any, 'image_url', 1000)
  if ('category_id' in body) update.category_id = optionalUuid(body as any, 'category_id')
  if ('is_active' in body)   update.is_active   = !!body.is_active

  const supabase = useSupabaseAdmin()

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from('products')
      .update(update)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw createError({ statusCode: 404, statusMessage: 'Product not found' })
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
  }

  if (Array.isArray(body.variants) && body.variants.length > 0) {
    const { error: delErr } = await supabase.from('variants').delete().eq('product_id', id)
    if (delErr) throw createError({ statusCode: 500, statusMessage: delErr.message })

    const rows = body.variants.map(v => ({
      product_id:     id,
      org_id:         orgId,
      name:           (typeof v.name === 'string' && v.name.trim()) ? v.name.trim() : 'Default',
      sku:            (typeof v.sku === 'string' && v.sku.trim()) ? v.sku.trim() : null,
      stock_quantity: Math.max(0, Math.min(99999, Math.floor(Number(v.stock_quantity) || 0))),
      stock_on_hold:  Math.max(0, Math.min(99999, Math.floor(Number(v.stock_on_hold) || 0))),
      price_override: v.price_override != null ? Number(v.price_override) || null : null,
    }))

    const { error: insErr } = await supabase.from('variants').insert(rows)
    if (insErr) throw createError({ statusCode: 500, statusMessage: insErr.message })
  }

  return { ok: true }
})
