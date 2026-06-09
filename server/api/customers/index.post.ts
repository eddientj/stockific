import type { CustomerPayload } from '~~/app/types'

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<CustomerPayload>(event)

  const name     = requireString(body as any, 'name', 200)
  const email    = optionalString(body as any, 'email', 500)
  const phone    = optionalString(body as any, 'phone', 50)
  const address  = optionalString(body as any, 'address', 500)
  const city     = optionalString(body as any, 'city', 200)
  const postcode = optionalString(body as any, 'postcode', 20)
  const notes    = optionalString(body as any, 'notes', 2000)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, email, phone, address, city, postcode, notes })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
