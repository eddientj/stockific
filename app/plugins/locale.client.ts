export default defineNuxtPlugin(() => {
  const { setLocale } = useLocale()
  const stored = localStorage.getItem('stockific-locale')
  if (stored === 'ms') setLocale('ms')
})
