<script setup lang="ts">
definePageMeta({ layout: false })

const route  = useRoute()
const { user, init } = useAuth()

const PLANS = [
  { key: 'pro',      label: 'Pro',      badgeClass: 'bg-amber-500',   monthly: '59.99', yearlyDisplay: '599',   yearlyAmount: '599.00',  promo: null },
  { key: 'premium',  label: 'Premium',  badgeClass: 'bg-violet-500',  monthly: '135',   yearlyDisplay: '1,620', yearlyAmount: '1620.00', promo: '🎉 10% new launch promo' },
  { key: 'ultimate', label: 'Ultimate', badgeClass: 'bg-emerald-500', monthly: '300',   yearlyDisplay: '3,000', yearlyAmount: '3000.00', promo: null },
] as const

type PlanKey = typeof PLANS[number]['key']

const selectedKey  = ref<PlanKey>((['pro', 'premium', 'ultimate'].includes(route.query.plan as string) ? route.query.plan : 'premium') as PlanKey)
const selectedPlan = computed(() => PLANS.find(p => p.key === selectedKey.value) ?? PLANS[1]!)

const paying   = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  await init()
  if (!user.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
  }
})

async function pay() {
  errorMsg.value = ''
  paying.value = true
  try {
    const { payment_url } = await $fetch<{ payment_url: string }>('/api/payment/create-upgrade', {
      method: 'POST',
      body:   { plan: selectedKey.value },
    })
    window.location.href = payment_url
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Something went wrong. Please try again.'
    paying.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#080f0f] flex flex-col">
    <!-- Navbar -->
    <header class="h-16 border-b border-white/5 flex items-center px-6 gap-4">
      <NuxtLink to="/" class="flex items-center gap-2 no-underline">
        <img src="/logo-icon.png" alt="" class="h-7 w-7 object-contain" />
        <span class="text-sm font-bold tracking-tight text-white">Stockific</span>
      </NuxtLink>
      <span class="text-white/20">/</span>
      <span class="text-sm text-white/50">Upgrade plan</span>
    </header>

    <main class="flex-1 flex items-start justify-center px-4 py-16">
      <div class="w-full max-w-lg space-y-8">

        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Upgrade your plan</h1>
          <p class="text-white/40">All plans billed yearly. Secured by HitPay.</p>
        </div>

        <!-- Plan selector -->
        <div class="space-y-3">
          <button
            v-for="p in PLANS"
            :key="p.key"
            type="button"
            class="w-full flex items-center justify-between rounded-xl border px-5 py-4 transition-all duration-200 cursor-pointer text-left"
            :class="selectedKey === p.key
              ? 'border-white/30 bg-white/[0.06] shadow-lg'
              : 'border-white/8 bg-transparent hover:border-white/15'"
            @click="selectedKey = p.key"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="selectedKey === p.key ? 'border-white' : 'border-white/30'"
              >
                <div v-if="selectedKey === p.key" class="w-2 h-2 rounded-full bg-white" />
              </div>
              <span class="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white" :class="p.badgeClass">{{ p.label }}</span>
              <span v-if="p.promo" class="hidden sm:inline text-[11px] text-amber-400 font-medium">{{ p.promo }}</span>
            </div>
            <div class="text-right shrink-0 ml-4">
              <div>
                <span class="text-white font-bold">RM {{ p.monthly }}</span>
                <span class="text-white/40 text-sm"> / mo</span>
              </div>
              <div class="text-xs text-white/30">RM {{ p.yearlyDisplay }} / year</div>
            </div>
          </button>
        </div>

        <!-- Order summary -->
        <div class="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-white/50">Plan</span>
            <span class="text-white font-medium">{{ selectedPlan.label }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/50">Billing period</span>
            <span class="text-white font-medium">Yearly</span>
          </div>
          <div v-if="selectedPlan.promo" class="flex justify-between">
            <span class="text-white/50">Promotion</span>
            <span class="text-amber-400 font-medium">{{ selectedPlan.promo }}</span>
          </div>
          <div class="border-t border-white/10 pt-3 flex justify-between items-baseline">
            <span class="text-white font-semibold">Total today</span>
            <span class="text-white font-bold text-xl">RM {{ selectedPlan.yearlyDisplay }}</span>
          </div>
        </div>

        <p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>

        <button
          type="button"
          :disabled="paying"
          class="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-bold transition-all duration-200 hover:shadow-xl hover:shadow-brand-500/25 cursor-pointer border-0"
          @click="pay"
        >
          <span v-if="paying">Redirecting to payment…</span>
          <span v-else>Pay RM {{ selectedPlan.yearlyDisplay }} →</span>
        </button>

        <p class="text-center text-xs text-white/25">
          Payments processed securely by HitPay. Your plan activates automatically after payment.
        </p>
      </div>
    </main>
  </div>
</template>
