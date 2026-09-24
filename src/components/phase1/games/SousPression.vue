<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { ROBOTS } from '@/games/phase1/robots'
import { stabilityPair, stabilityScore, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const GOAL = 10
const DURATION = 20
// Le panier se renverse exprès a ce score : c'est l'echec injuste qu'on observe.
const SPILL_AT = 7
// Fenetre ou l'on compte les tapes "dans le vide" juste apres l'echec.
const RAGE_WINDOW_MS = 4000

const game = phase1Game('sous-pression')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
const caught = ref(0)
const timeLeft = ref(DURATION)
const heart = ref<{ id: number; x: number; y: number } | null>(null)
const spilled = ref(false)
const spillFlash = ref(false)
const ended = ref<'time' | 'won' | null>(null)
const reaction = ref({ rageTaps: 0, quit: false, retried: false })
const { progress, robotsReach, reset } = useGroup()

let spillAt = 0
let heartId = 0
let clock: ReturnType<typeof setInterval> | undefined
let spawner: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

function stopAll() {
  clearInterval(clock)
  clearTimeout(spawner)
  clearTimeout(hideTimer)
  heart.value = null
}

function spawn(delay = 950) {
  clearTimeout(spawner)
  spawner = setTimeout(() => {
    if (ended.value || phase.value !== 'play') return
    heart.value = { id: heartId++, x: 10 + Math.random() * 75, y: 8 + Math.random() * 72 }
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      heart.value = null
      spawn(250)
    }, 850)
  }, delay)
}

function start() {
  reset()
  stopAll()
  caught.value = 0
  timeLeft.value = DURATION
  spilled.value = false
  ended.value = null
  reaction.value = { rageTaps: 0, quit: false, retried: false }
  phase.value = 'play'
  robotsReach(1, 12000, 21000)
  clock = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) finish('time')
  }, 1000)
  spawn(700)
}

function catchHeart() {
  if (!heart.value || ended.value) return
  heart.value = null
  clearTimeout(hideTimer)
  caught.value++
  if (!spilled.value && caught.value === SPILL_AT) {
    // Echec injuste : tout est perdu, et le jeu fait une petite pause "surprise".
    spilled.value = true
    spillAt = Date.now()
    spillFlash.value = true
    setTimeout(() => {
      caught.value = 0
      spillFlash.value = false
    }, 900)
    spawn(1800)
    return
  }
  if (caught.value >= GOAL) {
    finish('won')
    return
  }
  spawn(420)
}

function tapEmpty() {
  if (!spilled.value || ended.value) return
  if (Date.now() - spillAt <= RAGE_WINDOW_MS) reaction.value.rageTaps++
}

function finish(kind: 'time' | 'won') {
  stopAll()
  ended.value = kind
  // Gagner malgre l'echec, c'est la meme attitude qu'un nouvel essai calme.
  if (kind === 'won') {
    reaction.value.retried = true
    phase.value = 'result'
  }
}

function quit() {
  stopAll()
  reaction.value.quit = true
  phase.value = 'result'
}

function afterFail(retry: boolean) {
  reaction.value.retried = retry
  phase.value = 'result'
}

onBeforeUnmount(stopAll)

const myScore = computed(() => stabilityScore(reaction.value))

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => ({
    robot,
    score: stabilityPair(myScore.value, robot.stability),
    detail: `Calme de ${robot.name} : ${robot.stability} / 100 · le tien : ${myScore.value} / 100`,
  })),
)
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="DURATION - timeLeft"
    :total="DURATION"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div class="hud">
      <span class="basket">🧺 {{ caught }} / {{ GOAL }}</span>
      <span class="clock" :class="{ 'clock--low': timeLeft <= 5 }">⏱ {{ timeLeft }} s</span>
    </div>

    <div class="field" :class="{ 'field--shake': spillFlash }" @pointerdown.self="tapEmpty">
      <button
        v-if="heart"
        :key="heart.id"
        class="heart"
        :style="{ left: `${heart.x}%`, top: `${heart.y}%` }"
        aria-label="Attraper le cœur"
        @pointerdown.stop="catchHeart"
      >
        ❤️
      </button>
      <div v-if="spillFlash" class="spill">Oh non ! Le panier s'est renversé…</div>

      <div v-if="ended === 'time'" class="end">
        <p>Temps écoulé : {{ caught }} / {{ GOAL }}</p>
        <button class="retry" @click="afterFail(true)">Réessayer</button>
        <button class="stop" @click="afterFail(false)">Arrêter là</button>
      </div>
    </div>

    <button v-if="!ended" class="quit" @click="quit">Abandonner</button>

    <template #mine>
      <p class="big">{{ myScore }} / 100</p>
      <ul class="facts">
        <li>Tapes dans le vide juste après le renversement : <b>{{ reaction.rageTaps }}</b></li>
        <li>Abandon en cours de route : <b>{{ reaction.quit ? 'oui' : 'non' }}</b></li>
        <li>Nouvel essai après l'échec : <b>{{ reaction.retried ? 'oui' : 'non' }}</b></li>
      </ul>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.hud {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 800;
}

.clock--low {
  color: #c2185b;
}

.field {
  position: relative;
  height: min(58vh, 440px);
  border-radius: 24px;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 122, 89, 0.12), transparent 60%),
    radial-gradient(circle at 80% 80%, rgba(31, 42, 68, 0.1), transparent 60%),
    white;
  border: 1px solid #eadfd3;
  overflow: hidden;
  touch-action: manipulation;
  user-select: none;
}

.field--shake {
  animation: shake 0.45s ease;
}

.heart {
  position: absolute;
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  border: none;
  background: none;
  font-size: 44px;
  cursor: pointer;
  animation: appear 0.2s ease-out;
}

.spill {
  position: absolute;
  inset: auto 16px 16px;
  padding: 12px;
  border-radius: 14px;
  background: #1f2a44;
  color: white;
  text-align: center;
  font-weight: 700;
}

.end {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(251, 247, 242, 0.94);
  font-weight: 800;
  font-size: 18px;
}

.retry,
.stop,
.quit {
  min-height: 48px;
  min-width: 180px;
  border-radius: 14px;
  font-weight: 800;
  cursor: pointer;
}

.retry {
  border: none;
  background: var(--accent);
  color: white;
}

.stop {
  border: 2px solid #eadfd3;
  background: white;
}

.quit {
  display: block;
  margin: 14px auto 0;
  border: none;
  background: none;
  color: #6d6168;
  text-decoration: underline;
}

.big {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 34px;
  font-weight: 700;
  margin-bottom: 8px;
}

.facts {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: #6d6168;
}

@keyframes appear {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
}

@keyframes shake {
  25% {
    transform: translateX(-8px) rotate(-1deg);
  }
  50% {
    transform: translateX(8px) rotate(1deg);
  }
  75% {
    transform: translateX(-5px);
  }
}
</style>
