<script setup lang="ts">
import type { LeadDetail, ActivityType } from '~/types'

definePageMeta({ layout: 'admin' })

const { t }  = useLocale()
const toast  = useAppToast()
const route  = useRoute()
const router = useRouter()

const id = route.params.id as string

// ── Lead detail ───────────────────────────────────────────────
const { data: lead, pending, refresh } = useFetch<LeadDetail>(`/api/crm/leads/${id}`)

// ── Edit (shared schema via AppFormSlideover) ─────────────────
const { fields, blankLead, leadToForm, formToPayload } = useLeadFormFields()

const editOpen = ref(false)
const saving   = ref(false)
const form     = ref<Record<string, any>>(blankLead())

watch(editOpen, (v) => {
  if (!v || !lead.value) return
  form.value = leadToForm(lead.value)
})

async function saveLead() {
  if (!String(form.value.name ?? '').trim()) { toast.error('Name is required'); return }
  saving.value = true
  try {
    await $fetch(`/api/crm/leads/${id}`, { method: 'PATCH', body: formToPayload(form.value) })
    toast.success('Lead updated')
    editOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.error('Failed to save', e?.data?.statusMessage ?? e?.message)
  } finally {
    saving.value = false
  }
}

// ── Convert to order ──────────────────────────────────────────
const converting = ref(false)

async function convertToOrder() {
  if (!confirm('Convert this lead to a draft order? The lead will be marked as converted.')) return
  converting.value = true
  try {
    await $fetch<{ order_id: string }>(`/api/crm/leads/${id}/convert`, { method: 'POST' })
    toast.success('Converted to order')
    await router.push('/admin/orders')
  } catch (e: any) {
    toast.error('Conversion failed', e?.data?.statusMessage ?? e?.message)
  } finally {
    converting.value = false
  }
}

// ── Activity log ──────────────────────────────────────────────
const activityTypes: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'note',    label: 'Note',    icon: 'i-lucide-sticky-note' },
  { value: 'call',    label: 'Call',    icon: 'i-lucide-phone'       },
  { value: 'email',   label: 'Email',   icon: 'i-lucide-mail'        },
  { value: 'meeting', label: 'Meeting', icon: 'i-lucide-calendar'    },
]

const activityForm    = ref<{ type: ActivityType; body: string }>({ type: 'note', body: '' })
const loggingActivity = ref(false)

async function logActivity() {
  if (!activityForm.value.body.trim()) { toast.error('Activity notes are required'); return }
  loggingActivity.value = true
  try {
    await $fetch('/api/crm/activities', { method: 'POST', body: { ...activityForm.value, lead_id: id } })
    toast.success('Activity logged')
    activityForm.value.body = ''
    await refresh()
  } catch (e: any) {
    toast.error('Failed to log activity', e?.data?.statusMessage ?? e?.message)
  } finally {
    loggingActivity.value = false
  }
}

async function deleteActivity(actId: string) {
  await $fetch(`/api/crm/activities/${actId}`, { method: 'DELETE' })
  await refresh()
}

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-MY', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const activityIcon: Record<ActivityType, string> = {
  note: 'i-lucide-sticky-note', call: 'i-lucide-phone', email: 'i-lucide-mail', meeting: 'i-lucide-calendar',
}
</script>

<template>
  <section>
    <!-- Back link -->
    <NuxtLink to="/admin/leads" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text-highlighted) flex items-center gap-1 mb-4 no-underline">
      <UIcon name="i-lucide-arrow-left" class="size-4" /> {{ t('lead.back') }}
    </NuxtLink>

    <div v-if="pending" class="flex justify-center py-20">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-(--ui-text-muted)" />
    </div>

    <div v-else-if="!lead" class="text-center py-20 text-(--ui-text-muted)">Lead not found.</div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between mb-6 gap-4">
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold text-(--ui-text-highlighted) truncate">{{ lead.name }}</h1>
          <div class="flex items-center gap-3 mt-1.5 flex-wrap">
            <span v-if="lead.stage" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" :style="{ background: lead.stage.color }">
              {{ lead.stage.name }}
            </span>
            <span v-if="lead.company" class="text-sm text-(--ui-text-muted)">{{ lead.company.name }}</span>
            <span v-if="lead.value" class="text-sm font-mono font-semibold text-(--ui-text-highlighted)">
              RM {{ lead.value.toLocaleString('en-MY', { minimumFractionDigits: 2 }) }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton
            v-if="!lead.order_id"
            variant="outline" color="neutral" icon="i-lucide-arrow-right-circle"
            :loading="converting"
            @click="convertToOrder"
          >{{ t('lead.convert') }}</UButton>
          <UButton icon="i-lucide-pencil" variant="outline" color="neutral" @click="editOpen = true">
            {{ t('action.edit') }}
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: detail -->
        <div class="lg:col-span-1 space-y-4">

          <!-- Contact card -->
          <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lead.details') }}</p>
            <dl class="space-y-2 text-sm">
              <div v-if="lead.email" class="flex gap-2">
                <dt class="text-(--ui-text-muted) w-20 shrink-0">Email</dt>
                <dd class="text-(--ui-text-highlighted) break-all">{{ lead.email }}</dd>
              </div>
              <div v-if="lead.phone" class="flex gap-2">
                <dt class="text-(--ui-text-muted) w-20 shrink-0">Phone</dt>
                <dd class="text-(--ui-text-highlighted)">{{ lead.phone }}</dd>
              </div>
              <div v-if="lead.source" class="flex gap-2">
                <dt class="text-(--ui-text-muted) w-20 shrink-0">Source</dt>
                <dd class="text-(--ui-text-highlighted)">{{ lead.source }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-(--ui-text-muted) w-20 shrink-0">Created</dt>
                <dd class="text-(--ui-text-highlighted)">{{ fmtDate(lead.created_at) }}</dd>
              </div>
            </dl>
            <p v-if="lead.notes" class="text-sm text-(--ui-text-muted) pt-1 border-t border-(--ui-border)">{{ lead.notes }}</p>
          </div>

          <!-- Linked order -->
          <div v-if="lead.order" class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) mb-3">{{ t('lead.linkedOrder') }}</p>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-(--ui-text-highlighted)">{{ lead.order.order_number || 'Draft' }}</p>
                <p class="text-xs text-(--ui-text-muted)">{{ lead.order.status }}</p>
              </div>
              <UButton variant="outline" color="neutral" size="sm" to="/admin/orders">
                {{ t('lead.viewOrder') }}
              </UButton>
            </div>
          </div>

          <!-- Linked company -->
          <div v-if="lead.company" class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4 space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lead.company') }}</p>
            <p class="text-sm font-semibold text-(--ui-text-highlighted)">{{ lead.company.name }}</p>
            <div class="text-xs text-(--ui-text-muted) space-y-0.5">
              <p v-if="lead.company.phone">{{ lead.company.phone }}</p>
              <p v-if="lead.company.email">{{ lead.company.email }}</p>
              <a v-if="lead.company.website" :href="lead.company.website" target="_blank" rel="noopener" class="underline">
                {{ lead.company.website }}
              </a>
            </div>
          </div>
        </div>

        <!-- Right: activity feed -->
        <div class="lg:col-span-2 space-y-4">

          <!-- Log activity -->
          <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4 space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lead.logActivity') }}</p>
            <div class="flex gap-2">
              <button
                v-for="at in activityTypes"
                :key="at.value"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                :class="activityForm.type === at.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'border-(--ui-border) text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
                @click="activityForm.type = at.value"
              >
                <UIcon :name="at.icon" class="size-3.5" />
                {{ at.label }}
              </button>
            </div>
            <UTextarea
              v-model="activityForm.body"
              :placeholder="t('lead.activityBody')"
              :rows="3"
              class="w-full"
            />
            <UButton icon="i-lucide-send" size="sm" :loading="loggingActivity" @click="logActivity">
              {{ t('lead.logActivity') }}
            </UButton>
          </div>

          <!-- Activity timeline -->
          <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) mb-4">{{ t('lead.activity') }}</p>

            <div v-if="(lead.activities ?? []).length === 0" class="text-center py-8">
              <UIcon name="i-lucide-message-square" class="size-8 text-(--ui-text-muted) mx-auto mb-2 opacity-40" />
              <p class="text-sm text-(--ui-text-muted)">{{ t('lead.noActivity') }}</p>
            </div>

            <div v-else class="space-y-4">
              <div v-for="act in lead.activities" :key="act.id" class="flex gap-3">
                <div class="shrink-0 w-8 h-8 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center">
                  <UIcon :name="activityIcon[act.type]" class="size-3.5 text-(--ui-text-muted)" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 mb-0.5">
                    <span class="text-xs font-semibold uppercase text-(--ui-text-muted) tracking-wide">{{ act.type }}</span>
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-(--ui-text-muted)">{{ fmtDateTime(act.created_at) }}</span>
                      <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteActivity(act.id)" />
                    </div>
                  </div>
                  <p class="text-sm text-(--ui-text-highlighted) whitespace-pre-wrap">{{ act.body }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>

    <!-- Edit lead form -->
    <AppFormSlideover
      v-model="form"
      v-model:open="editOpen"
      :title="lead?.name ?? t('action.edit')"
      :fields="fields"
      :loading="saving"
      :save-label="t('action.save')"
      @save="saveLead"
    />
  </section>
</template>
