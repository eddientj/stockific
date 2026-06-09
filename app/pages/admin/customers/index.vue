<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerRow, CustomerPayload, ExportColumn } from '~/types'

definePageMeta({ layout: 'admin' })

const route  = useRoute()
const router = useRouter()
const toast  = useAppToast()
const { customers, pending, refresh, createCustomer, updateCustomer, deleteCustomer, initials } = useCustomers()

// ── Bulk edit ─────────────────────────────────────────────────
const bulkEditOpen = ref(false)
const bulkEditIds  = ref<string[]>([])

function openBulkEdit(ids: string[]) {
  bulkEditIds.value = ids
  bulkEditOpen.value = true
}

async function onBulkConfirm(patch: Record<string, unknown>) {
  try {
    await Promise.all(bulkEditIds.value.map(id => $fetch(`/api/customers/${id}`, { method: 'PATCH', body: patch })))
    toast.add({ title: `${bulkEditIds.value.length} customers updated`, color: 'success', icon: 'i-lucide-check' })
    bulkEditOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Bulk edit failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  }
}

// ── Table columns (stays in page — it's presentation config) ──
const columns: TableColumn<CustomerRow>[] = [
  { accessorKey: 'name',  header: 'Name',  enableSorting: true  },
  { accessorKey: 'email', header: 'Email', enableSorting: false },
  { accessorKey: 'phone', header: 'Phone', enableSorting: false },
  { accessorKey: 'city',  header: 'City',  enableSorting: true  },
  { id: 'actions',        header: ''                            },
]

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

// ── Slideover state ───────────────────────────────────────────
const slideOpen     = ref(false)
const editing       = ref<CustomerRow | null>(null)
const saving        = ref(false)
const submitTrigger = ref(0)

function openNew()                { editing.value = null; slideOpen.value = true }
function openEdit(c: CustomerRow) { editing.value = c;    slideOpen.value = true }

// Auto-open create form when navigated from invoice "add customer" link
onMounted(() => {
  if (route.query.create) {
    openNew()
    router.replace('/admin/customers')
  }
})

// ── Form (strings only — convert to null in submit) ───────────
const form = reactive({ name: '', email: '', phone: '', address: '', city: '', postcode: '', notes: '' })

watch(slideOpen, (open) => {
  if (!open) return
  const c = editing.value
  form.name     = c?.name     ?? ''
  form.email    = c?.email    ?? ''
  form.phone    = c?.phone    ?? ''
  form.address  = c?.address  ?? ''
  form.city     = c?.city     ?? ''
  form.postcode = c?.postcode ?? ''
  form.notes    = c?.notes    ?? ''
})

function toPayload(): CustomerPayload {
  return {
    name:     form.name,
    email:    form.email    || null,
    phone:    form.phone    || null,
    address:  form.address  || null,
    city:     form.city     || null,
    postcode: form.postcode || null,
    notes:    form.notes    || null,
  }
}

watch(submitTrigger, async (v) => {
  if (v === 0) return
  if (!form.name.trim()) { toast.add({ title: 'Name is required', color: 'error' }); return }
  saving.value = true
  try {
    if (editing.value) {
      await updateCustomer(editing.value.id, toPayload())
    } else {
      await createCustomer(toPayload())
    }
    slideOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Failed to save', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
})

function handleBulkEdit(ids: string[]) {
  openBulkEdit(ids)
}

function handleImport(rows: Record<string, unknown>[]) {
  toast.add({ title: `${rows.length} rows ready`, description: 'Bulk import not yet wired up.', color: 'info' })
}
</script>

<template>
  <section>
    <AppPageHeader title="Customers" description="Manage your customer contacts." />

    <AppDataTable
      :columns="columns"
      :data="customers ?? []"
      :loading="pending"
      create-label="New customer"
      search-field="name"
      export-filename="customers"
      :export-columns="exportColumns"
      :export-data="exportData"
      @create="openNew"
      @bulk-edit="handleBulkEdit"
      @import="handleImport"
    >
      <template #empty>
        <div class="flex flex-col items-center py-16 gap-3">
          <UIcon name="i-lucide-users" class="size-10 text-(--ui-text-muted)" />
          <p class="font-medium text-(--ui-text-highlighted)">No customers yet</p>
          <p class="text-sm text-(--ui-text-muted)">Add your first customer to get started.</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-1" @click="openNew">New customer</UButton>
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

    <!-- Slideover -->
    <AppSlideover
      v-model:open="slideOpen"
      :title="editing ? editing.name : 'New customer'"
      :description="editing ? 'Edit customer details.' : 'Add a new customer contact.'"
      :submit-label="editing ? 'Update' : 'Create customer'"
      :loading="saving"
      @submit="submitTrigger++"
      @cancel="slideOpen = false"
    >
      <div class="space-y-4">
        <UFormField label="Name" name="name" required>
          <UInput v-model="form.name" placeholder="Ahmad Razif" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Email" name="email">
            <UInput v-model="form.email" type="email" placeholder="email@example.com" class="w-full" />
          </UFormField>
          <UFormField label="Phone" name="phone">
            <AppPhoneInput v-model="form.phone" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Address" name="address">
          <UInput v-model="form.address" placeholder="No 12, Jalan Puteri 2" class="w-full" />
        </UFormField>
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="City" name="city">
            <UInput v-model="form.city" placeholder="Puchong" class="w-full" />
          </UFormField>
          <UFormField label="Postcode" name="postcode">
            <UInput v-model="form.postcode" placeholder="47100" class="w-full" />
          </UFormField>
        </div>
        <UFormField label="Notes" name="notes">
          <UTextarea v-model="form.notes" placeholder="Any notes about this customer…" :rows="3" class="w-full" />
        </UFormField>
      </div>
    </AppSlideover>

    <!-- Bulk edit modal -->
    <CustomerBulkEditModal
      v-model:open="bulkEditOpen"
      :ids="bulkEditIds"
      @confirm="onBulkConfirm"
    />

  </section>
</template>
