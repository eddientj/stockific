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

  async function deleteStage(id: string, name: string) {
    if (!confirm(`Delete stage "${name}"? Leads in this stage will become unassigned.`)) return false
    await $fetch(`/api/crm/pipeline-stages/${id}`, { method: 'DELETE' })
    toast.success('Stage deleted')
    await refresh()
    return true
  }

  return { stages, pending, refresh, createStage, updateStage, deleteStage }
}
