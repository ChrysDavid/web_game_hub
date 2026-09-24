<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { CardBox, FlightOptions } from '@/games/pioche/flight'
import PlayingCard from './PlayingCard.vue'

interface Flight extends FlightOptions {
  id: number
  resolve: () => void
}

// Carte de reference animee : seules transform/opacity bougent (fluide meme sur petit telephone).
const BASE_W = 100
const flights = ref<Flight[]>([])
const elements = new Map<number, HTMLElement>()
let nextId = 1

function transformOf(box: CardBox, faceUp: boolean, extraScale = 1) {
  const x = box.x - BASE_W / 2
  const y = box.y - (BASE_W * 1.4) / 2
  return (
    `translate3d(${x}px, ${y}px, 0) rotate(${box.rot ?? 0}deg) scale(${(box.w / BASE_W) * extraScale}) ` +
    `rotateX(${box.tilt ?? 0}deg) rotateY(${faceUp ? 0 : 180}deg)`
  )
}

function run(flight: Flight, el: HTMLElement) {
  const { from, to, lift = 50 } = flight
  const mid: CardBox = {
    x: (from.x + to.x) / 2,
    y: Math.min(from.y, to.y) - lift,
    w: Math.max(from.w, to.w),
    rot: ((from.rot ?? 0) + (to.rot ?? 0)) / 2,
    tilt: 0,
  }
  // A mi-course la carte est "debout" (rotateY 90) quand elle se retourne : on garde un angle
  // intermediaire pour que le retournement se voie clairement.
  const flips = flight.faceUpFrom !== flight.faceUpTo
  const midTransform = flips
    ? transformOf(mid, true, 1.12).replace(/rotateY\([^)]*\)/, 'rotateY(90deg)')
    : transformOf(mid, flight.faceUpTo, 1.12)

  const animation = el.animate(
    [
      { transform: transformOf(from, flight.faceUpFrom) },
      { transform: midTransform, offset: 0.5 },
      { transform: transformOf(to, flight.faceUpTo) },
    ],
    { duration: flight.duration ?? 520, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)', fill: 'forwards' },
  )
  animation.onfinish = () => {
    flight.resolve()
    // On retire la carte volante une fois la vraie carte affichee a l'arrivee (pas de clignotement).
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        flights.value = flights.value.filter((f) => f.id !== flight.id)
        elements.delete(flight.id)
      }),
    )
  }
}

function fly(options: FlightOptions): Promise<void> {
  return new Promise((resolve) => {
    const flight: Flight = { ...options, id: nextId++, resolve }
    flights.value.push(flight)
    void nextTick(() => {
      const el = elements.get(flight.id)
      if (el) run(flight, el)
      else resolve()
    })
  })
}

function bind(id: number, el: unknown) {
  if (el instanceof HTMLElement) elements.set(id, el)
}

defineExpose({ fly })
</script>

<template>
  <div class="flight-layer" aria-hidden="true">
    <div
      v-for="f in flights"
      :key="f.id"
      :ref="(el) => bind(f.id, el)"
      class="flight"
      :style="{ transform: transformOf(f.from, f.faceUpFrom) }"
    >
      <PlayingCard class="side side--front" :card="f.card" />
      <PlayingCard class="side side--back" face-down />
    </div>
  </div>
</template>

<style scoped>
.flight-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  perspective: 1100px;
  z-index: 40;
}

.flight {
  --card-w: 100px;
  position: absolute;
  left: 0;
  top: 0;
  width: 100px;
  height: 140px;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  will-change: transform;
}

.side {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.side--back {
  transform: rotateY(180deg);
}
</style>
