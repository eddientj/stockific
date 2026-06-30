import { createHmac } from 'crypto'

const VALID_PLANS = new Set(['pro', 'premium', 'ultimate'])

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<Record<string, string>>(event)

  const { hmac, ...params } = body
  if (!hmac) throw createError({ statusCode: 400, statusMessage: 'Missing hmac' })

  // HitPay HMAC: sort params by key, join as "key=value\n", sign with HMAC-SHA256
  const message = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('\n')
  const computed = createHmac('sha256', config.hitpaySalt as string).update(message).digest('hex')

  if (computed !== hmac) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  if (body.status !== 'completed') return { ok: true }

  // Reference format: upgrade__{plan}__{orgId}
  const ref = body.reference_number ?? ''
  const parts = ref.split('__')
  if (parts.length !== 3 || parts[0] !== 'upgrade') return { ok: true }

  const [, plan, orgId] = parts
  if (!VALID_PLANS.has(plan!)) return { ok: true }

  const supabase = useSupabaseAdmin()
  await supabase.from('organisations').update({ tier: plan }).eq('id', orgId)

  return { ok: true }
})
