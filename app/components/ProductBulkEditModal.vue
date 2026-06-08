<script setup lang="ts">
const props = defineProps<{
  open:       boolean
  ids:        string[]
  categories: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  confirm:       [patch: Record<string, unknown>, stockVal: number | null]
}>()

const NO_CHANGE = '__nochange__'

const fields = reactive({
  category_id: NO_CHANGE,
  is_active:   NO_CHANGE,
  price:       '' as string | number,
  stock:       '' as string | number,
})

const step = ref<'edit' | 'confirm'>('edit')

watch(() => props.open, (v) => {
  if (v) {
    fields.category_id = NO_CHANGE
    fields.is_active   = NO_CHANGE
    fields.price       = ''
    fields.stock       = ''
    step.value = 'edit'
  }
})

// ── Number helpers ────────────────────────────────────────────
function blockE(e: KeyboardEvent) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}

function clampPrice(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.value === '') { fields.price = ''; return }
  const clamped = Math.max(0, Math.min(1_000_000, Number(Number(input.value).toFixed(2)) || 0))
  input.value = String(clamped)
  fields.price = clamped
}

function clampStock(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.value === '') { fields.stock = ''; return }
  const clamped = Math.max(0, Math.min(99999, Math.floor(Number(input.value) || 0)))
  input.value = String(clamped)
  fields.stock = clamped
}

// ── Change summary ────────────────────────────────────────────
const changeSummary = computed(() => {
  const lines: string[] = []
  if (fields.category_id !== NO_CHANGE) {
    const label = fields.category_id === 'null'
      ? 'Remove category'
      : props.categories.find(c => c.id === fields.category_id)?.name ?? fields.category_id
    lines.push(`Category → ${label}`)
  }
  if (fields.is_active !== NO_CHANGE)
    lines.push(`Status → ${fields.is_active === 'true' ? 'Listed' : 'Unlisted'}`)
  if (fields.price !== '' && !isNaN(Number(fields.price)))
    lines.push(`Price → RM ${Number(fields.price).toFixed(2)}`)
  if (fields.stock !== '' && !isNaN(Number(fields.stock)))
    lines.push(`Stock → ${fields.stock}`)
  return lines
})

const toast = useAppToast()

function requestConfirm() {
  if (!changeSummary.value.length) {
    toast.add({ title: 'No changes selected', description: 'Set at least one field before applying.', color: 'warning' })
    return
  }
  step.value = 'confirm'
}

function doConfirm() {
  const patch: Record<string, unknown> = {}
  if (fields.category_id !== NO_CHANGE) patch.category_id = fields.category_id === 'null' ? null : fields.category_id
  if (fields.is_active   !== NO_CHANGE) patch.is_active   = fields.is_active === 'true'
  if (fields.price !== '' && !isNaN(Number(fields.price))) patch.price = Number(fields.price)
  const stockVal = fields.stock !== '' && !isNaN(Number(fields.stock)) ? Number(fields.stock) : null
  emit('confirm', patch, stockVal)
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <!-- ── Step 1: Edit form ───────────────────────────── -->
  <UModal :open="open && step === 'edit'" @update:open="close">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-pencil" class="size-5 text-brand-500" />
        <h3 class="text-base font-semibold text-(--ui-text-highlighted)">
          Edit {{ ids.length }} products
        </h3>
      </div>
    </template>

    <template #body>
      <p class="text-sm text-(--ui-text-muted) mb-5">
        Leave a field on <strong class="text-(--ui-text)">No change</strong> to keep each product's current value.
      </p>

      <div class="space-y-4">
        <UFormField label="Category">
          <USelect
            v-model="fields.category_id"
            :items="[
              { label: '— No change —',   value: NO_CHANGE },
              { label: 'Remove category', value: 'null'    },
              ...categories.map(c => ({ label: c.name, value: c.id })),
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="fields.is_active"
            :items="[
              { label: '— No change —',  value: NO_CHANGE },
              { label: 'Listed for sale', value: 'true'  },
              { label: 'Unlisted',        value: 'false' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Price (RM)">
          <UInput
            :value="fields.price"
            type="number" min="0" max="1000000" step="0.01"
            placeholder="Leave blank for no change"
            class="w-full"
            @keydown="blockE"
            @input="clampPrice($event)"
          />
        </UFormField>

        <UFormField label="Stock quantity">
          <UInput
            :value="fields.stock"
            type="number" min="0" max="99999"
            placeholder="Leave blank for no change"
            class="w-full"
            @keydown="blockE"
            @input="clampStock($event)"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2">
        <UButton icon="i-lucide-arrow-right" color="primary" @click="requestConfirm">
          Apply to all {{ ids.length }}
        </UButton>
        <UButton variant="outline" color="neutral" @click="close">Cancel</UButton>
      </div>
    </template>
  </UModal>

  <!-- ── Step 2: Confirmation ───────────────────────── -->
  <UModal :open="open && step === 'confirm'" @update:open="close">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-triangle-alert" class="size-5 text-warning-500" />
        <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Confirm bulk update</h3>
      </div>
    </template>

    <template #body>
      <p class="text-sm text-(--ui-text-muted) mb-4">
        You are about to apply the following changes to
        <strong class="text-(--ui-text)">{{ ids.length }} products</strong>.
        This cannot be undone.
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
        <UButton icon="i-lucide-check" color="primary" @click="doConfirm">Confirm</UButton>
        <UButton variant="outline" color="neutral" @click="step = 'edit'">Back</UButton>
      </div>
    </template>
  </UModal>
</template>
