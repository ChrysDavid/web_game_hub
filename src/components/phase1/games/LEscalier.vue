<script setup lang="ts">
import { computed, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { STAIRS } from '@/games/phase1/content'
import { ROBOTS } from '@/games/phase1/robots'
import { opennessPair, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const game = phase1Game('escalier')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
// Marches deja montees : la question affichee est celle de la marche suivante.
const climbed = ref(0)
const { progress, robotsReach, reset } = useGroup()

const question = computed(() => STAIRS[climbed.value] ?? '')

function start() {
  reset()
  climbed.value = 0
  phase.value = 'play'
  robotsReach(1, 1500, 4500)
}

function climb() {
  climbed.value++
  if (climbed.value >= STAIRS.length) {
    setTimeout(() => (phase.value = 'result'), 600)
    return
  }
  robotsReach(climbed.value + 1, 1500, 4500)
}

function stop() {
  phase.value = 'result'
}

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => ({
    robot,
    score: opennessPair(climbed.value, robot.openness, STAIRS.length),
    detail: `${robot.name} est monté(e) de ${robot.openness} marche${robot.openness > 1 ? 's' : ''} · toi de ${climbed.value}`,
  })),
)
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="climbed"
    :total="STAIRS.length"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div class="stairs">
      <div
        v-for="(q, i) in STAIRS"
        :key="i"
        class="step"
        :class="{ 'step--done': i < climbed, 'step--next': i === climbed }"
        :style="{ '--i': i }"
      >
        <span class="step-n">{{ i + 1 }}</span>
      </div>
      <span class="walker" :style="{ '--i': climbed }">🧍</span>
    </div>

    <div v-if="climbed < STAIRS.length" :key="climbed" class="question">
      <p class="level">Marche {{ climbed + 1 }}</p>
      <p class="text">{{ question }}</p>
      <p class="hint">Tu serais prêt à y répondre à quelqu'un de ton groupe ?</p>
      <div class="buttons">
        <button class="up" @click="climb">Je monte ⬆</button>
        <button class="stop" @click="stop">Je m'arrête ici</button>
      </div>
    </div>
    <p v-else class="top">Tout en haut ! 🎉</p>

    <template #mine>
      <p class="big">{{ climbed }} marche{{ climbed > 1 ? 's' : '' }} sur {{ STAIRS.length }}</p>
      <p class="last" v-if="climbed > 0">Dernière question acceptée : « {{ STAIRS[climbed - 1] }} »</p>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.stairs {
  position: relative;
  height: 200px;
  margin-bottom: 16px;
}

.step {
  position: absolute;
  left: calc(var(--i) * 15%);
  bottom: 0;
  width: 16%;
  height: calc(28px + var(--i) * 26px);
  border-radius: 8px 8px 0 0;
  background: #eadfd3;
  display: flex;
  justify-content: center;
  padding-top: 6px;
  transition: background 0.3s;
}

.step--done {
  background: var(--accent);
}

.step--next {
  background: color-mix(in srgb, var(--accent) 35%, #eadfd3);
}

.step-n {
  font-size: 12px;
  font-weight: 800;
  color: white;
}

.walker {
  position: absolute;
  font-size: 34px;
  left: calc(var(--i) * 15% + 1%);
  bottom: calc(var(--i) * 26px + 4px);
  transition:
    left 0.5s ease,
    bottom 0.5s cubic-bezier(0.3, 1.5, 0.5, 1);
}

.question {
  padding: 20px;
  border-radius: 22px;
  background: white;
  border: 1px solid #eadfd3;
  animation: enter 0.3s ease-out;
}

.level {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
}

.text {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  margin: 6px 0 8px;
}

.hint {
  font-size: 13px;
  color: #6d6168;
  margin-bottom: 14px;
}

.buttons {
  display: flex;
  gap: 10px;
}

.up,
.stop {
  flex: 1;
  min-height: 52px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
}

.up {
  border: none;
  background: var(--accent);
  color: white;
}

.stop {
  border: 2px solid #eadfd3;
  background: white;
  color: #1e1a1d;
}

.top {
  text-align: center;
  font-size: 22px;
  font-weight: 800;
}

.big {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 6px;
}

.last {
  font-size: 13px;
  color: #6d6168;
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}
</style>
