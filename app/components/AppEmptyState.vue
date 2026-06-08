<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
}>()
</script>

<template>
  <UCard class="text-center py-16">
    <UIcon
      :name="icon ?? 'i-lucide-inbox'"
      class="size-12 mx-auto mb-3 text-(--ui-text-muted)"
    />
    <p class="font-medium mb-1 text-(--ui-text-highlighted)">{{ title }}</p>
    <p v-if="description" class="text-sm mb-4 text-(--ui-text-muted)">{{ description }}</p>
    <slot />
  </UCard>
</template>
