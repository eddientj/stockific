<script setup lang="ts">
import type { PipelineStage } from '~/types'

/**
 * Pipeline stage (lane) editor. Self-contained — shares the pipeline-stages
 * useFetch cache with the board, so edits reflect on the board live.
 * - Drag a row (by its handle) to reorder lanes.
 * - Name / colour / won-lost auto-save on blur/change (no per-row save button).
 * - Hard cap on stage count to keep the pipeline (and this form) sane.
 */
const { t } = useLocale()

const {
  stages, createStage, deleteStage, updateStageQuiet, reorderStages,
} = usePipelineStages()

const MAX_STAGES = 12

// Editor working copy — seeded from cache (stages likely already loaded by board)
const rows = ref<PipelineStage[]>([])
onMounted(() => { rows.value = (stages.value ?? []).map(s => ({ ...s })) })

const atLimit = computed(() => rows.value.length >= MAX_STAGES)

// ── Auto-save ─────────────────────────────────────────────────
function saveRow(s: PipelineStage) {
  if (!s.name.trim()) return
  updateStageQuiet(s.id, {
    name: s.name.trim(), color: s.color,
    is_closed_won: s.is_closed_won, is_closed_lost: s.is_closed_lost,
  })
}
function onNameBlur(s: PipelineStage) {
  if (!s.name.trim()) {
    s.name = (stages.value ?? []).find(x => x.id === s.id)?.name ?? s.name
    return
  }
  saveRow(s)
}

// ── Drag-to-reorder (native HTML5 drag, handle-controlled) ───
// The handle's pointerdown makes the row draggable; dragend resets it.
// This avoids the @formkit/drag-and-drop handle limitation on desktop mouse.
const rowEls   = ref<Record<string, HTMLElement>>({})
const dragSrc  = ref<string | null>(null)
const dragOver = ref<string | null>(null)

function setRowRef(el: Element | null, id: string) {
  if (el) rowEls.value[id] = el as HTMLElement
  else delete rowEls.value[id]
}

function onHandlePointerdown(id: string) {
  const el = rowEls.value[id]
  if (el) el.draggable = true
}

function onDragStart(e: DragEvent, id: string) {
  dragSrc.value = id
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e: DragEvent, id: string) {
  if (!dragSrc.value || dragSrc.value === id) return
  e.preventDefault()
  dragOver.value = id
}

function onDragLeave(id: string) {
  if (dragOver.value === id) dragOver.value = null
}

function onDrop(e: DragEvent, targetId: string) {
  e.preventDefault()
  if (!dragSrc.value || dragSrc.value === targetId) return
  const fromIdx = rows.value.findIndex(r => r.id === dragSrc.value)
  const toIdx   = rows.value.findIndex(r => r.id === targetId)
  if (fromIdx === -1 || toIdx === -1) return
  const updated = [...rows.value]
  const [moved] = updated.splice(fromIdx, 1)
  updated.splice(toIdx, 0, moved)
  rows.value = updated
  reorderStages(updated.map(r => r.id))
  dragSrc.value  = null
  dragOver.value = null
}

function onDragEnd(id: string) {
  const el = rowEls.value[id]
  if (el) el.draggable = false
  dragSrc.value  = null
  dragOver.value = null
}

// ── Delete (with popup confirmation) ─────────────────────────
const pendingDelete = ref<PipelineStage | null>(null)

function requestDelete(s: PipelineStage) {
  pendingDelete.value = s
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  pendingDelete.value = null
  await deleteStage(id)
  rows.value = rows.value.filter(r => r.id !== id)
}

function cancelDelete() {
  pendingDelete.value = null
}

// ── Add ───────────────────────────────────────────────────────
const draft   = ref({ name: '', color: BRAND_HEX, is_closed_won: false, is_closed_lost: false })
const adding  = ref(false)
async function add() {
  if (!draft.value.name.trim() || atLimit.value) return
  adding.value = true
  try {
    await createStage({ ...draft.value })
    rows.value = (stages.value ?? []).map(s => ({ ...s }))
    draft.value = { name: '', color: BRAND_HEX, is_closed_won: false, is_closed_lost: false }
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div class="space-y-4">

    <!-- Existing lanes — drag to reorder, auto-save on edit -->
    <div class="space-y-2">
      <div
        v-for="s in rows"
        :key="s.id"
        :ref="el => setRowRef(el as Element | null, s.id)"
        class="flex items-center gap-2 p-2 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) transition-opacity"
        :class="{
          'opacity-40': dragSrc === s.id,
          'border-[var(--color-brand-500)]': dragOver === s.id,
        }"
        @dragover="onDragOver($event, s.id)"
        @dragleave="onDragLeave(s.id)"
        @drop="onDrop($event, s.id)"
        @dragend="onDragEnd(s.id)"
        @dragstart="onDragStart($event, s.id)"
      >
        <button
          class="stage-handle cursor-grab active:cursor-grabbing text-(--ui-text-muted) hover:text-(--ui-text-highlighted) shrink-0"
          @pointerdown="onHandlePointerdown(s.id)"
        >
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
        </button>

        <input
          type="color"
          v-model="s.color"
          class="h-7 w-7 shrink-0 cursor-pointer rounded border border-(--ui-border) bg-transparent p-0.5"
          @change="saveRow(s)"
        />

        <UInput v-model="s.name" size="sm" class="flex-1" @blur="onNameBlur(s)" @keydown.enter="onNameBlur(s)" />

        <UCheckbox v-model="s.is_closed_won"  :label="t('stage.won')"  @update:model-value="saveRow(s)" />
        <UCheckbox v-model="s.is_closed_lost" :label="t('stage.lost')" @update:model-value="saveRow(s)" />

        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="requestDelete(s)" />
      </div>
    </div>

    <USeparator />

    <!-- Add lane -->
    <div v-if="!atLimit">
      <p class="text-sm font-semibold text-(--ui-text-highlighted) mb-2">{{ t('stage.add') }}</p>
      <div class="flex items-end gap-2">
        <input
          type="color"
          v-model="draft.color"
          class="h-9 w-9 shrink-0 cursor-pointer rounded border border-(--ui-border) bg-transparent p-0.5"
        />
        <UFormField :label="t('stage.name')" class="flex-1">
          <UInput v-model="draft.name" placeholder="e.g. Negotiation" class="w-full" @keydown.enter="add" />
        </UFormField>
        <UButton icon="i-lucide-plus" :loading="adding" :disabled="!draft.name.trim()" @click="add">
          {{ t('stage.add') }}
        </UButton>
      </div>
      <div class="flex gap-4 mt-2">
        <UCheckbox v-model="draft.is_closed_won"  :label="t('stage.won')" />
        <UCheckbox v-model="draft.is_closed_lost" :label="t('stage.lost')" />
      </div>
    </div>
    <p v-else class="text-xs text-(--ui-text-muted)">
      Maximum of {{ MAX_STAGES }} stages reached. Delete one to add another.
    </p>

    <p class="text-[11px] text-(--ui-text-muted) border-t border-(--ui-border) pt-3">
      <strong class="text-(--ui-text-highlighted)">Won / Lost</strong> mark the two outcomes a deal can end in —
      "Won" = the lead converted (a sale), "Lost" = the deal fell through. Flagging them lets reports measure
      your win rate and keeps closed deals separate from active ones.
    </p>

  </div>

  <!-- Delete confirmation modal -->
  <UModal
    :open="!!pendingDelete"
    :title="t('stage.deleteTitle')"
    :ui="{ footer: 'justify-end' }"
    @update:open="v => { if (!v) cancelDelete() }"
  >
    <template #body>
      <p class="text-sm text-(--ui-text)">
        {{ t('stage.deleteConfirm', { name: pendingDelete?.name }) }}
      </p>
      <p class="text-sm text-(--ui-text-muted) mt-1">
        {{ t('stage.deleteWarn') }}
      </p>
    </template>
    <template #footer>
      <UButton variant="outline" color="neutral" @click="cancelDelete">
        {{ t('action.cancel') }}
      </UButton>
      <UButton color="error" @click="confirmDelete">
        {{ t('action.delete') }}
      </UButton>
    </template>
  </UModal>
</template>
