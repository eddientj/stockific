<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LeadRow } from '~/types'

definePageMeta({ layout: 'admin' })

const { t }  = useLocale()
const toast  = useAppToast()
const router = useRouter()

const searchQuery = ref('')
const stageFilter = ref<string | null>(null)

const params = computed(() => {
  const p: Record<string, string> = {}
  if (searchQuery.value) p.search   = searchQuery.value
  if (stageFilter.value) p.stage_id = stageFilter.value
  return p
})

const { leads, total, pending, refresh, createLead, updateLead, deleteLead } = useLeads(params)
const { stages } = usePipelineStages()
const { companies } = useCompanies()

// ── Slideover ─────────────────────────────────────────────────
const slideOpen = ref(false)
const editing   = ref<LeadRow | null>(null)
const saving    = ref(false)

const form = ref({
  name: '', email: '', phone: '', source: '', notes: '',
  value: '' as string | number,
  stage_id: null as string | null,
  company_id: null as string | null,
})

function openNew()               { editing.value = null; slideOpen.value = true }
function openEdit(l: LeadRow)    { editing.value = l;    slideOpen.value = true }

watch(slideOpen, (v) => {
  if (!v) return
  const l = editing.value
  form.value = {
    name:       l?.name       ?? '',
    email:      l?.email      ?? '',
    phone:      l?.phone      ?? '',
    source:     l?.source     ?? '',
    notes:      l?.notes      ?? '',
    value:      l?.value      ?? '',
    stage_id:   l?.stage?.id  ?? null,
    company_id: l?.company?.id ?? null,
  }
})

async function save() {
  if (!form.value.name.trim()) {
    toast.error('Name is required')
    return
  }
  saving.value = true
  try {
    const payload = {
      name:       form.value.name.trim(),
      email:      form.value.email      || null,
      phone:      form.value.phone      || null,
      source:     form.value.source     || null,
      notes:      form.value.notes      || null,
      value:      form.value.value !== '' ? Number(form.value.value) : null,
      stage_id:   form.value.stage_id   || null,
      company_id: form.value.company_id || null,
    }
    if (editing.value) {
      await updateLead(editing.value.id, payload)
    } else {
      await createLead(payload)
    }
    slideOpen.value = false
  } catch (e: any) {
    toast.error('Failed to save', e?.data?.statusMessage ?? e?.message)
  } finally {
    saving.value = false
  }
}

// ── Stage options for filter & form ──────────────────────────
const stageOptions = computed(() =>
  (stages.value ?? []).map(s => ({ label: s.name, value: s.id }))
)

const companyOptions = computed(() =>
  (companies.value ?? []).map(c => ({ label: c.name, value: c.id }))
)

// ── Table columns ─────────────────────────────────────────────
const columns = computed<TableColumn<LeadRow>[]>(() => [
  { accessorKey: 'name',    header: t('lead.colName'),    enableSorting: true  },
  { accessorKey: 'stage',   header: t('lead.colStage'),   enableSorting: false },
  { accessorKey: 'company', header: t('lead.colCompany'), enableSorting: false },
  { accessorKey: 'value',   header: t('lead.colValue'),   enableSorting: true  },
  { accessorKey: 'created_at', header: t('lead.colDate'), enableSorting: true  },
  { id: 'actions', header: '' },
])

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtValue(v: number | null) {
  if (v == null) return '—'
  return `RM ${v.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <AppPageHeader :title="t('lead.title')" :description="t('lead.subtitle')" class="mb-0" />
      <div class="flex items-center gap-2">
        <UButton variant="outline" color="neutral" icon="i-lucide-kanban" to="/admin/leads/pipeline">
          {{ t('lead.pipeline') }}
        </UButton>
        <UButton icon="i-lucide-plus" @click="openNew">{{ t('lead.new') }}</UButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4">
      <UInput v-model="searchQuery" icon="i-lucide-search" :placeholder="t('action.search')" class="w-64" />
      <USelectMenu
        v-model="stageFilter"
        :items="[{ label: 'All stages', value: null }, ...stageOptions]"
        value-key="value"
        placeholder="All stages"
        class="w-44"
      />
    </div>

    <AppDataTable
      :columns="columns"
      :data="leads"
      :loading="pending"
      :create-label="t('lead.new')"
      @create="openNew"
    >
      <template #empty>
        <div class="flex flex-col items-center py-16 gap-3">
          <UIcon name="i-lucide-users" class="size-10 text-(--ui-text-muted)" />
          <p class="font-medium text-(--ui-text-highlighted)">{{ t('lead.noLeads') }}</p>
          <p class="text-sm text-(--ui-text-muted)">{{ t('lead.noLeadsHint') }}</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-1" @click="openNew">{{ t('lead.new') }}</UButton>
        </div>
      </template>

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
          <UButton icon="i-lucide-arrow-right" variant="ghost" color="neutral" size="sm"
            :to="`/admin/leads/${row.original.id}`" />
          <UButton icon="i-lucide-pencil"      variant="ghost" color="neutral" size="sm"
            @click="openEdit(row.original)" />
          <UButton icon="i-lucide-trash-2"     variant="ghost" color="error"   size="sm"
            @click="deleteLead(row.original.id, row.original.name)" />
        </div>
      </template>
    </AppDataTable>

    <!-- Lead form slideover -->
    <USlideover v-model:open="slideOpen" :title="editing ? editing.name : t('lead.new')">
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField :label="t('field.name')" required>
            <UInput v-model="form.name" placeholder="Ahmad Razif" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('field.email')">
              <UInput v-model="form.email" type="email" placeholder="email@example.com" class="w-full" />
            </UFormField>
            <UFormField :label="t('field.phone')">
              <UInput v-model="form.phone" placeholder="+60 12 345 6789" class="w-full" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('lead.stage')">
              <USelectMenu
                v-model="form.stage_id"
                :items="stageOptions"
                value-key="value"
                placeholder="Select stage…"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('lead.value')">
              <UInput v-model="form.value" type="number" min="0" placeholder="0.00" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="t('lead.company')">
            <USelectMenu
              v-model="form.company_id"
              :items="companyOptions"
              value-key="value"
              placeholder="Select company…"
              searchable
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('lead.source')">
            <UInput v-model="form.source" placeholder="Referral, Website, Cold call…" class="w-full" />
          </UFormField>
          <UFormField :label="t('field.notes')">
            <UTextarea v-model="form.notes" :rows="3" placeholder="Any notes about this lead…" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 p-4">
          <UButton :loading="saving" @click="save">
            {{ editing ? t('action.save') : t('lead.new') }}
          </UButton>
          <UButton variant="outline" color="neutral" @click="slideOpen = false">{{ t('action.cancel') }}</UButton>
        </div>
      </template>
    </USlideover>
  </section>
</template>
