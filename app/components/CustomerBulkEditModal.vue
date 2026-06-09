<script setup lang="ts">
const props = defineProps<{
  open: boolean
  ids:  string[]
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm:       [patch: Record<string, unknown>]
}>()

const fields = reactive({ city: '', postcode: '', notes: '' })
const step   = ref<'edit' | 'confirm'>('edit')

watch(() => props.open, (v) => {
  if (v) { fields.city = ''; fields.postcode = ''; fields.notes = ''; step.value = 'edit' }
})

const changeSummary = computed(() => {
  const lines: string[] = []
  if (fields.city.trim())     lines.push(`City → ${fields.city}`)
  if (fields.postcode.trim()) lines.push(`Postcode → ${fields.postcode}`)
  if (fields.notes.trim())    lines.push(`Notes → ${fields.notes}`)
  return lines
})

const toast = useAppToast()

function requestConfirm() {
  if (!changeSummary.value.length) {
    toast.add({ title: 'No changes', description: 'Fill in at least one field to apply.', color: 'warning' })
    return
  }
  step.value = 'confirm'
}

function doConfirm() {
  const patch: Record<string, unknown> = {}
  if (fields.city.trim())     patch.city     = fields.city.trim()
  if (fields.postcode.trim()) patch.postcode = fields.postcode.trim()
  if (fields.notes.trim())    patch.notes    = fields.notes.trim()
  emit('confirm', patch)
}
</script>

<template>
  <!-- Step 1: Edit -->
  <UModal :open="open && step === 'edit'" title="Edit customers" @update:open="emit('update:open', $event)">
    <template #body>
      <p class="text-sm text-(--ui-text-muted) mb-5">
        Leave a field blank to keep each customer's current value. Changes apply to
        <strong class="text-(--ui-text-highlighted)">{{ ids.length }} customer{{ ids.length !== 1 ? 's' : '' }}</strong>.
      </p>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="City">
            <UInput v-model="fields.city" placeholder="e.g. Puchong" class="w-full" />
          </UFormField>
          <UFormField label="Postcode">
            <UInput v-model="fields.postcode" placeholder="e.g. 47100" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Notes">
          <UTextarea v-model="fields.notes" placeholder="Overwrite notes for all selected customers…" :rows="3" class="w-full" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton icon="i-lucide-arrow-right" @click="requestConfirm">Apply to {{ ids.length }}</UButton>
        <UButton variant="outline" color="neutral" @click="emit('update:open', false)">Cancel</UButton>
      </div>
    </template>
  </UModal>

  <!-- Step 2: Confirm -->
  <UModal :open="open && step === 'confirm'" title="Confirm bulk update" @update:open="emit('update:open', $event)">
    <template #body>
      <p class="text-sm text-(--ui-text-muted) mb-4">
        Applying to <strong class="text-(--ui-text-highlighted)">{{ ids.length }} customers</strong>:
      </p>
      <ul class="space-y-1.5">
        <li v-for="line in changeSummary" :key="line" class="flex items-center gap-2 text-sm">
          <UIcon name="i-lucide-circle-arrow-right" class="size-4 text-brand-500 shrink-0" />
          <span class="text-(--ui-text-highlighted) font-medium">{{ line }}</span>
        </li>
      </ul>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton icon="i-lucide-check" @click="doConfirm">Confirm</UButton>
        <UButton variant="outline" color="neutral" @click="step = 'edit'">Back</UButton>
      </div>
    </template>
  </UModal>
</template>
