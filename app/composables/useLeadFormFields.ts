import type { FieldDef } from '~/types/form'

/**
 * Single source of truth for the Lead create/edit form schema.
 * Used by both the leads list page and the lead detail page so the
 * form is identical everywhere. Loads stage + company options itself.
 */
export function useLeadFormFields() {
  const { t } = useLocale()
  const { stages }    = usePipelineStages()
  const { companies } = useCompanies()

  const stageOptions = computed(() =>
    (stages.value ?? []).map(s => ({ label: s.name, value: s.id })),
  )
  const companyOptions = computed(() =>
    (companies.value ?? []).map(c => ({ label: c.name, value: c.id })),
  )

  const fields = computed<FieldDef[]>(() => [
    { name: 'name',       label: t('field.name'),  type: 'text',  required: true, placeholder: 'Ahmad Razif', span: 2 },
    { name: 'email',      label: t('field.email'), type: 'email', placeholder: 'email@example.com' },
    { name: 'phone',      label: t('field.phone'), type: 'phone' },
    { name: 'stage_id',   label: t('lead.stage'),  type: 'select', placeholder: 'Select stage…', options: [
      { label: '— None —', value: null },
      ...stageOptions.value,
    ] },
    { name: 'value',      label: t('lead.value'),  type: 'number', min: 0, max: 100000000, decimals: 2, mono: true, placeholder: '0.00' },
    { name: 'company_id', label: t('lead.company'), type: 'select', placeholder: 'Select company…', span: 2, options: [
      { label: '— None —', value: null },
      ...companyOptions.value,
    ] },
    { name: 'source',     label: t('lead.source'), type: 'text', placeholder: 'Referral, Website, Cold call…', span: 2 },
    { name: 'notes',      label: t('field.notes'), type: 'textarea', rows: 3, span: 2 },
  ])

  /** Blank form state matching the schema's field names. */
  function blankLead() {
    return { name: '', email: '', phone: '', stage_id: null, value: null, company_id: null, source: '', notes: '' } as Record<string, any>
  }

  /** Map a lead row/detail into form state. */
  function leadToForm(l: any): Record<string, any> {
    return {
      name:       l?.name        ?? '',
      email:      l?.email       ?? '',
      phone:      l?.phone       ?? '',
      stage_id:   l?.stage?.id   ?? null,
      value:      l?.value       ?? null,
      company_id: l?.company?.id ?? null,
      source:     l?.source      ?? '',
      notes:      l?.notes       ?? '',
    }
  }

  /** Map form state into an API payload. */
  function formToPayload(f: Record<string, any>) {
    return {
      name:       String(f.name ?? '').trim(),
      email:      f.email      || null,
      phone:      f.phone      || null,
      stage_id:   f.stage_id   || null,
      value:      f.value != null && f.value !== '' ? Number(f.value) : null,
      company_id: f.company_id || null,
      source:     f.source     || null,
      notes:      f.notes      || null,
    }
  }

  return { fields, stages, companies, stageOptions, companyOptions, blankLead, leadToForm, formToPayload }
}
