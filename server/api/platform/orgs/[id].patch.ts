const VALID_TIERS = new Set(['trial', 'pro', 'premium', 'ultimate'])

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing org id' })

  const body = await readBody(event)
  const supabase = useSupabaseAdmin()

  const update: Record<string, any> = {}

  if (body.tier !== undefined) {
    if (!VALID_TIERS.has(body.tier)) throw createError({ statusCode: 400, statusMessage: 'Invalid tier' })
    update.tier = body.tier
  }

  if ('trial_expires_at' in body) {
    update.trial_expires_at = body.trial_expires_at ?? null
  }

  if (!Object.keys(update).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })

  const { data, error } = await supabase
    .from('organisations')
    .update(update)
    .eq('id', id)
    .select('id, name, slug, tier, trial_expires_at')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
