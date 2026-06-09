<script setup lang="ts">
/**
 * Reusable status filter chip bar.
 * Used by Orders, Invoices, and any future list page with status filtering.
 *
 * Each chip shows a count and toggles the active filter on click.
 * Clicking an already-active chip resets to 'all'.
 */
export type StatusChip = {
  key: string
  label?: string   // falls back to key if omitted
  count: number
  color: string    // full Tailwind text class, e.g. 'text-teal-600 dark:text-teal-400'
  bg: string       // full Tailwind bg + border classes
}

const props = defineProps<{
  chips: StatusChip[]
  modelValue: string   // active status key, or 'all'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function toggle(key: string) {
  emit('update:modelValue', props.modelValue === key ? 'all' : key)
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
    <button
      v-for="chip in chips"
      :key="chip.key"
      type="button"
      class="text-left rounded-xl border px-4 py-3 transition-all hover:scale-[1.02] capitalize"
      :class="[
        chip.bg,
        chip.color,
        modelValue === chip.key ? 'ring-2 ring-offset-1 ring-current scale-[1.02]' : '',
      ]"
      @click="toggle(chip.key)"
    >
      <p class="text-2xl font-bold text-(--ui-text-highlighted)">{{ chip.count }}</p>
      <p class="text-xs mt-0.5 opacity-70">{{ chip.label ?? chip.key }}</p>
    </button>
  </div>
</template>
