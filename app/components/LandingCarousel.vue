<script setup lang="ts">
const slides = [
  {
    label: 'Electronics',
    icon: 'i-lucide-cpu',
    from: '#1a3a5c',
    to: '#0d2137',
    accent: '#3b9eff',
    products: ['Wireless Headphones', 'USB-C Hub', 'Smart Watch', 'Laptop Stand'],
  },
  {
    label: 'Fashion & Apparel',
    icon: 'i-lucide-shirt',
    from: '#3a1a5c',
    to: '#210d37',
    accent: '#a855f7',
    products: ['Summer Dresses', 'Running Shoes', 'Leather Bags', 'Sunglasses'],
  },
  {
    label: 'Food & Beverage',
    icon: 'i-lucide-coffee',
    from: '#3a2a0d',
    to: '#1f1507',
    accent: '#f59e0b',
    products: ['Specialty Coffee', 'Organic Teas', 'Protein Bars', 'Artisan Sauces'],
  },
  {
    label: 'Sports & Fitness',
    icon: 'i-lucide-dumbbell',
    from: '#0d3a1a',
    to: '#071f0d',
    accent: '#22c55e',
    products: ['Yoga Mats', 'Resistance Bands', 'Water Bottles', 'Gym Gloves'],
  },
  {
    label: 'Beauty & Wellness',
    icon: 'i-lucide-sparkles',
    from: '#3a1a2a',
    to: '#210d18',
    accent: '#f472b6',
    products: ['Serums & Toners', 'Essential Oils', 'Face Masks', 'Hair Care'],
  },
  {
    label: 'Hobby & Collectibles',
    icon: 'i-lucide-gamepad-2',
    from: '#0d2a3a',
    to: '#07151f',
    accent: '#06b6d4',
    products: ['Trading Cards', 'Board Games', 'Scale Models', 'Art Supplies'],
  },
]

const current = ref(0)
const direction = ref(1)
let timer: ReturnType<typeof setInterval>

function goTo(index: number) {
  direction.value = index > current.value ? 1 : -1
  current.value = index
}

onMounted(() => {
  timer = setInterval(() => {
    current.value = (current.value + 1) % slides.length
  }, 3200)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="relative">
    <!-- Slide container -->
    <div class="relative h-72 rounded-2xl overflow-hidden">
      <Transition name="carousel">
        <div
          :key="current"
          class="absolute inset-0 p-8 flex gap-8 items-center"
          :style="{ background: `linear-gradient(135deg, ${slides[current]!.from}, ${slides[current]!.to})` }"
        >
          <!-- Left: icon + label -->
          <div class="flex flex-col items-center gap-3 shrink-0 w-36">
            <div
              class="w-20 h-20 rounded-2xl flex items-center justify-center"
              :style="{ background: `${slides[current]!.accent}20`, border: `1px solid ${slides[current]!.accent}30` }"
            >
              <UIcon :name="slides[current]!.icon" class="size-10" :style="{ color: slides[current]!.accent }" />
            </div>
            <span class="text-white font-semibold text-center text-sm leading-tight">
              {{ slides[current]!.label }}
            </span>
          </div>

          <!-- Divider -->
          <div class="w-px h-full opacity-10 bg-white" />

          <!-- Right: example products -->
          <div class="flex-1 space-y-2.5">
            <p class="text-white/40 text-xs uppercase tracking-wider mb-3">Example products</p>
            <div
              v-for="(product, i) in slides[current]!.products"
              :key="product"
              class="flex items-center gap-3"
              :style="{ animationDelay: `${i * 80}ms` }"
            >
              <div
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :style="{ background: slides[current]!.accent }"
              />
              <span class="text-white/70 text-sm">{{ product }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Dots -->
    <div class="flex justify-center gap-2 mt-5">
      <button
        v-for="(_, i) in slides"
        :key="i"
        class="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
        :style="{
          width: current === i ? '24px' : '6px',
          background: current === i ? '#818CF8' : 'rgba(255,255,255,0.2)',
        }"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.carousel-enter-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.carousel-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
  position: absolute;
  inset: 0;
}
.carousel-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.carousel-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}
</style>
