<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { HOBBIES, HOBBY_SECONDS } from '@/games/phase1/content'
import { robotHobbies } from '@/games/phase1/robotAnswers'
import { ROBOTS } from '@/games/phase1/robots'
import { commonInterests, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const game = phase1Game('association-express')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
const index = ref(0)
const kept = ref<string[]>([])
const leaving = ref<'keep' | 'drop' | null>(null)
const timerKey = ref(0)
const { progress, robotsReach, reset } = useGroup()
let timer: ReturnType<typeof setTimeout> | undefined

const hobby = computed(() => HOBBIES[index.value]!)

function start() {
  reset()
  index.value = 0
  kept.value = []
  phase.value = 'play'
  show()
}

function show() {
  leaving.value = null
  timerKey.value++
  robotsReach(index.value + 1, 400, HOBBY_SECONDS * 1000)
  clearTimeout(timer)
  // Pas de choix a temps = jete : on garde seulement ce qu'on aime spontanement.
  timer = setTimeout(() => decide(false), HOBBY_SECONDS * 1000)
}

function decide(keep: boolean) {
  if (leaving.value) return
  clearTimeout(timer)
  leaving.value = keep ? 'keep' : 'drop'
  if (keep) kept.value.push(hobby.value.id)
  setTimeout(() => {
    if (index.value + 1 >= HOBBIES.length) {
      phase.value = 'result'
      return
    }
    index.value++
    show()
  }, 260)
}

onBeforeUnmount(() => clearTimeout(timer))

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => {
    const theirs = robotHobbies(robot)
    const common = HOBBIES.filter((h) => kept.value.includes(h.id) && theirs.includes(h.id))
    return {
      robot,
      score: commonInterests(kept.value, theirs),
      detail: common.length ? `En commun : ${common.map((h) => h.emoji).join(' ')}` : 'Aucune activité en commun',
    }
  }),
)
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="index + (leaving ? 1 : 0)"
    :total="HOBBIES.length"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div class="stage">
      <div :key="hobby.id" class="card" :class="leaving ? `card--${leaving}` : ''">
        <span class="emoji">{{ hobby.emoji }}</span>
        <span class="label">{{ hobby.label }}</span>
        <span :key="timerKey" class="countdown" :style="{ animationDuration: `${HOBBY_SECONDS}s` }" />
      </div>
    </div>
    <div class="buttons">
      <button class="drop" aria-label="Je jette" @click="decide(false)">✕</button>
      <button class="keep" aria-label="Je garde" @click="decide(true)">❤</button>
    </div>

    <template #mine>
      <p class="kept-title">Tu as gardé {{ kept.length }} activité{{ kept.length > 1 ? 's' : '' }} :</p>
      <p class="kept">
        <span v-for="h in HOBBIES.filter((x) => kept.includes(x.id))" :key="h.id" class="tag">{{ h.emoji }} {{ h.label }}</span>
      </p>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.stage {
  height: 300px;
  display: grid;
  place-items: center;
  margin-bottom: 20px;
}

.card {
  position: relative;
  width: min(80%, 280px);
  aspect-ratio: 3 / 4;
  border-radius: 28px;
  background: white;
  box-shadow: 0 14px 36px rgba(30, 26, 29, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  animation: enter 0.25s ease-out;
  transition:
    transform 0.26s ease,
    opacity 0.26s ease;
}

.card--keep {
  transform: translateX(120%) rotate(18deg);
  opacity: 0;
}

.card--drop {
  transform: translateX(-120%) rotate(-18deg);
  opacity: 0;
}

.emoji {
  font-size: 84px;
}

.label {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
}

.countdown {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 8px;
  width: 100%;
  background: var(--accent);
  transform-origin: left;
  animation: shrink linear forwards;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.drop,
.keep {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: none;
  font-size: 32px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(30, 26, 29, 0.15);
}

.drop {
  background: white;
  color: #6d6168;
}

.keep {
  background: #c2185b;
  color: white;
}

.drop:active,
.keep:active {
  transform: scale(0.92);
}

.kept-title {
  margin-bottom: 10px;
  font-weight: 700;
}

.kept {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 5px 10px;
  border-radius: 999px;
  background: #fbf7f2;
  font-size: 13px;
}

@keyframes shrink {
  to {
    transform: scaleX(0);
  }
}

@keyframes enter {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
}
</style>
