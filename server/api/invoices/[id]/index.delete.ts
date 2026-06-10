export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()
  // invoice_items cascade on delete
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
