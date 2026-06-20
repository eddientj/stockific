<script setup lang="ts" generic="T extends Record<string, any>">
/**
 * Generic, reusable kanban board.
 *
 * Config-driven — the consumer supplies lanes, items, a way to read which lane
 * an item belongs to, and a #card slot to render each card. The board owns the
 * drag-and-drop, lane layout (flex-fit + scroll fallback) and drop indicators.
 * It emits `move(item, laneId)` when a card is dragged to a different lane;
 * persistence + optimistic state live in the consumer.
 */
export interface KanbanLaneDef {
  id:    string
  name:  string
  color?: string
}

const props = withDefaults(defineProps<{
  lanes:          KanbanLaneDef[]
  items:          T[]
  getItemLaneId:  (item: T) => string | null
  itemKey?:       (item: T) => string
  showUnassigned?: boolean
  unassignedLabel?: string
  laneMinWidth?:  number
}>(), {
  itemKey:        (i: any) => i.id,
  showUnassigned: true,
  unassignedLabel:'Unassigned',
  laneMinWidth:   160,
})

const emit = defineEmits<{ move: [item: T, laneId: string | null] }>()

const UNASSIGNED = '__unassigned__'
const group = useId()

// Cards for a given lane, derived from props (reactive → keeps headers correct)
function bucket(laneId: string): T[] {
  if (laneId === UNASSIGNED) return props.items.filter(i => !props.getItemLaneId(i))
  return props.items.filter(i => props.getItemLaneId(i) === laneId)
}

// Re-init the board only when the item SET or lane SET changes — NOT when an
// item merely changes lane (a drag we already reflected). This keeps optimistic
// moves smooth (no flicker) while still rebuilding when cards are added/removed.
const boardKey = computed(() =>
  props.items.map(props.itemKey).slice().sort().join('|') + '::' +
  props.lanes.map(l => l.id).join('|') + '::' + String(props.showUnassigned),
)

// Track where each card currently sits on the board so we only emit on a real
// lane change (compared to the board, not the prop the consumer may rewrite).
const currentLane = new Map<string, string>()
watch(boardKey, () => {
  currentLane.clear()
  for (const i of props.items) currentLane.set(props.itemKey(i), props.getItemLaneId(i) ?? UNASSIGNED)
}, { immediate: true })

function onItemsChanged(laneId: string, items: T[]) {
  for (const item of items) {
    const key  = props.itemKey(item)
    const prev = currentLane.get(key)
    if (prev === undefined) { currentLane.set(key, laneId); continue }
    if (prev !== laneId) {
      currentLane.set(key, laneId)
      emit('move', item, laneId === UNASSIGNED ? null : laneId)
    }
  }
}

const laneStyle = computed(() => ({ minWidth: `${props.laneMinWidth}px` }))
</script>

<template>
  <div :key="boardKey" class="flex gap-4 overflow-x-auto pb-2 items-start">

    <!-- Stage lanes -->
    <div
      v-for="lane in lanes"
      :key="lane.id"
      class="kanban-lane flex-1 rounded-xl border border-(--ui-border) bg-(--ui-bg) flex flex-col"
      :style="laneStyle"
    >
      <div class="px-3 py-2.5 border-b border-(--ui-border)">
        <slot name="lane-header" :lane="lane" :count="bucket(lane.id).length" :items="bucket(lane.id)">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: lane.color ?? 'var(--ui-text-muted)' }" />
            <span class="font-semibold text-sm text-(--ui-text-highlighted) flex-1 truncate">{{ lane.name }}</span>
            <span class="text-xs text-(--ui-text-muted) font-medium tabular-nums">{{ bucket(lane.id).length }}</span>
          </div>
        </slot>
      </div>

      <div class="p-2 flex-1">
        <KanbanLane
          :lane-id="lane.id"
          :group="group"
          :model-items="bucket(lane.id)"
          :item-key="itemKey"
          @items-changed="onItemsChanged"
        >
          <template #card="{ item }"><slot name="card" :item="(item as T)" /></template>
        </KanbanLane>
      </div>
    </div>

    <!-- Unassigned lane — only shown when it actually holds cards -->
    <div
      v-if="showUnassigned && bucket(UNASSIGNED).length > 0"
      class="kanban-lane flex-1 rounded-xl border border-dashed border-(--ui-border) bg-(--ui-bg) flex flex-col"
      :style="laneStyle"
    >
      <div class="px-3 py-2.5 border-b border-(--ui-border) flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-(--ui-text-muted) opacity-30 shrink-0" />
        <span class="font-semibold text-sm text-(--ui-text-muted) flex-1 truncate">{{ unassignedLabel }}</span>
        <span class="text-xs text-(--ui-text-muted) font-medium tabular-nums">{{ bucket(UNASSIGNED).length }}</span>
      </div>
      <div class="p-2 flex-1">
        <KanbanLane
          :lane-id="UNASSIGNED"
          :group="group"
          :model-items="bucket(UNASSIGNED)"
          :item-key="itemKey"
          @items-changed="onItemsChanged"
        >
          <template #card="{ item }"><slot name="card" :item="(item as T)" /></template>
        </KanbanLane>
      </div>
    </div>

  </div>
</template>

<style>
/* Drag-and-drop visual feedback (global — classes applied by the library) */
.kanban-card--dragging {
  opacity: 0.4;
}
.kanban-card--placeholder {
  background: color-mix(in srgb, var(--color-brand-500) 12%, transparent);
  border: 1px dashed var(--color-brand-500) !important;
  border-radius: 0.5rem;
}
.kanban-card--over {
  outline: 2px solid var(--color-brand-500);
  outline-offset: 1px;
}
.kanban-lane--over {
  background: color-mix(in srgb, var(--color-brand-500) 6%, transparent);
}
.kanban-card {
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  transition: box-shadow 0.15s ease;
}
.kanban-card:hover {
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
}
</style>
