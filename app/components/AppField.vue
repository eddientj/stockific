<script setup lang="ts">
import type { FieldDef, NumberField, SelectField, MultiselectField, ImageField } from '~/types/form'

const props = defineProps<{
  field: FieldDef
  modelValue: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

function update(value: any) {
  emit('update:modelValue', value)
}

function blockE(e: KeyboardEvent) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}

const uploading = ref(false)
const toast = useAppToast()

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ url: string }>('/api/upload', { method: 'POST', body })
    update(result.url)
    toast.add({ title: 'Image uploaded', color: 'success', icon: 'i-lucide-check' })
  } catch (err: any) {
    toast.add({ title: 'Upload failed', description: err?.data?.statusMessage ?? err?.message, color: 'error' })
  } finally {
    uploading.value = false
  }
}

function onNumberInput(e: Event) {
  const f = props.field as NumberField
  const input = e.target as HTMLInputElement
  if (input.value === '') { update(null); return }
  const decimals = f.decimals ?? 0
  const min = f.min ?? 0
  const max = f.max ?? Number.MAX_SAFE_INTEGER
  const v = parseFloat(Number(input.value).toFixed(decimals))
  const clamped = Math.min(max, Math.max(min, isNaN(v) ? min : v))
  input.value = String(clamped)
  update(clamped)
}
</script>

<template>
  <UFormField :label="field.label" :required="field.required" :help="field.help">
    <!-- text / email / url -->
    <UInput
      v-if="['text', 'email', 'url'].includes(field.type)"
      :type="(field.type as string)"
      :value="modelValue ?? ''"
      :placeholder="(field as any).placeholder"
      :disabled="field.disabled"
      class="w-full"
      @input="update(($event.target as HTMLInputElement).value)"
    />

    <!-- date -->
    <UInput
      v-else-if="field.type === 'date'"
      type="date"
      :value="modelValue ?? ''"
      :min="(field as any).min"
      :max="(field as any).max"
      :disabled="field.disabled"
      class="w-full"
      @input="update(($event.target as HTMLInputElement).value)"
    />

    <!-- number -->
    <UInput
      v-else-if="field.type === 'number'"
      type="number"
      :min="(field as NumberField).min ?? 0"
      :max="(field as NumberField).max"
      :step="(field as NumberField).decimals ? Math.pow(10, -(field as NumberField).decimals!) : 1"
      :value="modelValue ?? (field as NumberField).min ?? 0"
      :placeholder="(field as NumberField).placeholder ?? '0'"
      :disabled="field.disabled"
      :class="['w-full', (field as NumberField).mono ? 'font-mono' : '']"
      @keydown="blockE"
      @input="onNumberInput"
    />

    <!-- phone -->
    <AppPhoneInput
      v-else-if="field.type === 'phone'"
      :model-value="modelValue ?? ''"
      :disabled="field.disabled"
      class="w-full"
      @update:model-value="update"
    />

    <!-- textarea -->
    <UTextarea
      v-else-if="field.type === 'textarea'"
      :value="modelValue ?? ''"
      :rows="(field as any).rows ?? 3"
      :placeholder="(field as any).placeholder"
      :disabled="field.disabled"
      class="w-full"
      @input="update(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- select -->
    <USelectMenu
      v-else-if="field.type === 'select'"
      :model-value="modelValue"
      :items="(field as SelectField).options"
      value-key="value"
      option-attribute="label"
      :placeholder="(field as SelectField).placeholder ?? 'Select…'"
      :disabled="field.disabled"
      class="w-full"
      @update:model-value="update"
    />

    <!-- multiselect -->
    <USelectMenu
      v-else-if="field.type === 'multiselect'"
      :model-value="modelValue ?? []"
      :items="(field as MultiselectField).options"
      value-key="value"
      option-attribute="label"
      multiple
      :placeholder="(field as MultiselectField).placeholder ?? 'Select…'"
      :disabled="field.disabled"
      class="w-full"
      @update:model-value="update"
    />

    <!-- color -->
    <div v-else-if="field.type === 'color'" class="flex items-center gap-3">
      <input
        type="color"
        :value="modelValue ?? '#008080'"
        :disabled="field.disabled"
        class="h-9 w-14 cursor-pointer rounded border border-(--ui-border) bg-(--ui-bg) p-0.5"
        @input="update(($event.target as HTMLInputElement).value)"
      />
      <UInput
        :value="modelValue ?? '#008080'"
        placeholder="#008080"
        :disabled="field.disabled"
        class="flex-1 font-mono"
        @input="update(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- image -->
    <div v-else-if="field.type === 'image'" class="space-y-2">
      <div v-if="modelValue" class="relative inline-block">
        <img :src="modelValue" alt="Preview" class="h-20 w-20 object-cover rounded-lg border border-(--ui-border)" />
        <button
          type="button"
          class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-(--ui-bg-inverted) text-(--ui-text-inverted) text-xs grid place-items-center"
          @click="update('')"
        >×</button>
      </div>
      <div class="flex gap-2 items-center">
        <label class="cursor-pointer">
          <UButton as="span" variant="outline" color="neutral" icon="i-lucide-upload" size="sm" :loading="uploading">Upload</UButton>
          <input
            type="file"
            :accept="(field as ImageField).accept ?? 'image/jpeg,image/png,image/webp,image/gif'"
            :disabled="field.disabled"
            class="sr-only"
            @change="onFileChange"
          />
        </label>
        <span class="text-xs text-(--ui-text-muted)">or</span>
        <UInput
          :value="modelValue ?? ''"
          placeholder="Paste image URL…"
          :disabled="field.disabled"
          class="flex-1"
          size="sm"
          @input="update(($event.target as HTMLInputElement).value)"
        />
      </div>
      <p class="text-xs text-(--ui-text-muted)">Max 5 MB · JPEG, PNG, WebP, GIF</p>
    </div>

    <!-- readonly -->
    <p v-else-if="field.type === 'readonly'" class="py-1.5 text-sm text-(--ui-text-highlighted)">
      {{ modelValue ?? '—' }}
    </p>
  </UFormField>
</template>
