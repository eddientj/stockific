const VALID_PLANS = new Set(['pro', 'premium', 'ultimate'])
const PLAN_AMOUNTS: Record<string, number> = {
  pro:      599.00,
  premium:  1620.00,
  ultimate: 3000.00,
}

export default defineEventHandler(async (event) => {
  const { user, orgId } = await requireAuth(event)

  const { plan } = await readBody(event)
  if (!VALID_PLANS.has(plan)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid plan' })
  }

  const config = useRuntimeConfig()
  const isSandbox = config.hitpayMode !== 'live'
  const apiUrl = isSandbox
    ? 'https://api.sandbox.hit-pay.com/v1/payment-requests'
    : 'https://api.hit-pay.com/v1/payment-requests'

  const host = getRequestHeader(event, 'host') ?? 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  // Reference format: upgrade__{plan}__{orgId} — double-underscore separator so UUID hyphens don't clash
  const reference = `upgrade__${plan}__${orgId}`

  const formData = new URLSearchParams({
    amount:           PLAN_AMOUNTS[plan]!.toFixed(2),
    currency:         'MYR',
    redirect_url:     `${baseUrl}/admin/upgrade-success`,
    webhook:          `${baseUrl}/api/payment/webhook`,
    reference_number: reference,
    email:            user.email ?? '',
  })

  const res = await $fetch<{ id: string; url: string }>(apiUrl, {
    method:  'POST',
    headers: {
      'X-BUSINESS-API-KEY': config.hitpayApiKey as string,
      'Content-Type':       'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  return { payment_url: res.url }
})
