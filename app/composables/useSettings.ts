export type BusinessSettings = {
  id:                    number
  company_name:          string
  reg_number:            string | null
  email:                 string | null
  phone:                 string | null
  website:               string | null
  address:               string | null
  city:                  string | null
  postcode:              string | null
  country:               string
  logo_url:              string | null
  accent_color:          string
  invoice_prefix:        string
  default_tax_rate:      number
  default_payment_terms: string
  invoice_notes:         string | null
  bank_name:             string | null
  bank_account:          string | null
  bank_holder:           string | null
  duitnow_id:            string | null
  updated_at:            string
}

// Module-level singleton — shared across all composable instances
const _settings = ref<BusinessSettings | null>(null)
let _loaded = false

export function useSettings() {
  // Fetch once; subsequent calls reuse the singleton
  const { data, refresh } = useAsyncData<BusinessSettings>(
    'business-settings',
    () => $fetch('/api/settings'),
    { immediate: !_loaded }
  )

  watchEffect(() => {
    if (data.value) {
      _settings.value = data.value
      _loaded = true
    }
  })

  const toast = useAppToast()
  const saving = ref(false)

  async function save(payload: Partial<Omit<BusinessSettings, 'id' | 'updated_at'>>) {
    saving.value = true
    try {
      const updated = await $fetch<BusinessSettings>('/api/settings', {
        method: 'PATCH',
        body: payload,
      })
      _settings.value = updated
      toast.add({ title: 'Settings saved', color: 'success', icon: 'i-lucide-check' })
    } catch (e: any) {
      toast.add({ title: 'Save failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
    } finally {
      saving.value = false
    }
  }

  return {
    settings: _settings,
    refresh,
    saving,
    save,
  }
}
