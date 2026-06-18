<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SupplierRow } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const { suppliers, pending, createSupplier, updateSupplier, deleteSupplier } = useSuppliers()

const open    = ref(false)
const editing = ref<SupplierRow | null>(null)
const saving  = ref(false)

const blank = () => ({ name: '', contact_name: '', email: '', phone: '', address: '', notes: '' })
const form  = ref<Record<string, any>>(blank())

const FIELDS = computed<FieldDef[]>(() => [
  { name: 'name',         label: 'Name',           type: 'text',     required: true, span: 2, placeholder: 'e.g. ABC Trading Sdn Bhd' },
  { name: 'contact_name', label: 'Contact person',  type: 'text',     placeholder: 'Contact name' },
  { name: 'phone',        label: t('field.phone'),  type: 'phone' },
  { name: 'email',        label: t('field.email'),  type: 'email',    placeholder: 'supplier@email.com' },
  { name: 'address',      label: t('field.address'), type: 'textarea', rows: 2, span: 2, placeholder: 'Business address' },
  { name: 'notes',        label: t('field.notes'),  type: 'textarea', rows: 2, span: 2, placeholder: 'Internal notes' },
])

function openCreate() {
  editing.value = null
  form.value = blank()
  open.value = true
}

function openEdit(s: SupplierRow) {
  editing.value = s
  form.value = { name: s.name, contact_name: s.contact_name ?? '', email: s.email ?? '', phone: s.phone ?? '', address: s.address ?? '', notes: s.notes ?? '' }
  open.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) await updateSupplier(editing.value.id, form.value)
    else               await createSupplier(form.value)
    open.value = false
  } finally {
    saving.value = false
  }
}

const columns: TableColumn<SupplierRow>[] = [
  { accessorKey: 'name',         header: 'Name'    },
  { accessorKey: 'contact_name', header: 'Contact' },
  { accessorKey: 'email',        header: 'Email'   },
  { accessorKey: 'phone',        header: 'Phone'   },
  { id: 'actions',               header: ''        },
]
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <AppPageHeader title="Suppliers" description="Manage your product suppliers." class="mb-0" />
      <UButton icon="i-lucide-plus" @click="openCreate">New supplier</UButton>
    </div>

    <UCard>
      <UTable :data="suppliers ?? []" :columns="columns" :loading="pending">
        <template #name-cell="{ row }">
          <span class="font-medium text-(--ui-text-highlighted)">{{ row.original.name }}</span>
        </template>
        <template #contact_name-cell="{ row }">
          {{ row.original.contact_name || '—' }}
        </template>
        <template #email-cell="{ row }">
          <a v-if="row.original.email" :href="`mailto:${row.original.email}`"
            class="text-(--ui-text-muted) hover:text-indigo-500 text-sm">{{ row.original.email }}</a>
          <span v-else class="text-(--ui-text-muted)">—</span>
        </template>
        <template #phone-cell="{ row }">{{ row.original.phone || '—' }}</template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="xs" @click="openEdit(row.original)" />
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs"
              @click="deleteSupplier(row.original.id, row.original.name)" />
          </div>
        </template>
        <template #empty>
          <div class="py-10 text-center text-sm text-(--ui-text-muted)">No suppliers yet. Add your first supplier.</div>
        </template>
      </UTable>
    </UCard>

    <AppFormSlideover
      v-model="form"
      v-model:open="open"
      :title="editing ? editing.name : 'New Supplier'"
      :fields="FIELDS"
      :loading="saving"
      :save-label="editing ? t('action.save') : 'Create supplier'"
      @save="save"
    />
  </section>
</template>
