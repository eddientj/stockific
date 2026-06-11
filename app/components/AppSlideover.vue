<script setup lang="ts">
const { t } = useLocale()

const props = defineProps<{
  open:          boolean
  title:         string
  description?:  string
  submitLabel?:  string
  cancelLabel?:  string
  loading?:      boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  submit:        []
  cancel:        []
}>()

function close() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<template>
  <USlideover
    :open="open"
    :title="title"
    :description="description"
    side="right"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <slot />
    </template>

    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton icon="i-lucide-check" :loading="loading" @click="emit('submit')">
          {{ submitLabel ?? t('action.save') }}
        </UButton>
        <UButton variant="outline" color="neutral" @click="close">
          {{ cancelLabel ?? t('action.cancel') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
