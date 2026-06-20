<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SupplierRow, ExportColumn } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t }   = useLocale()
const toast   = useAppToast()
const { suppliers, pending, refresh, createSupplier, updateSupplier } = useSuppliers()

async function bulkDelete(ids: string[]) {
  try {
    await Promise.all(ids.map(id => $fetch(`/api/suppliers/${id}`, { method: 'DELETE' })))
    toast.success(`${ids.length} suppliers deleted`)
    await refresh()
  } catch (e: any) {
    toast.error('Bulk delete failed', e?.data?.statusMessage ?? e?.message)
  }
}

const exportColumns: ExportColumn[] = [
  { key: 'name',         label: 'Name'    },
  { key: 'contact_name', label: 'Contact' },
  { key: 'email',        label: 'Email'   },
  { key: 'phone',        label: 'Phone'   },
  { key: 'address',      label: 'Address' },
  { key: 'notes',        label: 'Notes'   },
]
// ── Filter (contactable) ──────────────────────────────────────
const filterOpen = ref(false)
const filters = reactive({ hasEmail: false, hasPhone: false })
const activeFilterCount = computed(() => (filters.hasEmail ? 1 : 0) + (filters.hasPhone ? 1 : 0))
const filteredSuppliers = computed(() => {
  let rows = suppliers.value ?? []
  if (filters.hasEmail) rows = rows.filter(s => !!s.email)
  if (filters.hasPhone) rows = rows.filter(s => !!s.phone)
  return rows
})
function resetFilters() { filters.hasEmail = false; filters.hasPhone = false }

const exportData = computed(() =>
  filteredSuppliers.value.map(s => ({
    id:           s.id,
    name:         s.name,
    contact_name: s.contact_name ?? '',
    email:        s.email ?? '',
    phone:        s.phone ?? '',
    address:      s.address ?? '',
    notes:        s.notes ?? '',
  })),
)

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
    <AppPageHeader title="Suppliers" description="Manage your product suppliers." />

    <AppDataTable
      :columns="columns"
      :data="filteredSuppliers"
      :loading="pending"
      create-label="New supplier"
      search-field="name"
      filterable
      :active-filters="activeFilterCount"
      export-filename="suppliers"
      :export-columns="exportColumns"
      :export-data="exportData"
      empty-icon="i-lucide-truck"
      empty-title="No suppliers yet"
      empty-hint="Add your first supplier to get started."
      @create="openCreate"
      @filter="filterOpen = true"
      @bulk-delete="bulkDelete"
    >
      <template #name-cell="{ row }">
        <span class="font-medium text-(--ui-text-highlighted)">{{ row.original.name }}</span>
      </template>
      <template #contact_name-cell="{ row }">
        {{ row.original.contact_name || '—' }}
      </template>
      <template #email-cell="{ row }">
        <a v-if="row.original.email" :href="`mailto:${row.original.email}`"
          class="text-(--ui-text-muted) hover:text-brand-500 text-sm">{{ row.original.email }}</a>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>
      <template #phone-cell="{ row }">{{ row.original.phone || '—' }}</template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UTooltip :text="t('action.edit')">
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" @click="openEdit(row.original)" />
          </UTooltip>
          <UTooltip :text="t('action.delete')">
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm"
              @click="bulkDelete([row.original.id])" />
          </UTooltip>
        </div>
      </template>
    </AppDataTable>

    <AppFormSlideover
      v-model="form"
      v-model:open="open"
      :title="editing ? editing.name : 'New Supplier'"
      :fields="FIELDS"
      :loading="saving"
      :save-label="editing ? t('action.save') : 'Create supplier'"
      @save="save"
    />

    <!-- Filter slideover -->
    <AppSlideover
      v-model:open="filterOpen"
      title="Filter suppliers"
      description="Show only suppliers with contact details."
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterOpen = false"
      @cancel="resetFilters"
    >
      <div class="space-y-3">
        <UCheckbox v-model="filters.hasEmail" label="Has email" />
        <UCheckbox v-model="filters.hasPhone" label="Has phone" />
      </div>
    </AppSlideover>
  </section>
</template>
