<script setup lang="ts">
defineProps<{
  active: boolean
  activeLabel?: string
  inactiveLabel?: string
}>()
</script>

<template>
  <UBadge
    :color="active ? 'success' : 'neutral'"
    variant="soft"
  >
    {{ active ? (activeLabel ?? 'Active') : (inactiveLabel ?? 'Inactive') }}
  </UBadge>
</template>
