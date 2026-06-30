/**
 * One-off script: provision 4 test accounts across all tiers.
 * Run with: node scripts/provision-test-users.mjs
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
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

const PASSWORD = '@bcD1234'
const EXPIRES_30_DAYS = new Date(Date.now() + 30 * 86400000).toISOString()

const TEST_USERS = [
  { email: 'trial@stockific.app',   business_name: 'Trial Store',    tier: 'trial',    trial_expires_at: EXPIRES_30_DAYS },
  { email: 'pro@stockific.app',     business_name: 'Pro Store',      tier: 'pro',      trial_expires_at: null },
  { email: 'premium@stockific.app', business_name: 'Premium Store',  tier: 'premium',  trial_expires_at: null },
  { email: 'ultimate@stockific.app',business_name: 'Ultimate Store', tier: 'ultimate', trial_expires_at: null },
]

for (const u of TEST_USERS) {
  process.stdout.write(`Provisioning ${u.email} (${u.tier})... `)

  // 1 — create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (authError) {
    // already exists — look up the user
    if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
      console.log('already exists, skipping.')
      continue
    }
    console.error('AUTH ERROR:', authError.message)
    continue
  }

  const userId = authData.user.id

  // 2 — profile
  await supabase.from('profiles').upsert({ id: userId, full_name: u.business_name }, { onConflict: 'id' })

  // 3 — org
  const { data: orgId, error: orgError } = await supabase.rpc('create_organisation', {
    p_user_id: userId,
    p_name:    u.business_name,
  })
  if (orgError) { console.error('ORG ERROR:', orgError.message); continue }

  // 4 — tier
  await supabase.from('organisations')
    .update({ tier: u.tier, trial_expires_at: u.trial_expires_at })
    .eq('id', orgId)

  // 5 — business settings name
  await supabase.from('business_settings')
    .update({ company_name: u.business_name })
    .eq('org_id', orgId)

  console.log(`done (user_id: ${userId}, org_id: ${orgId})`)
}

console.log('\nAll done. Accounts:')
for (const u of TEST_USERS) console.log(`  ${u.tier.padEnd(10)} ${u.email}  /  ${PASSWORD}`)
