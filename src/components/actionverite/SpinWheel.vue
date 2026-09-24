<script setup lang="ts">
import { computed, ref } from 'vue'
import { playSound } from '@/services/sound'

interface WheelSlice {
  label: string
  emoji: string
  color: string
}

const props = withDefaults(defineProps<{ slices: WheelSlice[]; size?: number }>(), { size: 280 })

const SPIN_MS = 4200
const rotation = ref(0)
const spinning = ref(false)

const sliceAngle = computed(() => 360 / props.slices.length)
const background = computed(() => {
  const stops = props.slices.map((s, i) => `${s.color} ${i * sliceAngle.value}deg ${(i + 1) * sliceAngle.value}deg`)
  return `conic-gradient(${stops.join(', ')})`
})

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** "Clics" de la roue : rapides au debut, de plus en plus espaces jusqu'a l'arret. */
async function ticks() {
  let delay = 55
  let elapsed = 0
  while (elapsed < SPIN_MS - 200) {
    playSound('pawnStep', 0.35)
    await wait(delay)
    elapsed += delay
    delay *= 1.09
  }
}

/** Fait tourner la roue pour s'arreter sur la part `index` (sous le repere, en haut). */
async function spin(index: number) {
  if (spinning.value) return
  spinning.value = true
  const center = index * sliceAngle.value + sliceAngle.value / 2
  const current = ((rotation.value % 360) + 360) % 360
  const jitter = (Math.random() - 0.5) * sliceAngle.value * 0.6
  const delta = (((-center - current + jitter) % 360) + 360) % 360
  rotation.value += 360 * 5 + delta
  void ticks()
  await wait(SPIN_MS)
  playSound('cardPlace')
  spinning.value = false
}

defineExpose({ spin, spinning })
</script>

<template>
  <div class="wheel-wrap" :style="{ width: `${size}px`, height: `${size}px` }">
    <span class="pointer" aria-hidden="true" />
    <div
      class="wheel"
      :style="{
        background,
        transform: `rotate(${rotation}deg)`,
        transitionDuration: `${SPIN_MS}ms`,
      }"
    >
      <span
        v-for="(s, i) in slices"
        :key="i"
        class="slice-label"
        :style="{ transform: `rotate(${i * sliceAngle + sliceAngle / 2}deg) translateY(-${size * 0.33}px)` }"
      >
        <span class="slice-emoji">{{ s.emoji }}</span>
        <span class="slice-text">{{ s.label }}</span>
      </span>
    </div>
    <span class="hub" aria-hidden="true">?</span>
  </div>
</template>

<style scoped>
.wheel-wrap {
  position: relative;
  margin: 0 auto;
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 8px solid #fbf7f2;
  box-shadow:
    0 0 0 3px #1e1a1d,
    0 16px 40px rgba(30, 26, 29, 0.25);
  position: relative;
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.8, 0.18, 1);
  will-change: transform;
}

.slice-label {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 70px;
  margin: -22px 0 0 -35px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.slice-emoji {
  font-size: 22px;
}

.slice-text {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.pointer {
  position: absolute;
  top: -14px;
  left: 50%;
  z-index: 2;
  width: 0;
  height: 0;
  margin-left: -14px;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 26px solid #1e1a1d;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 54px;
  height: 54px;
  margin: -27px 0 0 -27px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fbf7f2;
  border: 3px solid #1e1a1d;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
}
</style>
