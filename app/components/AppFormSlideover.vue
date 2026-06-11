<script setup lang="ts">
import type { FieldDef } from '~/types/form'

const { t } = useLocale()

const props = defineProps<{
  title: string
  fields: FieldDef[]
  modelValue: Record<string, any>
  open: boolean
  loading?: boolean
  saveLabel?: string
  columns?: 1 | 2
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'update:open': [value: boolean]
  'save': []
}>()
</script>

<template>
  <USlideover :open="open" side="right" @update:open="$emit('update:open', $event)">
    <template #content>
      <div class="flex flex-col h-full">

        <div class="px-6 py-5 border-b border-(--ui-border) flex items-center justify-between shrink-0">
          <p class="font-semibold text-(--ui-text-highlighted)">{{ title }}</p>
          <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="$emit('update:open', false)" />
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <slot name="before" />
          <AppForm
            :fields="fields"
            :model-value="modelValue"
            :columns="columns"
            @update:model-value="$emit('update:modelValue', $event)"
          />
          <slot />
        </div>

        <div class="px-6 py-4 border-t border-(--ui-border) flex gap-3 shrink-0">
          <UButton :label="saveLabel ?? t('action.save')" :loading="loading" class="flex-1" @click="$emit('save')" />
          <UButton variant="outline" color="neutral" :label="t('action.cancel')" @click="$emit('update:open', false)" />
        </div>

      </div>
    </template>
  </USlideover>
</template>
