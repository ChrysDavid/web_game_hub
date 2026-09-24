<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ANIMALS, HEARTS, MISSION_SECONDS, SPEARS, huntReward, pickAnimal, type AnimalKind } from '@/games/refuge/missions'
import { playSound } from '@/services/sound'

/** Mission "La chasse" : toucher le gibier, eviter le serpent, repousser buffle et panthere. */
const emit = defineEmits<{ done: [result: { meat: number; coins: number; dead: boolean }] }>()

interface Beast {
  id: number
  kind: AnimalKind
  x: number
  y: number
  dir: number
  hits: number
  born: number
  life: number
}

const beasts = ref<Beast[]>([])
const floats = ref<{ id: number; x: number; y: number; text: string }[]>([])
const state = reactive({ meat: 0, hearts: HEARTS, spears: SPEARS, left: MISSION_SECONDS, over: false, dead: false, hurt: false })
let nextId = 1
let raf = 0
let last = 0
let spawnIn = 600
let spearIn = 3500
let startedAt = 0
let clock: ReturnType<typeof setInterval> | undefined

function float(x: number, y: number, text: string) {
  const id = nextId++
  floats.value.push({ id, x, y, text })
  setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== id)), 900)
}

function spawn(now: number) {
  const kind = pickAnimal((now - startedAt) / 1000, Math.random)
  const fromLeft = Math.random() < 0.5
  const b: Beast = { id: nextId++, kind, x: fromLeft ? -8 : 108, y: 30 + Math.random() * 50, dir: fromLeft ? 1 : -1, hits: ANIMALS[kind].hits, born: now, life: 0 }
  if (kind === 'serpent') Object.assign(b, { x: 10 + Math.random() * 80, y: 55 + Math.random() * 35, life: 3200 })
  if (kind === 'buffle') Object.assign(b, { x: 20 + Math.random() * 60, y: 22, life: 3600 })
  if (kind === 'panthere') Object.assign(b, { x: Math.random() < 0.5 ? 12 : 88, y: 40 + Math.random() * 30, life: 1700 })
  beasts.value.push(b)
}

function hurt(text: string) {
  state.hearts--
  state.hurt = true
  setTimeout(() => (state.hurt = false), 350)
  playSound('pawnCapture')
  float(50, 50, text)
  if (state.hearts <= 0) finish(true)
}

function loop(now: number) {
  if (state.over) return
  const dt = last ? now - last : 16
  last = now
  spawnIn -= dt
  if (spawnIn <= 0) {
    spawn(now)
    spawnIn = Math.max(450, 1150 - (now - startedAt) / 60)
  }
  spearIn -= dt
  if (spearIn <= 0) {
    state.spears = Math.min(SPEARS, state.spears + 1)
    spearIn = 3500
  }
  const keep: Beast[] = []
  for (const b of beasts.value) {
    const age = now - b.born
    const info = ANIMALS[b.kind]
    if (!info.danger) {
      b.x += (b.dir * info.speed * dt) / 1000 / 6
      if (b.x > -12 && b.x < 112) keep.push(b)
      continue
    }
    if (b.kind === 'buffle') b.y = 22 + (age / b.life) * 66
    if (age >= b.life) {
      if (b.kind === 'buffle') hurt('💥 Le buffle t’a chargé !')
      if (b.kind === 'panthere') hurt('🐆 La panthère t’a griffé !')
      continue
    }
    keep.push(b)
  }
  beasts.value = keep
  raf = requestAnimationFrame(loop)
}

function throwAt(b: Beast | null, e: PointerEvent) {
  if (state.over) return
  if (b?.kind === 'serpent') {
    beasts.value = beasts.value.filter((x) => x.id !== b.id)
    hurt('🐍 Le serpent t’a mordu !')
    return
  }
  if (state.spears <= 0) {
    float(50, 90, 'Plus de lances… attends un peu')
    return
  }
  state.spears--
  playSound('cardSlide', 0.6)
  if (!b) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    float(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100, 'raté')
    return
  }
  b.hits--
  if (b.hits > 0) {
    float(b.x, b.y, `encore ${b.hits}`)
    return
  }
  beasts.value = beasts.value.filter((x) => x.id !== b.id)
  const info = ANIMALS[b.kind]
  if (info.meat > 0) {
    state.meat += info.meat
    playSound('pawnHome', 0.6)
    float(b.x, b.y, `+${info.meat} 🍖`)
  } else {
    playSound('pawnCapture', 0.6)
    float(b.x, b.y, b.kind === 'buffle' ? 'Le buffle fuit !' : 'La panthère recule !')
  }
}

function finish(dead: boolean) {
  if (state.over) return
  state.over = true
  state.dead = dead
  cancelAnimationFrame(raf)
  clearInterval(clock)
}

const reward = computed(() => huntReward(state.meat, state.dead))

function scale(b: Beast) {
  if (b.kind === 'buffle') return 0.6 + ((performance.now() - b.born) / b.life) * 1.9
  return 1
}

onMounted(() => {
  startedAt = performance.now()
  raf = requestAnimationFrame(loop)
  clock = setInterval(() => {
    state.left--
    if (state.left <= 0) finish(false)
  }, 1000)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearInterval(clock)
})
</script>

<template>
  <div class="hunt" :class="{ hurt: state.hurt }">
    <header class="bar">
      <span>{{ '❤️'.repeat(state.hearts) }}{{ '🖤'.repeat(HEARTS - state.hearts) }}</span>
      <span>🍖 {{ state.meat }}</span>
      <span>🗡️ {{ state.spears }}</span>
      <span class="time">⏱ {{ state.left }}s</span>
    </header>

    <div class="savanna" @pointerdown.self="throwAt(null, $event)">
      <span class="tuft" v-for="i in 14" :key="i" :style="{ left: `${(i * 37) % 100}%`, top: `${55 + ((i * 23) % 40)}%` }">🌿</span>
      <button
        v-for="b in beasts"
        :key="b.id"
        class="beast"
        :class="[b.kind, { flip: b.dir < 0 }]"
        :style="{ left: `${b.x}%`, top: `${b.y}%`, '--s': scale(b) }"
        @pointerdown.stop="throwAt(b, $event)"
      >
        {{ ANIMALS[b.kind].emoji }}
      </button>
      <span v-for="f in floats" :key="f.id" class="float" :style="{ left: `${f.x}%`, top: `${f.y}%` }">{{ f.text }}</span>
    </div>

    <p class="rules">Touche le gibier 🦌🐗🐦. Ne touche pas le serpent 🐍. Repousse le buffle 🐃 (3 coups) et la panthère 🐆 (2 coups) avant qu’ils t’atteignent.</p>

    <div v-if="state.over" class="end">
      <div class="end-card">
        <h2>{{ state.dead ? 'Tu as dû fuir…' : 'Belle chasse !' }}</h2>
        <p v-if="state.dead">Blessé, tu n’as pu sauver que la moitié de ta viande.</p>
        <p class="big">🍖 {{ reward.meat }} → 💰 {{ reward.coins }} F</p>
        <button class="primary" @click="emit('done', { ...reward, dead: state.dead })">Rapporter au refuge</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hunt {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #2b3a1a;
  touch-action: none;
}

.hunt.hurt::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(220, 30, 30, 0.35);
  pointer-events: none;
}

.bar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-weight: 800;
  font-size: 16px;
}

.time {
  color: #ffd35c;
}

.savanna {
  position: relative;
  flex: 1;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 0%, #ffcf7a 0%, transparent 55%),
    linear-gradient(180deg, #f4b35e 0%, #e9c27a 28%, #b9a24f 30%, #8f8a3a 60%, #6d7a2e 100%);
}

.tuft {
  position: absolute;
  font-size: 26px;
  opacity: 0.85;
  pointer-events: none;
}

.beast {
  position: absolute;
  width: 72px;
  height: 72px;
  margin: -36px 0 0 -36px;
  border: none;
  background: none;
  font-size: 46px;
  line-height: 1;
  transform: scale(var(--s, 1));
  cursor: crosshair;
}

.beast.flip {
  transform: scale(var(--s, 1)) scaleX(-1);
}

.beast.serpent {
  font-size: 34px;
  opacity: 0.8;
}

.beast.panthere {
  animation: crouch 0.4s ease-in-out infinite alternate;
}

.beast.buffle {
  filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.4));
}

.float {
  position: absolute;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: 800;
  font-size: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  animation: up 0.9s ease-out forwards;
}

.rules {
  padding: 10px 14px calc(env(safe-area-inset-bottom, 0px) + 10px);
  background: rgba(0, 0, 0, 0.5);
  color: #fff4dc;
  font-size: 12px;
  text-align: center;
}

.end {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.end-card {
  width: min(360px, 100%);
  padding: 22px;
  border-radius: 22px;
  background: #fbf7f2;
  text-align: center;
}

.end-card h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 26px;
}

.end-card p {
  margin: 8px 0;
  color: #6d6168;
}

.end-card .big {
  font-size: 22px;
  font-weight: 800;
  color: #1e1a1d;
}

.primary {
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(90deg, #c2185b, #ff7a59);
  color: white;
  font-size: 16px;
  font-weight: 800;
}

@keyframes up {
  to {
    transform: translate(-50%, -160%);
    opacity: 0;
  }
}

@keyframes crouch {
  to {
    transform: translateY(4px) scale(1.08);
  }
}
</style>
