<script setup lang="ts">
import type { LeadRow, PipelineStage } from '~/types'

definePageMeta({ layout: 'admin' })

const { t }  = useLocale()
const toast  = useAppToast()

const { leads, pending, refresh, updateLead } = useLeads()
const { stages, pending: stagesPending, createStage, updateStage, deleteStage } = usePipelineStages()

// ── Kanban grouping ───────────────────────────────────────────
const columns = computed(() => {
  const stageList = stages.value ?? []
  const leadList  = leads.value  ?? []

  return stageList.map(stage => ({
    stage,
    leads: leadList.filter(l => l.stage?.id === stage.id),
  }))
})

const unassigned = computed(() =>
  (leads.value ?? []).filter(l => !l.stage)
)

// ── Drag & drop ───────────────────────────────────────────────
// We use the native HTML5 drag API — no extra library needed.
const draggingId = ref<string | null>(null)

function onDragStart(leadId: string) {
  draggingId.value = leadId
}

async function onDrop(stageId: string | null) {
  if (!draggingId.value) return
  try {
    await updateLead(draggingId.value, { stage_id: stageId })
  } catch (e: any) {
    toast.error('Failed to move lead', e?.data?.statusMessage ?? e?.message)
    await refresh()
  } finally {
    draggingId.value = null
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

// ── Manage stages modal ───────────────────────────────────────
const manageOpen  = ref(false)
const stageForm   = ref({ name: '', color: '#6366f1', is_closed_won: false, is_closed_lost: false })
const savingStage = ref(false)

async function addStage() {
  if (!stageForm.value.name.trim()) return
  savingStage.value = true
  try {
    await createStage(stageForm.value)
    stageForm.value = { name: '', color: '#6366f1', is_closed_won: false, is_closed_lost: false }
  } catch (e: any) {
    toast.error('Failed to create stage', e?.data?.statusMessage ?? e?.message)
  } finally {
    savingStage.value = false
  }
}

// ── Lead value total per column ───────────────────────────────
function colTotal(leads: LeadRow[]) {
  const sum = leads.reduce((acc, l) => acc + (l.value ?? 0), 0)
  if (!sum) return null
  return `RM ${sum.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
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

    <div v-if="stagesPending || pending" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="(stages ?? []).length === 0" class="flex flex-col items-center py-20 gap-3">
      <UIcon name="i-lucide-kanban" class="size-10 text-(--ui-text-muted)" />
      <p class="font-medium text-(--ui-text-highlighted)">{{ t('stage.noStages') }}</p>
      <UButton icon="i-lucide-plus" size="sm" @click="manageOpen = true">{{ t('stage.add') }}</UButton>
    </div>

    <!-- Kanban board -->
    <div v-else class="flex gap-4 overflow-x-auto pb-4 items-start">

      <!-- Stage columns -->
      <div
        v-for="col in columns"
        :key="col.stage.id"
        class="flex-shrink-0 w-72 rounded-xl border border-(--ui-border) bg-(--ui-bg) flex flex-col"
        @dragover="onDragOver"
        @drop="onDrop(col.stage.id)"
      >
        <!-- Column header -->
        <div class="px-3 py-2.5 border-b border-(--ui-border) flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: col.stage.color }" />
          <span class="font-semibold text-sm text-(--ui-text-highlighted) flex-1 truncate">{{ col.stage.name }}</span>
          <span class="text-xs text-(--ui-text-muted) font-medium tabular-nums">{{ col.leads.length }}</span>
        </div>

        <!-- Value total -->
        <div v-if="colTotal(col.leads)" class="px-3 py-1 text-xs text-(--ui-text-muted) border-b border-(--ui-border)">
          {{ colTotal(col.leads) }}
        </div>

        <!-- Lead cards -->
        <div class="flex flex-col gap-2 p-2 min-h-[120px]">
          <div
            v-for="lead in col.leads"
            :key="lead.id"
            draggable="true"
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
            :class="draggingId === lead.id ? 'opacity-40' : ''"
            @dragstart="onDragStart(lead.id)"
          >
            <NuxtLink :to="`/admin/leads/${lead.id}`" class="font-medium text-sm text-(--ui-text-highlighted) hover:underline block mb-1">
              {{ lead.name }}
            </NuxtLink>
            <div v-if="lead.company" class="text-xs text-(--ui-text-muted) mb-1.5">{{ lead.company.name }}</div>
            <div v-if="lead.value" class="text-xs font-mono font-semibold text-(--ui-text-highlighted)">
              RM {{ lead.value.toLocaleString('en-MY', { minimumFractionDigits: 2 }) }}
            </div>
          </div>

          <div v-if="col.leads.length === 0" class="flex-1 flex items-center justify-center py-6">
            <span class="text-xs text-(--ui-text-muted) opacity-50">Drop leads here</span>
          </div>
        </div>
      </div>

      <!-- Unassigned column -->
      <div
        v-if="unassigned.length > 0"
        class="flex-shrink-0 w-72 rounded-xl border border-(--ui-border) border-dashed bg-(--ui-bg) flex flex-col"
        @dragover="onDragOver"
        @drop="onDrop(null)"
      >
        <div class="px-3 py-2.5 border-b border-(--ui-border) flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-(--ui-text-muted) opacity-30 shrink-0" />
          <span class="font-semibold text-sm text-(--ui-text-muted)">{{ t('lead.unassigned') }}</span>
          <span class="text-xs text-(--ui-text-muted) font-medium tabular-nums ml-auto">{{ unassigned.length }}</span>
        </div>
        <div class="flex flex-col gap-2 p-2">
          <div
            v-for="lead in unassigned"
            :key="lead.id"
            draggable="true"
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-3 cursor-grab"
            :class="draggingId === lead.id ? 'opacity-40' : ''"
            @dragstart="onDragStart(lead.id)"
          >
            <NuxtLink :to="`/admin/leads/${lead.id}`" class="font-medium text-sm text-(--ui-text-highlighted) hover:underline block">
              {{ lead.name }}
            </NuxtLink>
            <div v-if="lead.company" class="text-xs text-(--ui-text-muted) mt-0.5">{{ lead.company.name }}</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Manage stages modal -->
    <UModal v-model:open="manageOpen" :title="t('stage.title')" :ui="{ width: 'sm:max-w-lg' }">
      <template #body>
        <div class="space-y-4">

          <!-- Existing stages -->
          <div v-if="(stages ?? []).length" class="space-y-2">
            <div
              v-for="stage in stages"
              :key="stage.id"
              class="flex items-center gap-2 p-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated)"
            >
              <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: stage.color }" />
              <span class="flex-1 text-sm font-medium text-(--ui-text-highlighted)">{{ stage.name }}</span>
              <UBadge v-if="stage.is_closed_won"  color="success" variant="subtle" size="xs">Won</UBadge>
              <UBadge v-if="stage.is_closed_lost" color="error"   variant="subtle" size="xs">Lost</UBadge>
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs"
                @click="deleteStage(stage.id, stage.name)" />
            </div>
          </div>

          <USeparator />

          <!-- Add new stage -->
          <p class="text-sm font-semibold text-(--ui-text-highlighted)">{{ t('stage.add') }}</p>
          <div class="flex items-end gap-2">
            <UFormField :label="t('stage.name')" class="flex-1">
              <UInput v-model="stageForm.name" placeholder="e.g. Qualified" class="w-full" />
            </UFormField>
            <UFormField :label="t('stage.color')">
              <div class="flex gap-1.5">
                <button
                  v-for="c in COLORS"
                  :key="c"
                  class="w-6 h-6 rounded-full border-2 transition-all"
                  :style="{ background: c, borderColor: stageForm.color === c ? 'white' : 'transparent' }"
                  @click="stageForm.color = c"
                />
              </div>
            </UFormField>
          </div>
          <div class="flex gap-4">
            <UCheckbox v-model="stageForm.is_closed_won"  :label="t('stage.won')" />
            <UCheckbox v-model="stageForm.is_closed_lost" :label="t('stage.lost')" />
          </div>
          <UButton icon="i-lucide-plus" :loading="savingStage" @click="addStage">
            {{ t('stage.add') }}
          </UButton>
        </div>
      </template>
      <template #footer>
        <UButton variant="outline" color="neutral" @click="manageOpen = false">{{ t('action.cancel') }}</UButton>
      </template>
    </UModal>
  </section>
</template>
