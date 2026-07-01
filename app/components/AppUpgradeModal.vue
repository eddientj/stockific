<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const { tier } = useOrg()

// ── Plans ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'trial' as const,
    label: 'Trial',
    badgeBg: 'bg-(--color-brand-500)',
    price: 'Free',
    priceNote: null,
    promoNote: null,
    yearlyAmount: null,
    yearlyDisplay: null,
    features: [
      { label: '30 products',                ok: true  },
      { label: '50 invoices / month',        ok: true  },
      { label: '20 orders / month',          ok: true  },
      { label: 'CRM',                        ok: false },
      { label: 'Batch / Lot tracking',       ok: false },
      { label: 'CSV & Excel export',         ok: false },
    ],
    popular: false,
  },
  {
    key: 'pro' as const,
    label: 'Pro',
    badgeBg: 'bg-amber-500',
    price: 'RM 59.99',
    priceNote: 'Billed yearly — RM 599 / year',
    promoNote: null,
    yearlyAmount: 599.00,
    yearlyDisplay: '599',
    features: [
      { label: '200 products',               ok: true  },
      { label: '300 invoices / month',       ok: true  },
      { label: '150 orders / month',         ok: true  },
      { label: 'CRM — leads & pipeline',     ok: true  },
      { label: 'Batch / Lot tracking',       ok: false },
      { label: 'CSV & Excel export',         ok: false },
    ],
    popular: false,
  },
  {
    key: 'premium' as const,
    label: 'Premium',
    badgeBg: 'bg-violet-500',
    price: 'RM 135',
    priceNote: 'Billed yearly — RM 1,620 / year',
    promoNote: '🎉 10% off — new launch promo',
    yearlyAmount: 1620.00,
    yearlyDisplay: '1,620',
    features: [
      { label: '1,000 products',             ok: true },
      { label: 'Unlimited invoices & orders',ok: true },
      { label: 'CRM — leads & pipeline',     ok: true },
      { label: 'Batch / Lot tracking',       ok: true },
      { label: 'CSV & Excel export',         ok: true },
      { label: 'Priority support',           ok: true },
    ],
    popular: true,
  },
  {
    key: 'ultimate' as const,
    label: 'Ultimate',
    badgeBg: 'bg-emerald-500',
    price: 'RM 300',
    priceNote: 'Billed yearly — RM 3,000 / year',
    promoNote: null,
    yearlyAmount: 3000.00,
    yearlyDisplay: '3,000',
    features: [
      { label: 'Unlimited products',         ok: true },
      { label: 'Unlimited invoices & orders',ok: true },
      { label: 'CRM — leads & pipeline',     ok: true },
      { label: 'Batch / Lot tracking',       ok: true },
      { label: 'CSV & Excel export',         ok: true },
      { label: 'Dedicated account manager',  ok: true },
    ],
    popular: false,
  },
]

const ORDER: Record<string, number> = { trial: 0, pro: 1, premium: 2, ultimate: 3 }
const isCurrent = (key: string) => key === tier.value
const isBelow   = (key: string) => ORDER[key] < ORDER[tier.value]

// ── Step management ───────────────────────────────────────────────────
type Step = 'plans' | 'checkout'
const step        = ref<Step>('plans')
const checkoutPlan = ref(PLANS[2])

function openCheckout(plan: typeof PLANS[number]) {
  checkoutPlan.value = plan
  step.value = 'checkout'
}

// ── Payment ───────────────────────────────────────────────────────────
const paying   = ref(false)
const payError = ref('')

async function pay() {
  payError.value = ''
  paying.value = true
  try {
    const { payment_url } = await $fetch<{ payment_url: string }>('/api/payment/create-upgrade', {
      method: 'POST',
      body:   { plan: checkoutPlan.value.key },
    })
    window.location.href = payment_url
  } catch (e: any) {
    payError.value = e?.data?.statusMessage || 'Something went wrong. Please try again.'
    paying.value = false
  }
}

function close() {
  emit('update:open', false)
  setTimeout(() => { step.value = 'plans'; payError.value = '' }, 300)
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'sm:max-w-5xl' }"
    @update:open="v => { if (!v) close() }"
  >
    <!-- Header -->
    <template #header>
      <div v-show="step === 'plans'" class="px-1 pt-1">
        <h2 class="text-xl font-bold text-(--ui-text-highlighted)">Choose your plan</h2>
        <p class="text-sm text-(--ui-text-muted) mt-0.5">All plans billed yearly. Activates automatically after payment.</p>
      </div>
      <div v-show="step === 'checkout'" class="flex items-center gap-3">
        <button
          class="p-1 rounded-md hover:bg-(--ui-bg-elevated) transition-colors border-0 bg-transparent cursor-pointer"
          @click="step = 'plans'"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4 text-(--ui-text-muted)" />
        </button>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-(--ui-text-highlighted)">Upgrade to</h2>
            <span
              class="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white"
              :class="checkoutPlan.badgeBg"
            >{{ checkoutPlan.label }}</span>
          </div>
          <p class="text-sm text-(--ui-text-muted)">Review your order and pay securely via HitPay.</p>
        </div>
      </div>
    </template>

    <!-- Body -->
    <template #body>
      <!-- ── Step 1: Plan grid ──────────────────────────────────────── -->
      <div v-show="step === 'plans'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="plan in PLANS"
          :key="plan.key"
          class="relative flex flex-col rounded-xl border p-5 transition-opacity"
          :class="[
            isCurrent(plan.key)
              ? 'border-(--color-brand-500) shadow-lg shadow-(--color-brand-500)/10'
              : 'border-(--ui-border)',
            isBelow(plan.key) ? 'opacity-40 pointer-events-none select-none' : '',
          ]"
        >
          <div
            v-if="plan.popular"
            class="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide bg-(--color-brand-500) text-white shadow"
          >
            Most Popular
          </div>

          <div class="flex items-start justify-between gap-2 mb-2">
            <span
              class="text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white"
              :class="plan.badgeBg"
            >{{ plan.label }}</span>
            <span
              v-if="isCurrent(plan.key)"
              class="text-[11px] font-semibold text-(--color-brand-500) bg-(--color-brand-500)/10 px-2 py-0.5 rounded-full whitespace-nowrap"
            >Current</span>
          </div>

          <!-- Price -->
          <div class="mb-3">
            <span class="text-lg font-bold text-(--ui-text-highlighted)">{{ plan.price }}</span>
            <span v-if="plan.yearlyAmount" class="text-xs text-(--ui-text-dimmed)"> / mo</span>
            <div v-if="plan.priceNote" class="text-[11px] text-(--ui-text-dimmed) mt-0.5">{{ plan.priceNote }}</div>
            <div v-if="plan.promoNote" class="text-[11px] text-amber-500 mt-0.5">{{ plan.promoNote }}</div>
          </div>

          <ul class="space-y-2 flex-1 mb-5">
            <li
              v-for="f in plan.features"
              :key="f.label"
              class="flex items-start gap-2 text-sm"
              :class="f.ok ? 'text-(--ui-text)' : 'text-(--ui-text-dimmed)'"
            >
              <UIcon
                :name="f.ok ? 'i-lucide-check' : 'i-lucide-minus'"
                class="mt-0.5 size-4 shrink-0"
                :class="f.ok ? 'text-emerald-500' : 'text-(--ui-text-dimmed)'"
              />
              {{ f.label }}
            </li>
          </ul>

          <div
            v-if="isCurrent(plan.key)"
            class="w-full text-center text-sm font-medium py-2 px-4 rounded-lg border border-(--ui-border) text-(--ui-text-muted) cursor-default"
          >
            Current plan
          </div>
          <button
            v-else-if="!isBelow(plan.key) && plan.yearlyAmount"
            class="w-full text-center text-sm font-semibold py-2 px-4 rounded-lg text-white hover:opacity-90 transition-opacity cursor-pointer border-0"
            :class="plan.badgeBg"
            @click="openCheckout(plan)"
          >
            Upgrade to {{ plan.label }}
          </button>
        </div>
      </div>

      <!-- ── Step 2: Checkout ───────────────────────────────────────── -->
      <div v-show="step === 'checkout'" class="max-w-sm mx-auto space-y-5">
        <!-- Order summary -->
        <div class="rounded-xl border border-(--ui-border) divide-y divide-(--ui-border) overflow-hidden text-sm">
          <div class="flex justify-between px-4 py-3">
            <span class="text-(--ui-text-muted)">Plan</span>
            <span class="font-medium text-(--ui-text-highlighted) flex items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded text-white" :class="checkoutPlan.badgeBg">{{ checkoutPlan.label }}</span>
            </span>
          </div>
          <div class="flex justify-between px-4 py-3">
            <span class="text-(--ui-text-muted)">Price</span>
            <span class="font-medium text-(--ui-text-highlighted)">{{ checkoutPlan.price }} / month</span>
          </div>
          <div class="flex justify-between px-4 py-3">
            <span class="text-(--ui-text-muted)">Billing period</span>
            <span class="font-medium text-(--ui-text-highlighted)">Yearly</span>
          </div>
          <div v-if="checkoutPlan.promoNote" class="flex justify-between px-4 py-3">
            <span class="text-(--ui-text-muted)">Promotion</span>
            <span class="font-medium text-amber-500">{{ checkoutPlan.promoNote }}</span>
          </div>
          <div class="flex justify-between px-4 py-4 bg-(--ui-bg-elevated)">
            <span class="font-semibold text-(--ui-text-highlighted)">Total today</span>
            <span class="font-bold text-lg text-(--ui-text-highlighted)">RM {{ checkoutPlan.yearlyDisplay }}</span>
          </div>
        </div>

        <p v-if="payError" class="text-sm text-red-500">{{ payError }}</p>

        <p class="text-xs text-center text-(--ui-text-dimmed)">
          You'll be redirected to HitPay to complete payment securely. Your plan activates automatically once payment is confirmed.
        </p>

        <!-- Actions inline — avoids the named-slot v-if compiler issue -->
        <div class="flex items-center justify-between pt-1">
          <UButton variant="ghost" color="neutral" @click="step = 'plans'">Back</UButton>
          <UButton :loading="paying" @click="pay">Pay RM {{ checkoutPlan.yearlyDisplay }} →</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
