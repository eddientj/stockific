<script setup lang="ts">
import type { VariantPayload } from '~/types'

type InitialData = {
  name?: string
  description?: string | null
  price?: number
  image_url?: string | null
  category_id?: string | null
  is_active?: boolean
  variants?: VariantPayload[]
}

const props = defineProps<{
  initial?:        InitialData
  submitLabel?:    string
  triggerSubmit?:  number   // increment from parent to fire submit
}>()

const emit = defineEmits<{
  submit: [payload: Record<string, unknown>]
  cancel: []
}>()

const toast = useAppToast()
const { data: categories } = await useFetch('/api/categories')

const NO_CATEGORY = '__none__'

const categoryOptions = computed(() => [
  { label: '— None —', value: NO_CATEGORY },
  ...((categories.value ?? []).map((c: any) => ({ label: c.name, value: c.id }))),
])

// ── Fields ────────────────────────────────────────────────────
const state = reactive({
  name:           props.initial?.name ?? '',
  description:    props.initial?.description ?? '',
  price:          props.initial?.price ?? 0,
  image_url:      props.initial?.image_url ?? '',
  category_id:    props.initial?.category_id ?? NO_CATEGORY,
  is_active:      String(props.initial?.is_active ?? true),  // 'true' | 'false'
  // Stock — backed by a single default variant
  stock_quantity: props.initial?.variants?.[0]?.stock_quantity ?? 0,
  stock_on_hold:  props.initial?.variants?.[0]?.stock_on_hold  ?? 0,
})

// Keep the existing variant id when editing so we upsert instead of re-insert
const existingVariantId = props.initial?.variants?.[0]?.id

// ── Number helpers ────────────────────────────────────────────
function blockE(e: KeyboardEvent) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}

function clampInt(field: 'stock_quantity' | 'stock_on_hold', e: Event) {
  const input = e.target as HTMLInputElement
  const clamped = Math.max(0, Math.min(99999, Math.floor(Number(input.value) || 0)))
  input.value = String(clamped)
  state[field] = clamped
}

function clampPrice(e: Event) {
  const input = e.target as HTMLInputElement
  const clamped = Math.max(0, Math.min(1000000, Number(Number(input.value).toFixed(2)) || 0))
  input.value = String(clamped)
  state.price = clamped
}

// ── Image upload ─────────────────────────────────────────────
const uploading = ref(false)

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ url: string }>('/api/upload', { method: 'POST', body })
    state.image_url = result.url
    toast.add({ title: 'Image uploaded', color: 'success', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: 'Upload failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    uploading.value = false
  }
}

// ── Submit ────────────────────────────────────────────────────
const error = ref<string | null>(null)

function validate(): Record<string, unknown> | null {
  error.value = null
  if (!state.name.trim()) { error.value = 'Product name is required'; return null }
  if (state.price < 0)    { error.value = 'Price must be ≥ 0'; return null }
  if (state.stock_on_hold > state.stock_quantity) {
    error.value = 'On Hold cannot exceed Stock'; return null
  }
  return {
    name:        state.name.trim(),
    description: state.description || null,
    price:       Number(state.price),
    image_url:   state.image_url || null,
    category_id: state.category_id === NO_CATEGORY ? null : state.category_id,
    is_active:   state.is_active !== 'false',
    variants: [{
      id:             existingVariantId,
      name:           'Default',
      stock_quantity: Number(state.stock_quantity),
      stock_on_hold:  Number(state.stock_on_hold),
    }],
  }
}

function onSubmit() {
  const payload = validate()
  if (payload) emit('submit', payload)
}

// Triggered by parent incrementing triggerSubmit prop
watch(() => props.triggerSubmit, (v, prev) => {
  if (v !== undefined && v !== prev) onSubmit()
})
</script>

<template>
  <UForm :state="state" class="space-y-5" @submit.prevent="onSubmit">

    <UFormField label="Name" name="name" required>
      <UInput v-model="state.name" placeholder="e.g. Scarlet & Violet Booster Pack" maxlength="200" class="w-full" />
    </UFormField>

    <UFormField label="Description" name="description">
      <UTextarea v-model="state.description" placeholder="Optional product description…" :rows="3" maxlength="5000" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Price (RM)" name="price" required>
        <UInput
          :value="state.price"
          type="number" min="0" max="1000000" step="0.01" placeholder="0.00" class="w-full"
          @keydown="blockE"
          @input="clampPrice($event)"
        />
      </UFormField>
      <UFormField label="Category" name="category_id">
        <USelect v-model="state.category_id" :items="categoryOptions" class="w-full" />
      </UFormField>
    </div>

    <!-- Stock -->
    <div>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Stock" name="stock_quantity">
          <UInput
            :value="state.stock_quantity"
            type="number" min="0" max="99999" placeholder="0" class="w-full"
            @keydown="blockE"
            @input="clampInt('stock_quantity', $event)"
          />
        </UFormField>
        <UFormField label="On Hold" name="stock_on_hold">
          <UInput
            :value="state.stock_on_hold"
            type="number" min="0" max="99999" placeholder="0" class="w-full"
            @keydown="blockE"
            @input="clampInt('stock_on_hold', $event)"
          />
        </UFormField>
      </div>
      <p class="mt-1.5 text-xs text-(--ui-text-muted)">Stock = total units you own. On Hold = reserved for unpaid orders.</p>
    </div>

    <UFormField label="Status" name="is_active">
      <USelect
        v-model="state.is_active"
        :items="[
          { label: 'Listed for sale', value: 'true'  },
          { label: 'Unlisted',        value: 'false' },
        ]"
        class="w-full"
      />
    </UFormField>

    <!-- Image — at the bottom -->
    <UFormField label="Image" name="image_url">
      <div v-if="state.image_url" class="relative mb-2 inline-block">
        <img :src="state.image_url" alt="Preview" class="h-20 w-20 object-cover rounded-lg border border-(--ui-border)" />
        <button
          type="button"
          class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-(--ui-bg-inverted) text-(--ui-text-inverted) text-xs grid place-items-center"
          @click="state.image_url = ''"
        >×</button>
      </div>
      <div class="flex gap-2 items-center">
        <label class="cursor-pointer">
          <UButton as="span" variant="outline" color="neutral" icon="i-lucide-upload" size="sm" :loading="uploading">
            Upload
          </UButton>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="sr-only" @change="onFileChange" />
        </label>
        <span class="text-xs text-(--ui-text-muted)">or</span>
        <UInput v-model="state.image_url" placeholder="Paste image URL…" class="flex-1" size="sm" />
      </div>
      <p class="mt-1 text-xs text-(--ui-text-muted)">Max 5 MB · JPEG, PNG, WebP, GIF</p>
    </UFormField>

    <UAlert v-if="error" :title="error" color="error" variant="soft" icon="i-lucide-circle-alert" />

  </UForm>
</template>
