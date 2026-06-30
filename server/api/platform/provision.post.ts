const VALID_TIERS = new Set(['trial', 'pro', 'premium', 'ultimate'])

export default defineEventHandler(async (event) => {
  await requirePlatformAdmin(event)

  const body = await readBody(event)
  const { email, password, business_name, tier = 'trial', trial_expires_at } = body

  if (!email?.trim())         throw createError({ statusCode: 400, statusMessage: 'email is required' })
  if (!password?.trim())      throw createError({ statusCode: 400, statusMessage: 'password is required' })
  if (!business_name?.trim()) throw createError({ statusCode: 400, statusMessage: 'business_name is required' })
  if (!VALID_TIERS.has(tier)) throw createError({ statusCode: 400, statusMessage: 'Invalid tier' })

  const supabase = useSupabaseAdmin()

  // 1 — create auth user (skip email verification)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    email_confirm: true,
  })
  if (authError) throw createError({ statusCode: 400, statusMessage: authError.message })

  const userId = authData.user.id

  // 2 — create profile
  await supabase.from('profiles').insert({ id: userId, full_name: business_name.trim() })

  // 3 — create org via RPC
  const { data: orgId, error: orgError } = await supabase.rpc('create_organisation', {
    p_user_id: userId,
    p_name:    business_name.trim(),
  })
  if (orgError) throw createError({ statusCode: 500, statusMessage: orgError.message })

  // 4 — set tier (and optional trial expiry)
  const orgUpdate: Record<string, any> = { tier }
  if (trial_expires_at !== undefined) orgUpdate.trial_expires_at = trial_expires_at
  await supabase.from('organisations').update(orgUpdate).eq('id', orgId)

  // 5 — set business name
  await supabase.from('business_settings').update({ company_name: business_name.trim() }).eq('org_id', orgId)

  return { ok: true, user_id: userId, org_id: orgId, email, tier }
})
