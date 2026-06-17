export function useAppToast() {
  const t = useToast()
  const add = (opts: Parameters<typeof t.add>[0]) => t.add({ duration: 4000, ...opts })
  return {
    add,
    remove:  t.remove.bind(t),
    clear:   t.clear.bind(t),
    update:  t.update.bind(t),
    success: (title: string, description?: string) =>
      add({ title, description, color: 'success', icon: 'i-lucide-check' }),
    error:   (title: string, description?: string) =>
      add({ title, description, color: 'error', icon: 'i-lucide-x-circle' }),
  }
}
