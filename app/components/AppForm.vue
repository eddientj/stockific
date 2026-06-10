<script setup lang="ts">
import type { FieldDef } from '~/types/form'

const props = defineProps<{
  fields: FieldDef[]
  modelValue: Record<string, any>
  columns?: 1 | 2
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

function update(name: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [name]: value })
}
</script>

<template>
  <div :class="['grid gap-4 items-start', columns === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2']">
    <div
      v-for="field in fields"
      :key="field.name"
      :class="{ 'sm:col-span-2': field.span === 2 }"
    >
      <AppField
        :field="field"
        :model-value="modelValue[field.name]"
        @update:model-value="update(field.name, $event)"
      />
    </div>
  </div>
</template>
