// Simple sliding-window rate limiter. Keyed by IP + route bucket.
// Cleans up expired entries every 5 minutes to prevent memory growth.

interface Bucket { count: number; resetAt: number }

const store = new Map<string, Bucket>()

// Tighter limit on auth, looser on general API
const LIMITS: Array<{ prefix: string; max: number; windowMs: number }> = [
  { prefix: '/api/auth', max: 20,  windowMs: 60_000 },
  { prefix: '/api',      max: 200, windowMs: 60_000 },
]

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (now > bucket.resetAt) store.delete(key)
  }
}, 5 * 60_000)

export default defineEventHandler((event) => {
  const path   = getRequestURL(event).pathname
  const ip     = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const limit  = LIMITS.find(l => path.startsWith(l.prefix))
  if (!limit) return

  const key    = `${ip}:${limit.prefix}`
  const now    = Date.now()
  const bucket = store.get(key)

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + limit.windowMs })
    return
  }

  bucket.count++

  if (bucket.count > limit.max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({ statusCode: 429, message: 'Too many requests. Please try again later.' })
  }
})
