export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)
  const supabase = useSupabaseAdmin()

  const { data: orgs, error } = await supabase
    .from('organisations')
    .select('id, name, slug, tier, trial_expires_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!orgs?.length) return []

  const orgIds = orgs.map(o => o.id)

  const [userRows, productRows, invoiceRows] = await Promise.all([
    supabase.from('org_users').select('org_id').in('org_id', orgIds),
    supabase.from('products').select('org_id').in('org_id', orgIds),
    supabase.from('invoices').select('org_id').in('org_id', orgIds),
  ])

  const countMap = (rows: Array<{ org_id: string }> | null) => {
    const m: Record<string, number> = {}
    for (const r of rows ?? []) m[r.org_id] = (m[r.org_id] ?? 0) + 1
    return m
  }

  const users    = countMap(userRows.data)
  const products = countMap(productRows.data)
  const invoices = countMap(invoiceRows.data)

  return orgs.map(o => ({
    ...o,
    user_count:    users[o.id]    ?? 0,
    product_count: products[o.id] ?? 0,
    invoice_count: invoices[o.id] ?? 0,
  }))
})
