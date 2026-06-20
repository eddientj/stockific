<script setup lang="ts" generic="T extends Record<string, any>">
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'

/**
 * A single droppable lane in AppKanban. Owns its own drag-and-drop instance.
 * All lanes on a board share the same `group` so cards transfer between them.
 * Emits `items-changed` whenever its card list mutates (drag in/out/reorder).
 */
const props = defineProps<{
  laneId:     string
  group:      string
  modelItems: T[]
  itemKey:    (item: T) => string
}>()

const emit = defineEmits<{ 'items-changed': [laneId: string, items: T[]] }>()

const [parent, items] = useDragAndDrop<T>([...props.modelItems], {
  group:               props.group,
  sortable:            true,
  draggingClass:       'kanban-card--dragging',
  dropZoneClass:       'kanban-card--over',
  dropZoneParentClass: 'kanban-lane--over',
  dragPlaceholderClass:'kanban-card--placeholder',
})

watch(items, v => emit('items-changed', props.laneId, [...v]))
</script>

<template>
  <div class="kanban-lane-body relative">
    <div ref="parent" class="flex flex-col gap-2 min-h-[80px]">
      <div
        v-for="item in items"
        :key="itemKey(item)"
        class="kanban-card rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-3 cursor-grab active:cursor-grabbing"
      >
        <slot name="card" :item="item" />
      </div>
    </div>
    <p
      v-if="!items.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-(--ui-text-muted) opacity-50"
    >
      Drop here
    </p>
  </div>
</template>
