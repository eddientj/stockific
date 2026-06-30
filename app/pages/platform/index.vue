<script setup lang="ts">
definePageMeta({ layout: 'platform' })

const TIERS = ['trial', 'pro', 'premium', 'ultimate'] as const
type OrgTier = typeof TIERS[number]

interface PlatformOrg {
  id: string
  name: string
  slug: string | null
  tier: OrgTier
  trial_expires_at: string | null
  created_at: string
  user_count: number
  product_count: number
  invoice_count: number
}

const toast = useToast()
const { data: orgs, refresh, error } = await useFetch<PlatformOrg[]>('/api/platform/orgs')
const saving = ref<string | null>(null)

async function setTier(org: PlatformOrg, tier: OrgTier) {
  saving.value = `tier-${org.id}`
  try {
    await $fetch(`/api/platform/orgs/${org.id}`, { method: 'PATCH', body: { tier } })
    await refresh()
  } catch {
    toast.add({ title: 'Failed to update tier', color: 'error' })
  } finally {
    saving.value = null
  }
}

async function extendTrial(org: PlatformOrg) {
  saving.value = `trial-${org.id}`
  try {
    const base = org.trial_expires_at && new Date(org.trial_expires_at) > new Date()
      ? new Date(org.trial_expires_at)
      : new Date()
    base.setDate(base.getDate() + 30)
    await $fetch(`/api/platform/orgs/${org.id}`, {
      method: 'PATCH',
      body: { trial_expires_at: base.toISOString() },
    })
    await refresh()
  } catch {
    toast.add({ title: 'Failed to extend trial', color: 'error' })
  } finally {
    saving.value = null
  }
}

async function clearTrialExpiry(org: PlatformOrg) {
  saving.value = `trial-${org.id}`
  try {
    await $fetch(`/api/platform/orgs/${org.id}`, { method: 'PATCH', body: { trial_expires_at: null } })
    await refresh()
  } catch {
    toast.add({ title: 'Failed to clear expiry', color: 'error' })
  } finally {
    saving.value = null
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TIER_BADGE: Record<OrgTier, string> = {
  trial:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  pro:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  premium:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ultimate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-(--ui-text-highlighted)">Organisations</h1>
      <p class="text-sm text-(--ui-text-muted) mt-0.5">{{ orgs?.length ?? 0 }} registered orgs</p>
    </div>

    <div
      v-if="error"
      class="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-400"
    >
      {{ (error as any).statusCode === 403 ? 'Access denied — platform admin only.' : 'Failed to load organisations.' }}
    </div>

    <div v-else class="rounded-xl border border-(--ui-border) overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-elevated) border-b border-(--ui-border)">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Organisation</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Tier</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Trial Expiry</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Users</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Products</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Invoices</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">Joined</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr
            v-for="org in orgs"
            :key="org.id"
            class="bg-(--ui-bg) hover:bg-(--ui-bg-elevated) transition-colors"
          >
            <!-- Name -->
            <td class="px-4 py-3">
              <p class="font-medium text-(--ui-text-highlighted)">{{ org.name }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ org.slug ?? '—' }}</p>
            </td>

            <!-- Tier select -->
            <td class="px-4 py-3">
              <USelect
                :model-value="org.tier"
                :items="TIERS"
                size="xs"
                class="w-28"
                :disabled="saving === `tier-${org.id}`"
                @update:model-value="setTier(org, $event as OrgTier)"
              />
            </td>

            <!-- Trial expiry -->
            <td class="px-4 py-3 text-(--ui-text-muted) text-xs">{{ fmtDate(org.trial_expires_at) }}</td>

            <!-- Stats -->
            <td class="px-4 py-3 text-center text-(--ui-text-muted)">{{ org.user_count }}</td>
            <td class="px-4 py-3 text-center text-(--ui-text-muted)">{{ org.product_count }}</td>
            <td class="px-4 py-3 text-center text-(--ui-text-muted)">{{ org.invoice_count }}</td>

            <!-- Joined -->
            <td class="px-4 py-3 text-xs text-(--ui-text-muted)">{{ fmtDate(org.created_at) }}</td>

            <!-- Actions -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-1">
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :loading="saving === `trial-${org.id}`"
                  @click="extendTrial(org)"
                >+30d</UButton>
                <UButton
                  v-if="org.trial_expires_at"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="clearTrialExpiry(org)"
                >Clear</UButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
