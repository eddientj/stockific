/**
 * One-off: set user_metadata.first_name on the 4 existing test accounts.
 * Run with: node scripts/patch-test-user-metadata.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ACCOUNTS = [
  { email: 'trial@stockific.app',    first_name: 'Trial Store'    },
  { email: 'pro@stockific.app',      first_name: 'Pro Store'      },
  { email: 'premium@stockific.app',  first_name: 'Premium Store'  },
  { email: 'ultimate@stockific.app', first_name: 'Ultimate Store' },
]

for (const a of ACCOUNTS) {
  const { data: list } = await supabase.auth.admin.listUsers()
  const user = list?.users?.find(u => u.email === a.email)
  if (!user) { console.log(`${a.email}: not found`); continue }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { first_name: a.first_name },
  })
  console.log(error ? `${a.email}: ERROR — ${error.message}` : `${a.email}: updated`)
}
