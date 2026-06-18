const VALID_TYPES = ['call', 'email', 'note', 'meeting'] as const
type ActivityType = typeof VALID_TYPES[number]

export default defineEventHandler(async (event) => {
  const { orgId, user } = await requireAuth(event)
  const body = await readJsonBody<Record<string, unknown>>(event)

  const type       = requireString(body, 'type', 20)
  const bodyText   = requireString(body, 'body', 5000)
  const lead_id    = optionalUuid(body, 'lead_id')
  const company_id = optionalUuid(body, 'company_id')

  if (!VALID_TYPES.includes(type as ActivityType)) {
    throw createError({ statusCode: 400, statusMessage: `type must be one of: ${VALID_TYPES.join(', ')}` })
  }
  if (!lead_id && !company_id) {
    throw createError({ statusCode: 400, statusMessage: 'Provide lead_id or company_id' })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('activities')
    .insert({
      org_id:     orgId,
      type:       type as ActivityType,
      body:       bodyText,
      lead_id,
      company_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
