import type { ProductPayload } from '~~/app/types'

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<ProductPayload>(event)

  const name        = requireString(body as any, 'name', 200)
  const description = optionalString(body as any, 'description', 5000)
  const price       = requireNumber(body as any, 'price', { min: 0, max: 1_000_000 })
  const image_url   = optionalString(body as any, 'image_url', 1000)
  const category_id = optionalUuid(body as any, 'category_id')
  const is_active   = body.is_active === false ? false : true

  const rawVariants = Array.isArray(body.variants) ? body.variants : []
  const variants = rawVariants.map((v, i) => {
    const name = (typeof v.name === 'string' && v.name.trim()) ? v.name.trim() : 'Default'
    const stock_quantity = Math.max(0, Math.floor(Number(v.stock_quantity) || 0))
    const stock_on_hold  = Math.max(0, Math.floor(Number(v.stock_on_hold)  || 0))
    const sku            = (typeof v.sku === 'string' && v.sku.trim()) ? v.sku.trim() : null
    const price_override = v.price_override != null ? Number(v.price_override) || null : null
    return { name, sku, stock_quantity, stock_on_hold, price_override }
  })

  const supabase = useSupabaseAdmin()

  const { data: product, error } = await supabase
    .from('products')
    .insert({ name, description, price, image_url, category_id, is_active })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (variants.length > 0) {
    const { error: vError } = await supabase
      .from('variants')
      .insert(variants.map(v => ({ ...v, product_id: product.id })))
    if (vError) throw createError({ statusCode: 500, statusMessage: vError.message })
  }

  return product
})
