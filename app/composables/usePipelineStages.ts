import type { PipelineStage } from '~/types'

export function usePipelineStages() {
  const toast = useAppToast()

  const { data: stages, pending, refresh } =
    useFetch<PipelineStage[]>('/api/crm/pipeline-stages')

  async function createStage(payload: Partial<PipelineStage>) {
    await $fetch('/api/crm/pipeline-stages', { method: 'POST', body: payload })
    toast.success('Stage created')
    await refresh()
  }

  async function updateStage(id: string, payload: Partial<PipelineStage>) {
    await $fetch(`/api/crm/pipeline-stages/${id}`, { method: 'PATCH', body: payload })
    toast.success('Stage updated')
    await refresh()
  }

  // Silent variant for inline auto-save (no toast) — still refreshes so the
  // board reflects the change. Editor keeps its own working copy, so refresh
  // won't clobber in-progress edits.
  async function updateStageQuiet(id: string, payload: Partial<PipelineStage>) {
    await $fetch(`/api/crm/pipeline-stages/${id}`, { method: 'PATCH', body: payload })
    await refresh()
  }

  async function deleteStage(id: string) {
    await $fetch(`/api/crm/pipeline-stages/${id}`, { method: 'DELETE' })
    toast.success('Stage deleted')
    await refresh()
  }

  // A sensible starter pipeline so a new org's board works out of the box.
  const DEFAULT_STAGES: Partial<PipelineStage>[] = [
    { name: 'New',       color: BRAND_HEX },
    { name: 'Contacted', color: '#0ea5e9' },
    { name: 'Qualified', color: '#8b5cf6' },
    { name: 'Proposal',  color: '#f59e0b' },
    { name: 'Won',       color: '#10b981', is_closed_won:  true },
    { name: 'Lost',      color: '#ef4444', is_closed_lost: true },
  ]

  async function seedDefaults() {
    // Sequential keeps the appended `position` values in order.
    for (const s of DEFAULT_STAGES) {
      await $fetch('/api/crm/pipeline-stages', { method: 'POST', body: s })
    }
    toast.success('Default pipeline created')
    await refresh()
  }

  // Persist a new lane order (quiet — single refresh, one toast).
  async function reorderStages(orderedIds: string[]) {
    await Promise.all(orderedIds.map((id, i) =>
      $fetch(`/api/crm/pipeline-stages/${id}`, { method: 'PATCH', body: { position: i } }),
    ))
    await refresh()
  }

  return { stages, pending, refresh, createStage, updateStage, updateStageQuiet, deleteStage, seedDefaults, reorderStages }
}
