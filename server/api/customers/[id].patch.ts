import type { CustomerPayload } from '~~/app/types'

export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')!
  const body = await readJsonBody<Partial<CustomerPayload>>(event)

  const patch: Record<string, unknown> = {}
  if (body.name     !== undefined) patch.name     = requireString(body as any, 'name', 200)
  if (body.email    !== undefined) patch.email    = optionalString(body as any, 'email', 500)
  if (body.phone    !== undefined) patch.phone    = optionalString(body as any, 'phone', 50)
  if (body.address  !== undefined) patch.address  = optionalString(body as any, 'address', 500)
  if (body.city     !== undefined) patch.city     = optionalString(body as any, 'city', 200)
  if (body.postcode !== undefined) patch.postcode = optionalString(body as any, 'postcode', 20)
  if (body.notes    !== undefined) patch.notes    = optionalString(body as any, 'notes', 2000)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('customers')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
