export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const sb = useSupabaseAdmin()

  // ── Pipeline by stage ──────────────────────────────────────
  // Fetch stages (ordered) and leads in one go, join in JS
  const [{ data: stages }, { data: leads }] = await Promise.all([
    sb.from('pipeline_stages')
      .select('id, name, color, position, is_closed_won, is_closed_lost')
      .eq('org_id', orgId)
      .order('position'),
    sb.from('leads')
      .select('id, name, stage_id, value, created_at')
      .eq('org_id', orgId)
      .is('order_id', null), // only open (not converted) leads
  ])

  const leadList  = leads  ?? []
  const stageList = stages ?? []

  const pipeline = stageList.map(stage => {
    const stageLeads = leadList.filter(l => l.stage_id === stage.id)
    return {
      id:            stage.id,
      name:          stage.name,
      color:         stage.color,
      is_closed_won: stage.is_closed_won,
      is_closed_lost: stage.is_closed_lost,
      count:         stageLeads.length,
      value:         stageLeads.reduce((s, l) => s + (l.value ?? 0), 0),
    }
  })

  const unassigned = leadList.filter(l => !l.stage_id)
  const totalLeads = leadList.length
  const totalValue = leadList.reduce((s, l) => s + (l.value ?? 0), 0)

  // ── Follow-ups needed (leads with no activity in 7 days) ───
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get lead IDs that have recent activity
  const { data: recentActivity } = await sb
    .from('activities')
    .select('lead_id')
    .eq('org_id', orgId)
    .gte('created_at', cutoff)
    .not('lead_id', 'is', null)

  const recentLeadIds = new Set((recentActivity ?? []).map(a => a.lead_id))

  // Leads with no recent activity (excluding converted leads)
  const followUps = leadList
    .filter(l => !recentLeadIds.has(l.id))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5)
    .map(l => ({
      id:       l.id,
      name:     l.name,
      stage:    stageList.find(s => s.id === l.stage_id) ?? null,
      value:    l.value,
      created_at: l.created_at,
      daysIdle: Math.floor((Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))

  return {
    pipeline,
    unassigned: unassigned.length,
    totalLeads,
    totalValue,
    followUps,
  }
})
