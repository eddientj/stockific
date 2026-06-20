<script setup lang="ts">
import type { LeadRow } from '~/types'

definePageMeta({ layout: 'admin' })

const { t }  = useLocale()
const toast  = useAppToast()

const { leads, pending, refresh: refreshLeads } = useLeads()
const { stages, pending: stagesPending, seedDefaults } = usePipelineStages()

// ── Board state (local, optimistic) ───────────────────────────
const boardLeads = ref<LeadRow[]>([])
watch(leads, v => { boardLeads.value = [...(v ?? [])] }, { immediate: true })

const laneDefs = computed(() =>
  (stages.value ?? []).map(s => ({ id: s.id, name: s.name, color: s.color })),
)

const getLaneId = (l: LeadRow) => l.stage?.id ?? null

function colTotal(items: LeadRow[]) {
  const sum = items.reduce((a, l) => a + (l.value ?? 0), 0)
  return sum ? `RM ${sum.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
}

// ── Move a card: optimistic local update + silent persist ──────
async function onMove(lead: LeadRow, stageId: string | null) {
  const idx = boardLeads.value.findIndex(l => l.id === lead.id)
  if (idx !== -1) {
    const s = stageId ? (stages.value ?? []).find(x => x.id === stageId) : null
    boardLeads.value[idx] = {
      ...boardLeads.value[idx],
      stage: s ? { id: s.id, name: s.name, color: s.color } : null,
    }
  }
  try {
    await $fetch(`/api/crm/leads/${lead.id}`, { method: 'PATCH', body: { stage_id: stageId } })
  } catch (e: any) {
    toast.error('Failed to move lead', e?.data?.statusMessage ?? e?.message)
    await refreshLeads() // revert to server truth
  }
}

// ── Stage editor (manage lanes) ───────────────────────────────
const manageOpen = ref(false)
// When the editor closes, refresh leads so any leads whose stage was deleted
// show up under Unassigned (stage edits themselves reflect live via shared cache).
watch(manageOpen, v => { if (!v) refreshLeads() })

// ── Seed default pipeline (empty state) ───────────────────────
const seeding = ref(false)
async function useDefaults() {
  seeding.value = true
  try {
    await seedDefaults()
    await refreshLeads()
  } catch (e: any) {
    toast.error('Failed to create pipeline', e?.data?.statusMessage ?? e?.message)
  } finally {
    seeding.value = false
  }
}

const rm = (v: number) => `RM ${v.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <AppPageHeader :title="t('lead.kanban')" :description="t('lead.dragHint')" class="mb-0" />
      <div class="flex items-center gap-2">
        <UButton variant="outline" color="neutral" icon="i-lucide-settings-2" @click="manageOpen = true">
          {{ t('stage.manage') }}
        </UButton>
        <UButton variant="outline" color="neutral" icon="i-lucide-list" to="/admin/leads">
          {{ t('lead.tableView') }}
        </UButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="stagesPending || pending" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-(--ui-text-muted)" />
    </div>

    <!-- Empty: no stages yet -->
    <div v-else-if="(stages ?? []).length === 0" class="flex flex-col items-center py-20 gap-3">
      <UIcon name="i-lucide-kanban" class="size-10 text-(--ui-text-muted)" />
      <p class="font-medium text-(--ui-text-highlighted)">{{ t('stage.noStages') }}</p>
      <p class="text-sm text-(--ui-text-muted)">Start with a standard pipeline, or build your own.</p>
      <div class="flex items-center gap-2 mt-1">
        <UButton icon="i-lucide-sparkles" :loading="seeding" @click="useDefaults">Use default pipeline</UButton>
        <UButton icon="i-lucide-plus" variant="outline" color="neutral" @click="manageOpen = true">{{ t('stage.add') }}</UButton>
      </div>
    </div>

    <!-- Board -->
    <ClientOnly v-else>
      <AppKanban
        :lanes="laneDefs"
        :items="boardLeads"
        :get-item-lane-id="getLaneId"
        :unassigned-label="t('lead.unassigned')"
        @move="onMove"
      >
        <template #lane-header="{ lane, count, items }">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: lane.color }" />
            <span class="font-semibold text-sm text-(--ui-text-highlighted) flex-1 truncate">{{ lane.name }}</span>
            <span class="text-xs text-(--ui-text-muted) font-medium tabular-nums">{{ count }}</span>
          </div>
          <p v-if="colTotal(items)" class="text-xs text-(--ui-text-muted) mt-0.5">{{ colTotal(items) }}</p>
        </template>

        <template #card="{ item }">
          <NuxtLink :to="`/admin/leads/${item.id}`" class="font-medium text-sm text-(--ui-text-highlighted) hover:underline block mb-1">
            {{ item.name }}
          </NuxtLink>
          <div v-if="item.company" class="text-xs text-(--ui-text-muted) mb-1.5">{{ item.company.name }}</div>
          <div v-if="item.value" class="text-xs font-mono font-semibold text-(--ui-text-highlighted)">{{ rm(item.value) }}</div>
        </template>
      </AppKanban>
    </ClientOnly>

    <!-- Manage stages / lane editor -->
    <UModal v-model:open="manageOpen" :title="t('stage.title')" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <StageEditor v-if="manageOpen" />
      </template>
      <template #footer>
        <UButton color="neutral" @click="manageOpen = false">Done</UButton>
      </template>
    </UModal>
  </section>
</template>
