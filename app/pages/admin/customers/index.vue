<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerRow, CustomerPayload, ExportColumn } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const route  = useRoute()
const router = useRouter()
const toast  = useAppToast()
const { customers, pending, refresh, createCustomer, updateCustomer, deleteCustomer, initials } = useCustomers()

// ── Customer form schema ───────────────────────────────────────
const CUSTOMER_FIELDS = computed<FieldDef[]>(() => [
  { name: 'name',     label: t('field.name'),     type: 'text',     required: true, placeholder: 'Ahmad Razif', span: 2 },
  { name: 'email',    label: t('field.email'),    type: 'email',    placeholder: 'email@example.com' },
  { name: 'phone',    label: t('field.phone'),    type: 'phone' },
  { name: 'address',  label: t('field.address'),  type: 'text',     placeholder: 'No 12, Jalan Puteri 2', span: 2 },
  { name: 'city',     label: t('field.city'),     type: 'text',     placeholder: 'Puchong' },
  { name: 'postcode', label: t('field.postcode'), type: 'text',     placeholder: '47100' },
  { name: 'notes',    label: t('field.notes'),    type: 'textarea', placeholder: t('cus.notesPlaceholder'), rows: 3, span: 2 },
])

// ── Slideover state ───────────────────────────────────────────
const slideOpen = ref(false)
const editing   = ref<CustomerRow | null>(null)
const saving    = ref(false)

const form = ref<Record<string, any>>({
  name: '', email: '', phone: '', address: '', city: '', postcode: '', notes: '',
})

function openNew()                { editing.value = null; slideOpen.value = true }
function openEdit(c: CustomerRow) { editing.value = c;    slideOpen.value = true }

watch(slideOpen, (v) => {
  if (!v) return
  const c = editing.value
  form.value = {
    name:     c?.name     ?? '',
    email:    c?.email    ?? '',
    phone:    c?.phone    ?? '',
    address:  c?.address  ?? '',
    city:     c?.city     ?? '',
    postcode: c?.postcode ?? '',
    notes:    c?.notes    ?? '',
  }
})

// Auto-open create form when navigated from invoice "add customer" link
onMounted(() => {
  if (route.query.create) {
    openNew()
    router.replace('/admin/customers')
  }
})

async function save() {
  if (!form.value.name.trim()) {
    toast.add({ title: 'Name is required', color: 'error' })
    return
  }
  saving.value = true
  try {
    const payload: CustomerPayload = {
      name:     form.value.name,
      email:    form.value.email    || null,
      phone:    form.value.phone    || null,
      address:  form.value.address  || null,
      city:     form.value.city     || null,
      postcode: form.value.postcode || null,
      notes:    form.value.notes    || null,
    }
    if (editing.value) {
      await updateCustomer(editing.value.id, payload)
    } else {
      await createCustomer(payload)
    }
    slideOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Failed to save', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Bulk edit ─────────────────────────────────────────────────
const bulkEditOpen   = ref(false)
const bulkEditIds    = ref<string[]>([])
const bulkEditStep   = ref<'edit' | 'confirm'>('edit')
const bulkEditFields = reactive({ city: '', postcode: '', notes: '' })

function openBulkEdit(ids: string[]) {
  bulkEditIds.value = ids
  bulkEditOpen.value = true
}

watch(bulkEditOpen, (v) => {
  if (v) { bulkEditFields.city = ''; bulkEditFields.postcode = ''; bulkEditFields.notes = ''; bulkEditStep.value = 'edit' }
})

const bulkChangeSummary = computed(() => {
  const lines: string[] = []
  if (bulkEditFields.city.trim())     lines.push(`City → ${bulkEditFields.city}`)
  if (bulkEditFields.postcode.trim()) lines.push(`Postcode → ${bulkEditFields.postcode}`)
  if (bulkEditFields.notes.trim())    lines.push(`Notes → ${bulkEditFields.notes}`)
  return lines
})

function bulkRequestConfirm() {
  if (!bulkChangeSummary.value.length) {
    toast.add({ title: 'No changes', description: 'Fill in at least one field to apply.', color: 'warning' })
    return
  }
  bulkEditStep.value = 'confirm'
}

async function bulkDoConfirm() {
  const patch: Record<string, unknown> = {}
  if (bulkEditFields.city.trim())     patch.city     = bulkEditFields.city.trim()
  if (bulkEditFields.postcode.trim()) patch.postcode = bulkEditFields.postcode.trim()
  if (bulkEditFields.notes.trim())    patch.notes    = bulkEditFields.notes.trim()
  try {
    await Promise.all(bulkEditIds.value.map(id => $fetch(`/api/customers/${id}`, { method: 'PATCH', body: patch })))
    toast.add({ title: `${bulkEditIds.value.length} customers updated`, color: 'success', icon: 'i-lucide-check' })
    bulkEditOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Bulk edit failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  }
}

// ── Table columns ─────────────────────────────────────────────
const columns = computed<TableColumn<CustomerRow>[]>(() => [
  { accessorKey: 'name',  header: t('cus.colName'),  enableSorting: true  },
  { accessorKey: 'email', header: t('cus.colEmail'), enableSorting: false },
  { accessorKey: 'phone', header: t('cus.colPhone'), enableSorting: false },
  { accessorKey: 'city',  header: t('cus.colCity'),  enableSorting: true  },
  { id: 'actions',        header: ''                                      },
])

const exportColumns: ExportColumn[] = [
  { key: 'name',     label: 'Name'     },
  { key: 'email',    label: 'Email'    },
  { key: 'phone',    label: 'Phone'    },
  { key: 'address',  label: 'Address'  },
  { key: 'city',     label: 'City'     },
  { key: 'postcode', label: 'Postcode' },
  { key: 'notes',    label: 'Notes'    },
]

const exportData = computed(() =>
  (customers.value ?? []).map(c => ({
    name:     c.name,
    email:    c.email    ?? '',
    phone:    c.phone    ?? '',
    address:  c.address  ?? '',
    city:     c.city     ?? '',
    postcode: c.postcode ?? '',
    notes:    c.notes    ?? '',
  }))
)

function handleImport(rows: Record<string, unknown>[]) {
  toast.add({ title: `${rows.length} rows ready`, description: 'Bulk import not yet wired up.', color: 'info' })
}

// ── Filters ───────────────────────────────────────────────────
const filterSlideoverOpen = ref(false)

const filters = reactive({
  city:     '',
  hasEmail: false,
  hasPhone: false,
})

const activeFilterCount = computed(() =>
  (filters.city     ? 1 : 0) +
  (filters.hasEmail ? 1 : 0) +
  (filters.hasPhone ? 1 : 0)
)

const cityOptions = computed(() => {
  const cities = [...new Set((customers.value ?? []).map(c => c.city).filter(Boolean) as string[])]
  return cities.sort().map(c => ({ label: c, value: c }))
})

const filteredCustomers = computed(() => {
  let rows = customers.value ?? []
  if (filters.city)     rows = rows.filter(c => c.city === filters.city)
  if (filters.hasEmail) rows = rows.filter(c => !!c.email)
  if (filters.hasPhone) rows = rows.filter(c => !!c.phone)
  return rows
})

function resetFilters() {
  filters.city     = ''
  filters.hasEmail = false
  filters.hasPhone = false
}
</script>

<template>
  <section>
    <AppPageHeader :title="t('cus.title')" :description="t('cus.subtitle')" />

    <AppDataTable
      :columns="columns"
      :data="filteredCustomers"
      :loading="pending"
      :create-label="t('cus.new')"
      search-field="name"
      filterable
      :active-filters="activeFilterCount"
      export-filename="customers"
      :export-columns="exportColumns"
      :export-data="exportData"
      @create="openNew"
      @bulk-edit="openBulkEdit"
      @import="handleImport"
      @filter="filterSlideoverOpen = true"
    >
      <template #empty>
        <div class="flex flex-col items-center py-16 gap-3">
          <UIcon name="i-lucide-users" class="size-10 text-(--ui-text-muted)" />
          <p class="font-medium text-(--ui-text-highlighted)">{{ t('cus.noCustomers') }}</p>
          <p class="text-sm text-(--ui-text-muted)">{{ t('cus.noCustomersHint') }}</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-1" @click="openNew">{{ t('cus.new') }}</UButton>
        </div>
      </template>

      <template #name-cell="{ row }">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
            <span class="text-[11px] font-bold text-(--ui-text-muted)">{{ initials(row.original.name) }}</span>
          </div>
          <span class="font-medium text-(--ui-text-highlighted)">{{ row.original.name }}</span>
        </div>
      </template>

      <template #email-cell="{ row }">
        <span v-if="row.original.email" class="text-(--ui-text-muted)">{{ row.original.email }}</span>
        <span v-else class="text-(--ui-text-muted) opacity-40">—</span>
      </template>

      <template #phone-cell="{ row }">
        <span class="text-(--ui-text-muted)">{{ row.original.phone ?? '—' }}</span>
      </template>

      <template #city-cell="{ row }">
        <span class="text-(--ui-text-muted)">{{ row.original.city ?? '—' }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton icon="i-lucide-pencil"  variant="ghost" color="neutral" size="sm" @click="openEdit(row.original)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error"   size="sm" @click="deleteCustomer(row.original.id, row.original.name)" />
        </div>
      </template>
    </AppDataTable>

    <!-- Customer form slideover -->
    <AppFormSlideover
      :title="editing ? editing.name : t('cus.new')"
      :fields="CUSTOMER_FIELDS"
      v-model="form"
      v-model:open="slideOpen"
      :loading="saving"
      :save-label="editing ? t('action.save') : t('cus.create')"
      @save="save"
    />

    <!-- Bulk edit — step 1: edit -->
    <UModal :open="bulkEditOpen && bulkEditStep === 'edit'" :title="t('cus.bulkEdit')" @update:open="bulkEditOpen = $event">
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-5">
          {{ t('cus.bulkSub') }}
        </p>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('field.city')">
              <UInput v-model="bulkEditFields.city" placeholder="e.g. Puchong" class="w-full" />
            </UFormField>
            <UFormField :label="t('field.postcode')">
              <UInput v-model="bulkEditFields.postcode" placeholder="e.g. 47100" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="t('field.notes')">
            <UTextarea v-model="bulkEditFields.notes" :placeholder="t('cus.notesPlaceholder')" :rows="3" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2">
          <UButton icon="i-lucide-arrow-right" @click="bulkRequestConfirm">{{ t('cus.applyTo') }} {{ bulkEditIds.length }}</UButton>
          <UButton variant="outline" color="neutral" @click="bulkEditOpen = false">{{ t('action.cancel') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Bulk edit — step 2: confirm -->
    <UModal :open="bulkEditOpen && bulkEditStep === 'confirm'" :title="t('prod.confirmBulk')" @update:open="bulkEditOpen = $event">
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-4">
          {{ t('cus.applyTo') }} <strong class="text-(--ui-text-highlighted)">{{ bulkEditIds.length }} customers</strong>:
        </p>
        <ul class="space-y-1.5">
          <li v-for="line in bulkChangeSummary" :key="line" class="flex items-center gap-2 text-sm">
            <UIcon name="i-lucide-circle-arrow-right" class="size-4 text-brand-500 shrink-0" />
            <span class="text-(--ui-text-highlighted) font-medium">{{ line }}</span>
          </li>
        </ul>
      </template>
      <template #footer>
        <div class="flex gap-2">
          <UButton icon="i-lucide-check" @click="bulkDoConfirm">{{ t('action.confirm') }}</UButton>
          <UButton variant="outline" color="neutral" @click="bulkEditStep = 'edit'">{{ t('action.back') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Filter slideover -->
    <AppSlideover
      v-model:open="filterSlideoverOpen"
      :title="t('cus.filterTitle')"
      :description="t('cus.filterSub')"
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterSlideoverOpen = false"
      @cancel="resetFilters"
    >
      <div class="space-y-5">
        <UFormField :label="t('field.city')">
          <USelectMenu
            v-model="filters.city"
            :items="cityOptions"
            value-key="value"
            :placeholder="t('cus.allCities')"
            searchable
            :searchable-placeholder="t('cus.searchCities')"
            class="w-full"
          />
        </UFormField>

        <div class="space-y-3">
          <p class="text-sm font-medium text-(--ui-text-highlighted)">{{ t('cus.contactInfo') }}</p>
          <UCheckbox v-model="filters.hasEmail" :label="t('cus.hasEmail')" />
          <UCheckbox v-model="filters.hasPhone" :label="t('cus.hasPhone')" />
        </div>
      </div>
    </AppSlideover>

  </section>
</template>
