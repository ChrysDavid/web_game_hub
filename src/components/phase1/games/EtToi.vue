<script setup lang="ts">
import { computed, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { SITUATIONS } from '@/games/phase1/content'
import { robotSituations } from '@/games/phase1/robotAnswers'
import { ROBOTS, shuffled } from '@/games/phase1/robots'
import { sameAnswers, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const game = phase1Game('et-toi')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
const index = ref(0)
const answers = ref<string[]>([])
const picked = ref<string | null>(null)
const { progress, robotsReach, reset } = useGroup()

const situation = computed(() => SITUATIONS[index.value]!)
const options = computed(() => shuffled(situation.value.options))

function start() {
  reset()
  index.value = 0
  answers.value = []
  picked.value = null
  phase.value = 'play'
  robotsReach(1, 1500, 5000)
}

function choose(id: string) {
  if (picked.value) return
  picked.value = id
  answers.value.push(id)
  setTimeout(() => {
    picked.value = null
    if (index.value + 1 >= SITUATIONS.length) {
      phase.value = 'result'
      return
    }
    index.value++
    robotsReach(index.value + 1, 1500, 5000)
  }, 420)
}

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => {
    const theirs = robotSituations(robot)
    const same = answers.value.filter((a, i) => a === theirs[i]).length
    return {
      robot,
      score: sameAnswers(answers.value, theirs),
      detail: `Même réaction dans ${same} situation${same > 1 ? 's' : ''} sur ${SITUATIONS.length}`,
    }
  }),
)

function answerText(i: number) {
  return SITUATIONS[i]!.options.find((o) => o.id === answers.value[i])?.text ?? ''
}
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="answers.length"
    :total="SITUATIONS.length"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div :key="situation.id" class="situation">
      <p class="count">Situation {{ index + 1 }} / {{ SITUATIONS.length }}</p>
      <p class="text">{{ situation.text }}</p>
    </div>
    <div class="options">
      <button
        v-for="o in options"
        :key="o.id"
        class="option"
        :class="{ 'option--picked': picked === o.id }"
        @click="choose(o.id)"
      >
        {{ o.text }}
      </button>
    </div>

    <template #mine>
      <ol class="recap">
        <li v-for="(s, i) in SITUATIONS" :key="s.id">
          <span class="q">{{ s.text }}</span>
          <span class="a">→ {{ answerText(i) }}</span>
        </li>
      </ol>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.situation {
  padding: 22px 20px;
  border-radius: 24px;
  background: #1f2a44;
  color: white;
  margin-bottom: 16px;
  animation: enter 0.3s ease-out;
}

.count {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.7;
  margin-bottom: 8px;
}

.text {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  line-height: 1.3;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  min-height: 56px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 2px solid #eadfd3;
  background: white;
  font-size: 15px;
  text-align: left;
  color: #1e1a1d;
  cursor: pointer;
  transition:
    border-color 0.2s,
    transform 0.2s;
}

.option--picked {
  border-color: var(--accent);
  transform: scale(1.02);
}

.recap {
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.q {
  display: block;
  color: #6d6168;
}

.a {
  font-weight: 700;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
</style>
