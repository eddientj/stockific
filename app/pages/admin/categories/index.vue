<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ layout: 'admin' })

const toast = useToast()
const { t } = useLocale()

interface Category {
  id: string
  name: string
  product_count: number
}

const { data: categories, refresh } = await useFetch<Category[]>('/api/categories')

// ── Slideover state ───────────────────────────────────────────
const slideOpen  = ref(false)
const editing    = ref<Category | null>(null)
const formName   = ref('')
const saving     = ref(false)

// ── Delete modal state ────────────────────────────────────────
const confirmOpen   = ref(false)
const deleteTarget  = ref<Category | null>(null)
const deleting      = ref(false)

function openAdd() {
  editing.value = null
  formName.value = ''
  slideOpen.value = true
}

function openEdit(cat: Category) {
  editing.value = cat
  formName.value = cat.name
  slideOpen.value = true
}

function askDelete(cat: Category) {
  deleteTarget.value = cat
  confirmOpen.value  = true
}

async function submit() {
  if (!formName.value.trim()) return
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/categories/${editing.value.id}`, {
        method: 'PATCH',
        body: { name: formName.value.trim() },
      })
      toast.add({ title: t('cat.saveChanges'), description: `"${formName.value.trim()}" updated.`, color: 'success', icon: 'i-lucide-check' })
    } else {
      await $fetch('/api/categories', {
        method: 'POST',
        body: { name: formName.value.trim() },
      })
      toast.add({ title: t('cat.create'), description: `"${formName.value.trim()}" created.`, color: 'success', icon: 'i-lucide-check' })
    }
    slideOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/categories/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: `"${deleteTarget.value.name}" deleted.`, color: 'success', icon: 'i-lucide-check' })
    confirmOpen.value  = false
    deleteTarget.value = null
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}

const columns = computed<TableColumn<Category>[]>(() => [
  { accessorKey: 'name',          header: t('cat.colName'),     enableSorting: true  },
  { accessorKey: 'product_count', header: t('cat.colProducts'), enableSorting: true  },
  { id: 'actions',                header: ''                                         },
])
</script>

<template>
  <div class="space-y-6">

    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-(--ui-text-highlighted)">{{ t('cat.title') }}</h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">{{ t('cat.subtitle') }}</p>
      </div>
      <UButton icon="i-lucide-plus" @click="openAdd">{{ t('cat.new') }}</UButton>
    </div>

    <!-- ── Table ──────────────────────────────────────────── -->
    <UCard :ui="{ body: 'p-0' }">
      <UTable :data="categories ?? []" :columns="columns">

        <template #product_count-cell="{ row }">
          <UBadge
            :label="`${row.original.product_count} ${row.original.product_count === 1 ? 'product' : 'products'}`"
            variant="soft"
            color="neutral"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-1">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="openEdit(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="askDelete(row.original)"
            />
          </div>
        </template>

        <template #empty>
          <div class="py-12 text-center text-(--ui-text-muted) text-sm">{{ t('cat.empty') }}</div>
        </template>

      </UTable>
    </UCard>

    <!-- ── Add / Edit slideover ───────────────────────────── -->
    <USlideover
      v-model:open="slideOpen"
      :title="editing ? t('cat.editTitle') : t('cat.newTitle')"
    >
      <template #body>
        <div class="p-4 space-y-4">
          <UFormField :label="t('cat.name')">
            <UInput
              v-model="formName"
              placeholder="e.g. Trading Cards"
              class="w-full"
              autofocus
              @keydown.enter="submit"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 p-4">
          <UButton class="flex-1" :loading="saving" @click="submit">
            {{ editing ? t('cat.saveChanges') : t('cat.create') }}
          </UButton>
          <UButton variant="outline" color="neutral" @click="slideOpen = false">
            {{ t('action.cancel') }}
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- ── Delete confirmation modal ─────────────────────── -->
    <UModal
      v-model:open="confirmOpen"
      :title="t('cat.deleteTitle')"
    >
      <template #body>
        <div class="p-4 space-y-3">
          <p class="text-sm text-(--ui-text-muted)">
            {{ t('cat.deleteConfirm') }}
            <strong class="text-(--ui-text-highlighted)">{{ deleteTarget?.name }}</strong>?
          </p>
          <UAlert
            v-if="deleteTarget && deleteTarget.product_count > 0"
            color="warning"
            icon="i-lucide-triangle-alert"
            :description="`${deleteTarget.product_count} ${t('cat.deleteWarning')}`"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2 p-4">
          <UButton color="error" class="flex-1" :loading="deleting" @click="confirmDelete">
            {{ t('action.delete') }}
          </UButton>
          <UButton variant="outline" color="neutral" @click="confirmOpen = false">
            {{ t('action.cancel') }}
          </UButton>
        </div>
      </template>
    </UModal>

  </div>
</template>
