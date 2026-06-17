<script setup lang="ts">
definePageMeta({ layout: false })

// ── Navbar scroll blur ────────────────────────────────────
const scrolled = ref(false)
onMounted(() => {
  window.addEventListener('scroll', () => { scrolled.value = window.scrollY > 30 }, { passive: true })
})

// ── Scroll reveal composable ──────────────────────────────
function useReveal(threshold = 0.12) {
  const el = ref<HTMLElement | null>(null)
  const visible = ref(false)
  onMounted(() => {
    if (!el.value) return
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { visible.value = true; obs.disconnect() }
    }, { threshold })
    obs.observe(el.value)
  })
  return { el, visible }
}

const statsReveal    = useReveal()
const featuresReveal = useReveal()
const carouselReveal = useReveal()
const stepsReveal    = useReveal()
const pricingReveal  = useReveal()
const ctaReveal      = useReveal()

// ── Mock data for hero UI preview ─────────────────────────
const mockProducts = [
  { name: 'Wireless Headphones Pro', price: 'RM 299.00', stock: 42,  active: true  },
  { name: 'USB-C Hub 7-in-1',        price: 'RM 89.90',  stock: 118, active: true  },
  { name: 'Mechanical Keyboard',     price: 'RM 459.00', stock: 3,   active: true  },
  { name: 'Smart Watch Series X',    price: 'RM 899.00', stock: 0,   active: false },
  { name: 'Aluminium Phone Stand',   price: 'RM 49.90',  stock: 77,  active: true  },
]

// ── Features ──────────────────────────────────────────────
const features = [
  { icon: 'i-lucide-package',       title: 'Real-time inventory',    desc: 'Always know exactly what you have. Get instant alerts when stock runs low before it becomes a problem.' },
  { icon: 'i-lucide-shopping-cart', title: 'Order management',       desc: 'Track every order from placement to delivery with a clear, visual status pipeline.' },
  { icon: 'i-lucide-bar-chart-3',   title: 'Sales analytics',        desc: 'Understand your best sellers, revenue trends, and growth opportunities at a glance.' },
  { icon: 'i-lucide-tags',          title: 'Multi-category support', desc: 'Manage any type of product — electronics, fashion, food, or collectibles — in one place.' },
  { icon: 'i-lucide-download',      title: 'Export anywhere',        desc: 'Download your data as Excel or CSV with one click. No lock-in, your data is always yours.' },
  { icon: 'i-lucide-users',         title: 'Team collaboration',     desc: 'Invite staff and give them the right access with role-based permissions you control.' },
]

// ── How it works ──────────────────────────────────────────
const steps = [
  { step: '01', icon: 'i-lucide-upload',       title: 'Import your products',    desc: 'Add your catalogue manually or import from a spreadsheet in seconds. Set prices, categories, and stock levels.' },
  { step: '02', icon: 'i-lucide-eye',           title: 'Track in real time',      desc: 'Monitor stock movement, receive low-stock alerts, and keep your team informed automatically.' },
  { step: '03', icon: 'i-lucide-trending-up',   title: 'Grow with confidence',    desc: 'Use built-in analytics to spot trends, optimise reordering, and make smarter business decisions.' },
]

// ── Pricing ───────────────────────────────────────────────
const plans = [
  {
    name: 'Starter', price: 'Free', period: 'forever',
    desc: 'Perfect for small shops just getting started.',
    features: ['Up to 100 products', '1 user account', 'Basic analytics', 'Excel export', 'Email support'],
    cta: 'Get started free', highlight: false,
  },
  {
    name: 'Growth', price: 'RM 99', period: '/ month',
    desc: 'Everything you need to run a growing retail business.',
    features: ['Unlimited products', '5 user accounts', 'Full analytics suite', 'Order management', 'Bulk import / export', 'Priority support'],
    cta: 'Start free trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    desc: 'For large operations with advanced requirements.',
    features: ['Unlimited everything', 'Unlimited users', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'On-site training'],
    cta: 'Contact sales', highlight: false,
  },
]

// ── Stats ─────────────────────────────────────────────────
const stats = [
  { value: '10,000+', label: 'Products tracked daily' },
  { value: '500+',    label: 'Businesses onboarded'   },
  { value: '99.9%',   label: 'Uptime guaranteed'      },
  { value: '< 2 min', label: 'Average setup time'     },
]
</script>

<template>
  <div class="landing">

    <!-- ───────────────── NAVBAR ──────────────────────── -->
    <header
      class="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      :class="scrolled ? 'bg-[#0a1212]/90 backdrop-blur-md border-b border-white/5 shadow-xl' : 'bg-transparent'"
    >
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">
        <NuxtLink to="/" class="flex items-center gap-2.5 shrink-0 no-underline">
          <span class="w-[3px] h-5 rounded-full block bg-indigo-500" />
          <span class="text-sm font-bold tracking-tight text-white">Stockific</span>
        </NuxtLink>

        <nav class="hidden md:flex items-center gap-1 flex-1">
          <a href="#features"     class="nav-link">Features</a>
          <a href="#how-it-works" class="nav-link">How it works</a>
          <a href="#pricing"      class="nav-link">Pricing</a>
        </nav>

        <div class="flex items-center gap-3 ml-auto">
          <NuxtLink to="/admin/products" class="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/admin/products"
            class="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30"
          >
            Get started →
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- ───────────────── HERO ───────────────────────── -->
    <section class="hero-section relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-3xl" />
        <div class="absolute bottom-1/3 right-1/5 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl" />
        <div class="dot-grid absolute inset-0" />
      </div>

      <div class="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center relative">

        <!-- Copy -->
        <div>
          <div class="hero-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span class="text-indigo-300 text-xs font-medium">Built for modern retail</span>
          </div>

          <h1 class="hero-title text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Your store.<br />
            <span class="text-indigo-400">Under complete</span><br />
            control.
          </h1>

          <p class="hero-desc text-lg text-white/45 leading-relaxed mb-10 max-w-lg">
            Track stock, manage orders, and understand your sales — all from one clean dashboard. Built for retail businesses that mean business.
          </p>

          <div class="hero-ctas flex flex-wrap gap-4">
            <NuxtLink
              to="/admin/products"
              class="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0"
            >
              Start for free
            </NuxtLink>
            <a
              href="#how-it-works"
              class="px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 font-medium transition-all duration-200"
            >
              See how it works
            </a>
          </div>
        </div>

        <!-- App preview mockup -->
        <div class="hero-mockup">
          <div class="relative">
            <div class="absolute -inset-6 bg-indigo-500/5 rounded-3xl blur-2xl" />
            <div class="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60">

              <!-- Browser chrome -->
              <div class="px-4 py-3 bg-[#0e1c1c] border-b border-white/5 flex items-center gap-3">
                <div class="flex gap-1.5">
                  <div class="w-3 h-3 rounded-full bg-[#ff5f57]/80" />
                  <div class="w-3 h-3 rounded-full bg-[#febc2e]/80" />
                  <div class="w-3 h-3 rounded-full bg-[#28c840]/80" />
                </div>
                <div class="flex-1 bg-white/5 rounded text-center text-[11px] text-white/20 py-0.5 px-3 max-w-[180px] mx-auto">
                  stockific.app/admin
                </div>
              </div>

              <!-- App top nav -->
              <div class="bg-[#0d1e1e] border-b border-white/5 px-4 py-2.5 flex items-center gap-6">
                <div class="flex items-center gap-1.5">
                  <div class="w-1 h-4 rounded-full bg-indigo-500" />
                  <span class="text-xs font-bold text-white">Stockific</span>
                </div>
                <div class="flex items-center gap-5">
                  <span class="text-[11px] font-medium text-indigo-400 border-b border-indigo-500 pb-0.5">Products</span>
                  <span class="text-[11px] text-white/25">Orders</span>
                  <span class="text-[11px] text-white/25">Reports</span>
                </div>
              </div>

              <!-- Table area -->
              <div class="bg-[#0c1919] p-4">
                <!-- Toolbar -->
                <div class="flex items-center justify-between mb-4">
                  <div class="h-7 w-36 rounded-lg bg-white/5 border border-white/5" />
                  <div class="flex gap-2">
                    <div class="h-7 w-16 rounded-lg bg-white/5 border border-white/5" />
                    <div class="h-7 w-24 rounded-lg bg-indigo-500/80" />
                  </div>
                </div>

                <!-- Table head -->
                <div class="grid grid-cols-12 gap-2 px-3 py-1 mb-1.5">
                  <div class="col-span-5 text-[9px] uppercase tracking-wider text-white/20">Product</div>
                  <div class="col-span-2 text-[9px] uppercase tracking-wider text-white/20">Price</div>
                  <div class="col-span-2 text-[9px] uppercase tracking-wider text-white/20">Stock</div>
                  <div class="col-span-3 text-[9px] uppercase tracking-wider text-white/20">Status</div>
                </div>

                <!-- Rows -->
                <div class="space-y-1">
                  <div
                    v-for="(p, i) in mockProducts"
                    :key="p.name"
                    class="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg items-center transition-colors"
                    :class="i === 0 ? 'bg-indigo-500/5 border border-indigo-500/10' : 'bg-white/[0.025]'"
                  >
                    <div class="col-span-5 flex items-center gap-2">
                      <div class="w-6 h-6 rounded-md bg-white/5 shrink-0" />
                      <span class="text-[10px] text-white/60 truncate">{{ p.name }}</span>
                    </div>
                    <div class="col-span-2 text-[10px] text-white/45">{{ p.price }}</div>
                    <div class="col-span-2">
                      <span class="text-[10px] font-medium" :class="p.stock === 0 ? 'text-red-400' : p.stock < 5 ? 'text-amber-400' : 'text-white/45'">
                        {{ p.stock }}
                      </span>
                    </div>
                    <div class="col-span-3">
                      <span
                        class="inline-flex items-center gap-1 text-[9px] rounded-full px-2 py-0.5 font-medium"
                        :class="p.active ? 'bg-indigo-500/15 text-indigo-400' : 'bg-white/5 text-white/25'"
                      >
                        <span class="w-1 h-1 rounded-full" :class="p.active ? 'bg-indigo-400' : 'bg-white/20'" />
                        {{ p.active ? 'Listed' : 'Unlisted' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── STATS ──────────────────────── -->
    <section ref="statsReveal.el" class="py-16 border-y border-white/5">
      <div class="max-w-7xl mx-auto px-6">
        <div
          class="grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-700"
          :class="statsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <div v-for="s in stats" :key="s.label" class="text-center">
            <div class="text-3xl font-bold text-indigo-400 mb-1">{{ s.value }}</div>
            <div class="text-sm text-white/35">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── FEATURES ───────────────────── -->
    <section id="features" class="py-28">
      <div class="max-w-7xl mx-auto px-6">
        <div
          ref="featuresReveal.el"
          class="text-center mb-16 transition-all duration-700"
          :class="featuresReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <p class="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Features</p>
          <h2 class="text-4xl font-bold text-white mb-4">Everything you need to sell smarter</h2>
          <p class="text-white/40 max-w-xl mx-auto">One platform that handles inventory, orders, and analytics — so you can focus on growing your business.</p>
        </div>

        <div
          class="grid md:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-700 delay-100"
          :class="featuresReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div
            v-for="f in features"
            :key="f.title"
            class="feature-card group p-6 rounded-2xl border border-white/5 bg-white/[0.025] hover:border-indigo-500/25 transition-all duration-300 cursor-default"
          >
            <div class="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors duration-300">
              <UIcon :name="f.icon" class="size-5 text-indigo-400" />
            </div>
            <h3 class="text-white font-semibold mb-2">{{ f.title }}</h3>
            <p class="text-white/40 text-sm leading-relaxed">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── CAROUSEL ───────────────────── -->
    <section class="py-20 bg-white/[0.015] border-y border-white/5">
      <div class="max-w-5xl mx-auto px-6">
        <div
          ref="carouselReveal.el"
          class="text-center mb-12 transition-all duration-700"
          :class="carouselReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <p class="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Any product type</p>
          <h2 class="text-3xl font-bold text-white mb-3">Works with your entire catalogue</h2>
          <p class="text-white/40">From electronics to fashion, food to collectibles — Stockific handles every category with ease.</p>
        </div>

        <div
          class="transition-all duration-700 delay-100"
          :class="carouselReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <LandingCarousel />
        </div>
      </div>
    </section>

    <!-- ───────────────── HOW IT WORKS ───────────────── -->
    <section id="how-it-works" class="py-28">
      <div class="max-w-7xl mx-auto px-6">
        <div
          ref="stepsReveal.el"
          class="text-center mb-16 transition-all duration-700"
          :class="stepsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <p class="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">How it works</p>
          <h2 class="text-4xl font-bold text-white mb-4">Up and running in minutes</h2>
          <p class="text-white/40 max-w-lg mx-auto">No complicated setup. No steep learning curve. A clean tool that works from day one.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-10">
          <div
            v-for="(s, i) in steps"
            :key="s.step"
            class="text-center transition-all duration-700"
            :class="stepsReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
            :style="{ transitionDelay: `${i * 120}ms` }"
          >
            <div class="relative inline-block mb-6">
              <div class="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <UIcon :name="s.icon" class="size-9 text-indigo-400" />
              </div>
              <div class="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-indigo-500/40">
                {{ s.step }}
              </div>
            </div>
            <h3 class="text-white font-semibold text-lg mb-3">{{ s.title }}</h3>
            <p class="text-white/40 text-sm leading-relaxed">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── PRICING ────────────────────── -->
    <section id="pricing" class="py-28 bg-white/[0.015] border-y border-white/5">
      <div class="max-w-6xl mx-auto px-6">
        <div
          ref="pricingReveal.el"
          class="text-center mb-16 transition-all duration-700"
          :class="pricingReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
        >
          <p class="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-3">Pricing</p>
          <h2 class="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p class="text-white/40">Start free. Scale when you're ready. No surprises.</p>
        </div>

        <div
          class="grid md:grid-cols-3 gap-6 transition-all duration-700 delay-100"
          :class="pricingReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div
            v-for="plan in plans"
            :key="plan.name"
            class="relative rounded-2xl p-7 flex flex-col transition-all duration-300"
            :class="plan.highlight
              ? 'bg-indigo-500/8 border-2 border-indigo-500/40 hover:border-indigo-500/60 hover:shadow-xl hover:shadow-indigo-500/10'
              : 'bg-white/[0.025] border border-white/8 hover:border-white/15'"
          >
            <div v-if="plan.highlight" class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-indigo-500 text-white text-xs font-bold whitespace-nowrap shadow-lg shadow-indigo-500/30">
              Most popular
            </div>

            <h3 class="text-white font-bold text-lg mb-1">{{ plan.name }}</h3>
            <p class="text-white/35 text-sm mb-6">{{ plan.desc }}</p>

            <div class="flex items-baseline gap-1.5 mb-7">
              <span class="text-4xl font-bold" :class="plan.highlight ? 'text-indigo-400' : 'text-white'">
                {{ plan.price }}
              </span>
              <span class="text-white/35 text-sm">{{ plan.period }}</span>
            </div>

            <ul class="space-y-2.5 mb-8 flex-1">
              <li v-for="feat in plan.features" :key="feat" class="flex items-center gap-2.5 text-sm text-white/55">
                <UIcon name="i-lucide-check" class="size-4 text-indigo-500 shrink-0" />
                {{ feat }}
              </li>
            </ul>

            <NuxtLink
              to="/admin/products"
              class="block text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              :class="plan.highlight
                ? 'bg-indigo-500 hover:bg-indigo-400 text-white hover:shadow-lg hover:shadow-indigo-500/25'
                : 'border border-white/10 text-white/60 hover:bg-white/5 hover:text-white'"
            >
              {{ plan.cta }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────────── FINAL CTA ──────────────────── -->
    <section class="py-32">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <div
          ref="ctaReveal.el"
          class="transition-all duration-700"
          :class="ctaReveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
        >
          <div class="relative inline-block mb-8">
            <div class="absolute inset-0 bg-indigo-500/25 blur-3xl rounded-full scale-[2]" />
            <div class="relative w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto">
              <UIcon name="i-lucide-rocket" class="size-8 text-indigo-400" />
            </div>
          </div>

          <h2 class="text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
            Ready to take control<br />of your inventory?
          </h2>
          <p class="text-white/40 text-lg mb-10">
            Join hundreds of retail businesses already running smarter with Stockific.
          </p>

          <div class="flex flex-wrap justify-center gap-4">
            <NuxtLink
              to="/admin/products"
              class="px-8 py-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-base transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Get started for free
            </NuxtLink>
            <a
              href="mailto:hello@stockific.app"
              class="px-8 py-4 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 font-medium text-base transition-all duration-200"
            >
              Talk to us
            </a>
          </div>
          <p class="mt-5 text-white/20 text-sm">No credit card required · Free forever on Starter</p>
        </div>
      </div>
    </section>

    <!-- ───────────────── FOOTER ─────────────────────── -->
    <footer class="border-t border-white/5 py-10">
      <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <span class="w-[3px] h-5 rounded-full bg-indigo-500 block" />
          <span class="text-sm font-bold text-white">Stockific</span>
        </div>
        <div class="flex items-center gap-6">
          <a href="#features"      class="text-sm text-white/25 hover:text-white/55 transition-colors">Features</a>
          <a href="#how-it-works"  class="text-sm text-white/25 hover:text-white/55 transition-colors">How it works</a>
          <a href="#pricing"       class="text-sm text-white/25 hover:text-white/55 transition-colors">Pricing</a>
          <NuxtLink to="/admin/products" class="text-sm text-white/25 hover:text-white/55 transition-colors">Admin panel</NuxtLink>
        </div>
        <p class="text-xs text-white/20">© 2026 Stockific. All rights reserved.</p>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.landing {
  background: #0a1212;
  color: white;
  min-height: 100vh;
}

.nav-link {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  transition: color 0.2s, background-color 0.2s;
  text-decoration: none;
}
.nav-link:hover {
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(255, 255, 255, 0.05);
}

.dot-grid {
  background-image: radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 28px 28px;
}

/* Hero staggered entrance */
.hero-badge  { animation: fadeSlideUp 0.6s ease-out both; }
.hero-title  { animation: fadeSlideUp 0.7s ease-out both 0.1s; }
.hero-desc   { animation: fadeSlideUp 0.7s ease-out both 0.22s; }
.hero-ctas   { animation: fadeSlideUp 0.7s ease-out both 0.34s; }
.hero-mockup { animation: fadeSlideUp 0.9s ease-out both 0.2s; }

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Subtle float on the mockup */
.hero-mockup > div {
  animation: float 7s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-10px); }
}

/* Feature card hover glow */
.feature-card:hover {
  box-shadow: 0 0 0 1px rgba(0, 128, 128, 0.12),
              0 8px 32px -8px rgba(0, 128, 128, 0.12);
  transform: translateY(-2px);
}
</style>
