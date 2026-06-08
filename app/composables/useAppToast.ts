export function useAppToast() {
  const t = useToast()
  return {
    add:    (opts: Parameters<typeof t.add>[0])    => t.add({ duration: 4000, ...opts }),
    remove: t.remove.bind(t),
    clear:  t.clear.bind(t),
    update: t.update.bind(t),
  }
}
