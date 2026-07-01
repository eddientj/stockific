/**
 * One-off: create/fix profiles rows for the 4 test accounts.
 * Run with: node scripts/patch-test-user-profiles.mjs
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
  { email: 'trial@stockific.app',    username: 'trialstore',   first_name: 'Trial Store'    },
  { email: 'pro@stockific.app',      username: 'prostore',     first_name: 'Pro Store'      },
  { email: 'premium@stockific.app',  username: 'premiumstore', first_name: 'Premium Store'  },
  { email: 'ultimate@stockific.app', username: 'ultimatestore',first_name: 'Ultimate Store' },
]

const { data: { users } } = await supabase.auth.admin.listUsers()

for (const a of ACCOUNTS) {
  const user = users?.find(u => u.email === a.email)
  if (!user) { console.log(`${a.email}: not found`); continue }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({ username: a.username, first_name: a.first_name })
      .eq('id', user.id)
    console.log(error ? `${a.email}: UPDATE ERROR — ${error.message}` : `${a.email}: updated (${a.username})`)
  } else {
    const { error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: a.username, first_name: a.first_name })
    console.log(error ? `${a.email}: INSERT ERROR — ${error.message}` : `${a.email}: inserted (${a.username})`)
  }
}
