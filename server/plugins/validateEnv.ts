// Fails fast at startup if required env vars are missing rather than
// surfacing cryptic errors at runtime during the first API call.
export default defineNitroPlugin(() => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_ANON_KEY',
  ]

  const missing = required.filter(k => !process.env[k])

  if (missing.length) {
    console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`)
    console.error('[startup] Check your .env file against .env.example and restart.')
    process.exit(1)
  }
})
