<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LeadRow, ExportColumn } from '~/types'

definePageMeta({ layout: 'admin' })

const { t }   = useLocale()
const toast   = useAppToast()

const { leads, pending, refresh, createLead, updateLead } = useLeads()
const { fields, stages, stageOptions, blankLead, leadToForm, formToPayload } = useLeadFormFields()

// ── Filters (stage) ───────────────────────────────────────────
const filters = reactive({ stageIds: [] as string[] })
const activeFilterCount = computed(() => (filters.stageIds.length > 0 ? 1 : 0))

const filteredLeads = computed(() => {
  let rows = leads.value ?? []
  if (filters.stageIds.length > 0)
    rows = rows.filter(l => l.stage && filters.stageIds.includes(l.stage.id))
  return rows
})

function resetFilters() { filters.stageIds = [] }

// ── Table columns ─────────────────────────────────────────────
const columns = computed<TableColumn<LeadRow>[]>(() => [
  { accessorKey: 'name',       header: t('lead.colName'),    enableSorting: true  },
  { accessorKey: 'stage',      header: t('lead.colStage'),   enableSorting: false },
  { accessorKey: 'company',    header: t('lead.colCompany'), enableSorting: false },
  { accessorKey: 'value',      header: t('lead.colValue'),   enableSorting: true  },
  { accessorKey: 'created_at', header: t('lead.colDate'),    enableSorting: true  },
  { id: 'actions',             header: ''                    },
])

// ── Create / edit slideover (AppFormSlideover) ────────────────
const slideOpen = ref(false)
const editing   = ref<LeadRow | null>(null)
const saving    = ref(false)
const form      = ref<Record<string, any>>(blankLead())

function openNew()            { editing.value = null; slideOpen.value = true }
function openEdit(l: LeadRow) { editing.value = l;    slideOpen.value = true }

watch(slideOpen, (v) => {
  if (!v) return
  form.value = editing.value ? leadToForm(editing.value) : blankLead()
})

async function save() {
  if (!String(form.value.name ?? '').trim()) { toast.error('Name is required'); return }
  saving.value = true
  try {
    const payload = formToPayload(form.value)
    if (editing.value) await updateLead(editing.value.id, payload)
    else               await createLead(payload)
    slideOpen.value = false
  } catch (e: any) {
    toast.error('Failed to save', e?.data?.statusMessage ?? e?.message)
  } finally {
    saving.value = false
  }
}

// ── Bulk delete ───────────────────────────────────────────────
async function bulkDelete(ids: string[]) {
  try {
    await Promise.all(ids.map(id => $fetch(`/api/crm/leads/${id}`, { method: 'DELETE' })))
    toast.success(`${ids.length} leads deleted`)
    await refresh()
  } catch (e: any) {
    toast.error('Bulk delete failed', e?.data?.statusMessage ?? e?.message)
  }
}

// ── Bulk edit (move stage) ────────────────────────────────────
const NO_CHANGE     = '__nochange__'
const bulkEditOpen  = ref(false)
const bulkEditStep  = ref<'edit' | 'confirm'>('edit')
const bulkEditIds   = ref<string[]>([])
const bulkStage     = ref<string>(NO_CHANGE)

function openBulkEdit(ids: string[]) {
  bulkEditIds.value = ids
  bulkStage.value   = NO_CHANGE
  bulkEditStep.value = 'edit'
  bulkEditOpen.value = true
}

const bulkStageLabel = computed(() => {
  if (bulkStage.value === NO_CHANGE) return null
  if (bulkStage.value === 'null')    return '— None —'
  return (stages.value ?? []).find(s => s.id === bulkStage.value)?.name ?? bulkStage.value
})

function bulkRequestConfirm() {
  if (bulkStage.value === NO_CHANGE) {
    toast.add({ title: 'No changes selected', color: 'warning' })
    return
  }
  bulkEditStep.value = 'confirm'
}

async function bulkDoConfirm() {
  const stage_id = bulkStage.value === 'null' ? null : bulkStage.value
  try {
    await Promise.all(bulkEditIds.value.map(id =>
      $fetch(`/api/crm/leads/${id}`, { method: 'PATCH', body: { stage_id } }),
    ))
    toast.success(`${bulkEditIds.value.length} leads updated`)
    bulkEditOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.error('Bulk edit failed', e?.data?.statusMessage ?? e?.message)
  }
}

// ── Filter slideover ──────────────────────────────────────────
const filterSlideoverOpen = ref(false)

function handleImport(rows: Record<string, unknown>[]) {
  toast.add({ title: `${rows.length} rows read`, description: 'Lead import is not yet implemented.', color: 'info' })
}

// ── Export ────────────────────────────────────────────────────
const exportColumns: ExportColumn[] = [
  { key: 'name',       label: 'Name'       },
  { key: 'email',      label: 'Email'      },
  { key: 'phone',      label: 'Phone'      },
  { key: 'stage',      label: 'Stage'      },
  { key: 'company',    label: 'Company'    },
  { key: 'value',      label: 'Value (RM)' },
  { key: 'source',     label: 'Source'     },
  { key: 'created_at', label: 'Created'    },
]
const exportData = computed(() =>
  (leads.value ?? []).map(l => ({
    id:         l.id,
    name:       l.name,
    email:      l.email ?? '',
    phone:      l.phone ?? '',
    stage:      l.stage?.name ?? '',
    company:    l.company?.name ?? '',
    value:      l.value ?? '',
    source:     l.source ?? '',
    created_at: l.created_at?.slice(0, 10) ?? '',
  })),
)

// ── Helpers ───────────────────────────────────────────────────
const fmtDate  = (d: string) => new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtValue = (v: number | null) => v == null ? '—' : `RM ${v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
</script>

<template>
  <section>
    <div class="flex items-center justify-between gap-4">
      <AppPageHeader :title="t('lead.title')" :description="t('lead.subtitle')" />
      <UButton variant="outline" color="neutral" icon="i-lucide-kanban" to="/admin/leads/pipeline">
        {{ t('lead.pipeline') }}
      </UButton>
    </div>

    <AppDataTable
      :columns="columns"
      :data="filteredLeads"
      :loading="pending"
      :create-label="t('lead.new')"
      search-field="name"
      filterable
      :active-filters="activeFilterCount"
      export-filename="leads"
      :export-columns="exportColumns"
      :export-data="exportData"
      empty-icon="i-lucide-users"
      :empty-title="t('lead.noLeads')"
      :empty-hint="t('lead.noLeadsHint')"
      @create="openNew"
      @filter="filterSlideoverOpen = true"
      @bulk-delete="bulkDelete"
      @bulk-edit="openBulkEdit"
      @import="handleImport"
    >
      <template #name-cell="{ row }">
        <NuxtLink
          :to="`/admin/leads/${row.original.id}`"
          class="font-medium text-(--ui-text-highlighted) hover:underline"
        >{{ row.original.name }}</NuxtLink>
      </template>

      <template #stage-cell="{ row }">
        <span
          v-if="row.original.stage"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
          :style="{ background: row.original.stage.color }"
        >{{ row.original.stage.name }}</span>
        <span v-else class="text-(--ui-text-muted) text-sm">—</span>
      </template>

      <template #company-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm">{{ row.original.company?.name ?? '—' }}</span>
      </template>

      <template #value-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm font-mono">{{ fmtValue(row.original.value) }}</span>
      </template>

      <template #created_at-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm">{{ fmtDate(row.original.created_at) }}</span>
      </template>

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

    <!-- Create / edit form -->
    <AppFormSlideover
      v-model="form"
      v-model:open="slideOpen"
      :title="editing ? editing.name : t('lead.new')"
      :fields="fields"
      :loading="saving"
      :save-label="editing ? t('action.save') : t('lead.create')"
      @save="save"
    />

    <!-- Filter slideover -->
    <AppSlideover
      v-model:open="filterSlideoverOpen"
      :title="t('lead.filter')"
      :description="t('lead.filterHint')"
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterSlideoverOpen = false"
      @cancel="resetFilters"
    >
      <UFormField :label="t('lead.colStage')">
        <USelectMenu
          v-model="filters.stageIds"
          :items="stageOptions"
          multiple
          value-key="value"
          :placeholder="t('lead.colStage')"
          class="w-full"
        />
      </UFormField>
    </AppSlideover>

    <!-- Bulk edit — step 1 -->
    <UModal :open="bulkEditOpen && bulkEditStep === 'edit'" @update:open="bulkEditOpen = $event">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pencil" class="size-5 text-brand-500" />
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">{{ t('lead.bulkMove', { n: bulkEditIds.length }) }}</h3>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-5">{{ t('lead.bulkMoveHint') }}</p>
        <UFormField :label="t('lead.stage')">
          <USelect
            v-model="bulkStage"
            :items="[
              { label: t('lead.noChange'), value: NO_CHANGE },
              { label: '— None —',         value: 'null'    },
              ...stageOptions,
            ]"
            class="w-full"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex gap-2">
          <UButton icon="i-lucide-arrow-right" @click="bulkRequestConfirm">{{ t('table.editSelected') }}</UButton>
          <UButton variant="outline" color="neutral" @click="bulkEditOpen = false">{{ t('action.cancel') }}</UButton>
        </div>
      </template>
    </UModal>

    <!-- Bulk edit — step 2 confirm -->
    <UModal :open="bulkEditOpen && bulkEditStep === 'confirm'" @update:open="bulkEditOpen = $event">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-triangle-alert" class="size-5 text-warning-500" />
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">{{ t('lead.confirmMove') }}</h3>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Move <span class="font-semibold text-(--ui-text-highlighted)">{{ bulkEditIds.length }}</span> leads to
          <span class="font-semibold text-(--ui-text-highlighted)">{{ bulkStageLabel }}</span>?
        </p>
      </template>
      <template #footer>
        <div class="flex gap-2">
          <UButton icon="i-lucide-check" @click="bulkDoConfirm">{{ t('action.confirm') }}</UButton>
          <UButton variant="outline" color="neutral" @click="bulkEditStep = 'edit'">{{ t('action.back') }}</UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>
