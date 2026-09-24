<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { DILEMMAS, DILEMMA_SECONDS } from '@/games/phase1/content'
import { robotDilemmas } from '@/games/phase1/robotAnswers'
import { ROBOTS } from '@/games/phase1/robots'
import { sameAnswers, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const game = phase1Game('tu-preferes')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
const index = ref(0)
// "-" = pas de reponse a temps : ne compte jamais comme un point commun.
const answers = ref<string[]>([])
const secondsLeft = ref(DILEMMA_SECONDS)
const picked = ref<'a' | 'b' | null>(null)
const { progress, robotsReach, reset } = useGroup()
let timer: ReturnType<typeof setInterval> | undefined

const current = computed(() => DILEMMAS[index.value]!)

function start() {
  reset()
  index.value = 0
  answers.value = []
  phase.value = 'play'
  nextQuestion()
}

function nextQuestion() {
  picked.value = null
  secondsLeft.value = DILEMMA_SECONDS
  robotsReach(index.value + 1, 700, DILEMMA_SECONDS * 700)
  clearInterval(timer)
  timer = setInterval(() => {
    secondsLeft.value--
    if (secondsLeft.value <= 0) answer(null)
  }, 1000)
}

function answer(choice: 'a' | 'b' | null) {
  if (picked.value) return
  clearInterval(timer)
  picked.value = choice ?? 'a'
  answers.value.push(choice ?? '-')
  setTimeout(() => {
    if (index.value + 1 >= DILEMMAS.length) {
      phase.value = 'result'
      return
    }
    index.value++
    nextQuestion()
  }, choice ? 450 : 150)
}

onBeforeUnmount(() => clearInterval(timer))

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => {
    const theirs = robotDilemmas(robot)
    const same = answers.value.filter((a, i) => a === theirs[i]).length
    return {
      robot,
      score: sameAnswers(answers.value, theirs),
      detail: `${same} choix sur ${DILEMMAS.length} en commun`,
    }
  }),
)
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="index + (picked ? 1 : 0)"
    :total="DILEMMAS.length"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div class="question">
      <p class="count">{{ index + 1 }} / {{ DILEMMAS.length }}</p>
      <h2>Tu préfères…</h2>
      <div class="timer" :class="{ 'timer--low': secondsLeft <= 2 }">{{ secondsLeft }}</div>
    </div>
    <div class="choices">
      <button
        class="choice"
        :class="{ 'choice--picked': picked === 'a', 'choice--other': picked === 'b' }"
        @click="answer('a')"
      >
        <span class="emoji">{{ current.a.emoji }}</span>
        {{ current.a.label }}
      </button>
      <span class="or">ou</span>
      <button
        class="choice"
        :class="{ 'choice--picked': picked === 'b', 'choice--other': picked === 'a' }"
        @click="answer('b')"
      >
        <span class="emoji">{{ current.b.emoji }}</span>
        {{ current.b.label }}
      </button>
    </div>

    <template #mine>
      <ul class="recap">
        <li v-for="(d, i) in DILEMMAS" :key="d.id">
          <span>{{ answers[i] === 'a' ? d.a.emoji : answers[i] === 'b' ? d.b.emoji : '⏳' }}</span>
          {{ answers[i] === 'a' ? d.a.label : answers[i] === 'b' ? d.b.label : 'Pas de réponse' }}
        </li>
      </ul>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.question {
  text-align: center;
  margin-bottom: 18px;
}

.count {
  font-size: 13px;
  font-weight: 700;
  color: #6d6168;
}

.question h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 28px;
  margin: 4px 0 10px;
}

.timer {
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: white;
  border: 3px solid var(--accent);
  font-weight: 800;
  transition: transform 0.2s;
}

.timer--low {
  color: #c2185b;
  border-color: #c2185b;
  transform: scale(1.12);
}

.choices {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 130px;
  padding: 18px;
  border-radius: 22px;
  border: 2px solid transparent;
  background: white;
  box-shadow: 0 6px 18px rgba(30, 26, 29, 0.08);
  font-size: 18px;
  font-weight: 700;
  color: #1e1a1d;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease,
    border-color 0.2s ease;
}

.choice:active {
  transform: scale(0.97);
}

.choice--picked {
  border-color: var(--accent);
  transform: scale(1.03);
}

.choice--other {
  opacity: 0.35;
}

.emoji {
  font-size: 44px;
}

.or {
  align-self: center;
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  color: #6d6168;
}

.recap {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.recap span {
  display: inline-block;
  width: 26px;
}
</style>
