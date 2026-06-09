<script setup lang="ts">
/**
 * Reusable table shell for simple (non-TanStack) list pages.
 * Handles the UCard wrapper, <table> scaffold, loading spinner,
 * and empty state. Page provides header columns and row content via slots.
 *
 * Slots:
 *   #head   — <th> elements inside the <thead> row
 *   #default — <tr> elements inside <tbody> (shown when rows exist)
 *   #empty  — content shown when rowCount === 0 and not loading
 */
defineProps<{
  loading?: boolean
  rowCount: number
}>()
</script>

<template>
  <UCard :ui="{ body: 'p-0' }">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-(--ui-border)">
            <slot name="head" />
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <tr v-if="loading">
            <td colspan="99" class="px-4 py-12 text-center">
              <UIcon name="i-lucide-loader" class="size-5 animate-spin mx-auto text-(--ui-text-muted)" />
            </td>
          </tr>

          <!-- Empty -->
          <tr v-else-if="rowCount === 0">
            <td colspan="99">
              <slot name="empty">
                <div class="py-16 text-center">
                  <UIcon name="i-lucide-inbox" class="size-10 text-(--ui-text-muted) mx-auto mb-3" />
                  <p class="font-medium text-(--ui-text-highlighted)">No results</p>
                </div>
              </slot>
            </td>
          </tr>

          <!-- Rows -->
          <template v-else>
            <slot />
          </template>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
