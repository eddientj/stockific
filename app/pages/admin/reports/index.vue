<script setup lang="ts">
import type { ProductRow } from '~/types'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

// ── Live inventory data ──────────────────────────────────────
const { data: products } = await useFetch<ProductRow[]>('/api/products')

// ── Period selector ──────────────────────────────────────────
type Period = '1M' | '3M' | '6M' | '1Y'
const period = ref<Period>('3M')
const PERIODS = computed(() => [
  { key: '1M' as Period, label: t('rep.1m') },
  { key: '3M' as Period, label: t('rep.3m') },
  { key: '6M' as Period, label: t('rep.6m') },
  { key: '1Y' as Period, label: t('rep.1y') },
])

// ── Real reports data (reactive to period) ───────────────────
type ReportData = {
  totalRevenue: number
  totalOrders: number
  aov: number
  revenueChange: number
  revenueByMonth: { month: string; label: string; revenue: number; orders: number }[]
  topProducts: { name: string; category: string; revenue: number; units: number }[]
  categoryBreakdown: { name: string; revenue: number; pct: number; color: string }[]
}

const { data: reportData, refresh: refreshReport } = await useFetch<ReportData>(
  () => `/api/reports?period=${period.value}`,
  { watch: [period] }
)

const periodRevenue  = computed(() => reportData.value?.totalRevenue  ?? 0)
const periodOrders   = computed(() => reportData.value?.totalOrders   ?? 0)
const revenueGrowth  = computed(() => reportData.value?.revenueChange ?? 0)
const aov            = computed(() => reportData.value?.aov           ?? 0)
const topProducts    = computed(() => reportData.value?.topProducts   ?? [])
const maxProductRev  = computed(() => topProducts.value[0]?.revenue   ?? 1)

const categoryBreakdown = computed(() => reportData.value?.categoryBreakdown ?? [])
const totalCatRevenue   = computed(() => categoryBreakdown.value.reduce((s, c) => s + c.revenue, 0))

// ── Revenue area chart SVG ────────────────────────────────────
const CHART_W = 600
const CHART_H = 120

const visibleMonths = computed(() => reportData.value?.revenueByMonth ?? [])

const maxRev = computed(() => Math.max(...visibleMonths.value.map(m => m.revenue), 1))
const minRev = computed(() => Math.min(...visibleMonths.value.map(m => m.revenue)) * 0.8)

function rx(i: number, total: number) {
  return total <= 1 ? CHART_W / 2 : (i / (total - 1)) * CHART_W
}
function ry(v: number, max: number, min: number) {
  return CHART_H - ((v - min) / (max - min || 1)) * CHART_H * 0.85
}

const chartPts = computed(() =>
  visibleMonths.value.map((m, i) => ({
    x: rx(i, visibleMonths.value.length),
    y: ry(m.revenue, maxRev.value, minRev.value),
    label: m.label,
    value: m.revenue,
  }))
)

const polyline = computed(() => chartPts.value.map(p => `${p.x},${p.y}`).join(' '))
const fillPath = computed(() => {
  const pts = chartPts.value
  if (!pts.length) return ''
  const first = pts[0]!
  const last  = pts[pts.length - 1]!
  return `M${first.x},${CHART_H} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${last.x},${CHART_H} Z`
})

// ── Donut chart ───────────────────────────────────────────────
const DONUT_R  = 54
const DONUT_CX = 80
const DONUT_CY = 80
const STROKE   = 22

const donutSegments = computed(() => {
  let offset = 0
  const circ = 2 * Math.PI * DONUT_R
  return categoryBreakdown.value.map(c => {
    const dash = (c.pct / 100) * circ
    const gap  = circ - dash
    const seg  = { ...c, dash, gap, offset: offset * circ / 100 }
    offset += c.pct
    return seg
  })
})

// ── Inventory health (real) ──────────────────────────────────
const liveStock = (p: ProductRow) =>
  (p.variants ?? []).reduce((s, v) => s + v.stock_quantity - v.stock_on_hold, 0)

const inventoryStats = computed(() => {
  const all     = products.value ?? []
  const total   = all.length
  const healthy = all.filter(p => liveStock(p) > 10).length
  const low     = all.filter(p => liveStock(p) > 0 && liveStock(p) <= 10).length
  const out     = all.filter(p => liveStock(p) === 0).length
  return { total, healthy, low, out }
})

// ── Helpers ───────────────────────────────────────────────────
const rmK = (n: number) => n >= 1000 ? `RM ${(n / 1000).toFixed(1)}k` : `RM ${n.toFixed(0)}`
const rm  = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 0 })}`
</script>

<template>
  <section class="space-y-6">

    <!-- ── Header + period toggle ─────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-(--ui-text-highlighted)">{{ t('rep.title') }}</h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">{{ t('rep.subtitle') }}</p>
      </div>

      <!-- Period tabs -->
      <div class="flex items-center gap-1 p-1 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border)">
        <button
          v-for="p in PERIODS"
          :key="p.key"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          :class="period === p.key
            ? 'bg-indigo-500 text-white shadow-sm'
            : 'text-(--ui-text-muted) hover:text-(--ui-text-highlighted)'"
          @click="period = p.key"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- ── KPI cards ──────────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

      <UCard>
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-circle-dollar-sign" class="size-4 text-indigo-500" />
          </div>
          <span class="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-lucide-trending-up" class="size-3" />+{{ revenueGrowth }}%
          </span>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ rmK(periodRevenue) }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('rep.revenue') }}</p>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-shopping-cart" class="size-4 text-violet-500" />
          </div>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ periodOrders.toLocaleString('en-MY') }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('rep.orders') }}</p>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-receipt" class="size-4 text-sky-500" />
          </div>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ rmK(aov) }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('rep.aov') }}</p>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-package" class="size-4 text-amber-500" />
          </div>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ inventoryStats.total }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('rep.totalProds') }}</p>
      </UCard>

    </div>

    <!-- ── Revenue chart ──────────────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('rep.revTime') }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ t('rep.monthly') }}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-indigo-500">{{ rm(periodRevenue) }}</p>
            <p class="text-xs text-emerald-500">+{{ revenueGrowth }}% {{ t('rep.vsPrior') }}</p>
          </div>
        </div>
      </template>

      <div>
        <svg :viewBox="`0 0 ${CHART_W} ${CHART_H}`" class="w-full" preserveAspectRatio="none" style="height:140px">
          <defs>
            <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stop-color="#6366F1" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#6366F1" stop-opacity="0"   />
            </linearGradient>
          </defs>
          <!-- Horizontal guides -->
          <line v-for="n in 3" :key="n" :x1="0" :x2="CHART_W" :y1="(CHART_H / 4) * n" :y2="(CHART_H / 4) * n"
            stroke="currentColor" class="text-(--ui-border)" stroke-width="0.5" />
          <!-- Fill area -->
          <path :d="fillPath" fill="url(#rptGrad)" />
          <!-- Line -->
          <polyline :points="polyline" fill="none" stroke="#6366F1" stroke-width="2.5"
            stroke-linejoin="round" stroke-linecap="round" />
          <!-- Dots on data points -->
          <circle v-for="pt in chartPts" :key="pt.label"
            :cx="pt.x" :cy="pt.y" r="3.5" fill="#6366F1" stroke="white" stroke-width="1.5" />
        </svg>

        <!-- X-axis labels -->
        <div class="flex justify-between mt-2 px-0.5">
          <span
            v-for="pt in chartPts"
            :key="pt.label"
            class="text-[10px] text-(--ui-text-muted) flex-1 text-center"
          >
            {{ pt.label }}
          </span>
        </div>
      </div>
    </UCard>

    <!-- ── Bottom two-col row ─────────────────────────────────── -->
    <div class="grid lg:grid-cols-2 gap-4">

      <!-- Top products (horizontal bar) -->
      <UCard>
        <template #header>
          <div>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('rep.topProds') }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ t('rep.bestSku') }}</p>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="(p, i) in topProducts" :key="p.name">
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-bold text-(--ui-text-muted) w-4 shrink-0">{{ i + 1 }}</span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-(--ui-text-highlighted) truncate leading-tight">{{ p.name }}</p>
                  <p class="text-[10px] text-(--ui-text-muted)">{{ p.category }} · {{ p.units }} {{ t('rep.units') }}</p>
                </div>
              </div>
              <span class="text-sm font-semibold text-(--ui-text-highlighted) shrink-0 ml-3">
                {{ rmK(p.revenue) }}
              </span>
            </div>
            <div class="h-1.5 rounded-full bg-(--ui-bg-elevated) overflow-hidden">
              <div
                class="h-full rounded-full bg-indigo-500 transition-all duration-700"
                :style="{ width: `${(p.revenue / maxProductRev) * 100}%`, opacity: 1 - i * 0.1 }"

              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Category revenue + donut -->
      <UCard>
        <template #header>
          <div>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('rep.salesByCat') }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ t('rep.revSplit') }}</p>
          </div>
        </template>

        <div class="flex items-center gap-6">
          <!-- Donut -->
          <div class="shrink-0">
            <svg viewBox="0 0 160 160" class="w-[130px] h-[130px] -rotate-90">
              <circle :cx="DONUT_CX" :cy="DONUT_CY" :r="DONUT_R"
                fill="none" stroke="currentColor" class="text-(--ui-bg-elevated)" :stroke-width="STROKE" />
              <circle
                v-for="seg in donutSegments"
                :key="seg.name"
                :cx="DONUT_CX" :cy="DONUT_CY" :r="DONUT_R"
                fill="none"
                :stroke="seg.color"
                :stroke-width="STROKE"
                :stroke-dasharray="`${seg.dash} ${seg.gap}`"
                :stroke-dashoffset="-seg.offset"
                stroke-linecap="butt"
              />
            </svg>
          </div>

          <!-- Legend -->
          <div class="flex-1 space-y-2.5 min-w-0">
            <div v-for="cat in categoryBreakdown" :key="cat.name" class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: cat.color }" />
                <span class="text-sm text-(--ui-text-muted) truncate">{{ cat.name }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <div class="w-12 h-1.5 rounded-full bg-(--ui-bg-elevated) overflow-hidden">
                  <div class="h-full rounded-full" :style="{ width: `${cat.pct}%`, background: cat.color }" />
                </div>
                <span class="text-xs font-medium text-(--ui-text-highlighted) w-7 text-right">{{ cat.pct }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-(--ui-border) flex justify-between items-center">
          <span class="text-sm text-(--ui-text-muted)">{{ t('rep.totalEst') }}</span>
          <span class="text-sm font-bold text-(--ui-text-highlighted)">{{ rm(totalCatRevenue) }}</span>
        </div>
      </UCard>

    </div>

    <!-- ── Inventory health ───────────────────────────────────── -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('rep.invHealth') }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ t('rep.stockLevels') }}</p>
          </div>
          <NuxtLink to="/admin/products" class="text-xs text-(--ui-text-muted) hover:text-indigo-500 transition-colors">
            {{ t('rep.manageProds') }}
          </NuxtLink>
        </div>
      </template>

      <!-- Health meter bar -->
      <div class="mb-5">
        <div class="flex items-center justify-between text-xs text-(--ui-text-muted) mb-1.5">
          <span>{{ inventoryStats.total }} {{ t('rep.totalProds2') }}</span>
          <span>{{ inventoryStats.out }} {{ t('rep.outOfStock') }}</span>
        </div>
        <div class="h-2.5 rounded-full overflow-hidden flex">
          <div
            class="bg-indigo-500 transition-all duration-700"
            :style="{ width: `${(inventoryStats.healthy / inventoryStats.total) * 100}%` }"
          />
          <div
            class="bg-amber-400 transition-all duration-700"
            :style="{ width: `${(inventoryStats.low / inventoryStats.total) * 100}%` }"
          />
          <div
            class="bg-red-500 transition-all duration-700"
            :style="{ width: `${(inventoryStats.out / inventoryStats.total) * 100}%` }"
          />
        </div>
        <div class="flex items-center gap-6 mt-2">
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-indigo-500" />
            <span class="text-xs text-(--ui-text-muted)">{{ t('rep.healthy') }} <strong class="text-(--ui-text-highlighted)">{{ inventoryStats.healthy }}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-amber-400" />
            <span class="text-xs text-(--ui-text-muted)">{{ t('rep.lowStock') }} <strong class="text-(--ui-text-highlighted)">{{ inventoryStats.low }}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-red-500" />
            <span class="text-xs text-(--ui-text-muted)">{{ t('rep.outOfStock2') }} <strong class="text-(--ui-text-highlighted)">{{ inventoryStats.out }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Category stock summary -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="cat in categoryBreakdown"
          :key="cat.name"
          class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) px-4 py-3 flex items-center gap-3"
        >
          <div class="w-2 h-10 rounded-full shrink-0" :style="{ background: cat.color }" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ cat.name }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ cat.count }} product{{ cat.count !== 1 ? 's' : '' }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-bold text-(--ui-text-highlighted)">{{ cat.pct }}%</p>
            <p class="text-[10px] text-(--ui-text-muted)">{{ t('rep.ofRevenue') }}</p>
          </div>
        </div>
      </div>

    </UCard>

  </section>
</template>
