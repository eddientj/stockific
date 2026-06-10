<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  backTo?: string
  backLabel?: string
}>()
</script>

<template>
  <div class="mb-6">
    <UButton
      v-if="backTo"
      :to="backTo"
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      size="sm"
      class="-ml-2 mb-3"
    >
      {{ backLabel ?? 'Back' }}
    </UButton>
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-(--ui-text-highlighted)">
          {{ title }}
        </h1>
        <p v-if="description" class="mt-1 text-sm text-(--ui-text-muted)">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
