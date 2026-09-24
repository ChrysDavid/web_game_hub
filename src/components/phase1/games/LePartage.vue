<script setup lang="ts">
import { computed, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { CONFLICT_LABEL, MANGOES, conflictFromOffer } from '@/games/phase1/content'
import { ROBOTS, type ConflictStyle } from '@/games/phase1/robots'
import { conflictPair, dominantStyle, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const STYLE_ORDER: ConflictStyle[] = ['cooperer', 'ceder', 'imposer']
const ROUNDS = 3

const game = phase1Game('le-partage')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
const round = ref(0)
const kept = ref(6)
const choices = ref<ConflictStyle[]>([])
const partnerSays = ref('')
const busy = ref(false)
const { progress, robotsReach, reset } = useGroup()

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function start() {
  reset()
  round.value = 0
  kept.value = 6
  choices.value = []
  partnerSays.value = `On a ${MANGOES} mangues à partager. Tu proposes combien pour toi ?`
  phase.value = 'play'
  robotsReach(1, 3000, 8000)
}

async function next(style: ConflictStyle, reply: string) {
  if (busy.value) return
  busy.value = true
  choices.value.push(style)
  partnerSays.value = reply
  await wait(1500)
  busy.value = false
  if (round.value + 1 >= ROUNDS) {
    phase.value = 'result'
    return
  }
  round.value++
  robotsReach(round.value + 1, 2000, 7000)
  partnerSays.value =
    round.value === 1
      ? 'Finalement, je propose : 8 pour moi, 4 pour toi. D’accord ?'
      : 'Aïe, une mangue est abîmée ! Qui la prend ?'
}

function proposeSplit() {
  const style = conflictFromOffer(kept.value)
  const reply =
    style === 'imposer'
      ? `${kept.value} pour toi ? Ça ne me laisse presque rien… 😕`
      : style === 'ceder'
        ? `Seulement ${kept.value} pour toi ? C’est très gentil 😊`
        : `${kept.value} pour toi, ${MANGOES - kept.value} pour moi. Ça me va 👍`
  void next(style, reply)
}

const myStyle = computed(() => dominantStyle(choices.value, STYLE_ORDER))

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => ({
    robot,
    score: conflictPair(myStyle.value, robot.conflict),
    detail: `${robot.name} ${CONFLICT_LABEL[robot.conflict].toLowerCase()} · toi, tu ${CONFLICT_LABEL[myStyle.value].toLowerCase()}s`,
  })),
)
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="choices.length"
    :total="ROUNDS"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div class="table">
      <div class="mangoes">
        <span
          v-for="i in MANGOES"
          :key="i"
          class="mango"
          :class="{ 'mango--mine': round === 0 && i <= kept, 'mango--bad': round === 2 && i === MANGOES }"
          >🥭</span
        >
      </div>
      <div class="partner">
        <span class="partner-avatar">🙂</span>
        <p class="speech">{{ partnerSays }}</p>
      </div>
      <small class="simulated">Partenaire simulé</small>
    </div>

    <div v-if="!busy" class="controls">
      <template v-if="round === 0">
        <label class="slider-label">
          Tu gardes <b>{{ kept }}</b> mangue{{ kept > 1 ? 's' : '' }}, ton partenaire <b>{{ MANGOES - kept }}</b>
          <input v-model.number="kept" type="range" min="0" :max="MANGOES" step="1" />
        </label>
        <button class="primary" @click="proposeSplit">Proposer</button>
      </template>
      <template v-else-if="round === 1">
        <button class="option" @click="next('ceder', 'Super, merci ! 😄')">D’accord, 4 pour moi</button>
        <button class="option" @click="next('cooperer', 'Tu as raison, 6 chacun c’est juste 🤝')">
          Je propose 6 chacun
        </button>
        <button class="option" @click="next('imposer', 'Bon… si tu insistes 😒')">Non : c’est moi qui en prends 8</button>
      </template>
      <template v-else>
        <button class="option" @click="next('ceder', 'Merci, c’est sympa de ta part !')">Je la prends</button>
        <button class="option" @click="next('cooperer', 'Bonne idée, on partage la perte 🙂')">
          On la coupe en deux
        </button>
        <button class="option" @click="next('imposer', 'Hmm… d’accord, je la prends.')">Prends-la, toi</button>
      </template>
    </div>

    <template #mine>
      <p class="big">Tu {{ CONFLICT_LABEL[myStyle].toLowerCase() }}s</p>
      <p class="rounds">
        <span v-for="(c, i) in choices" :key="i" class="round-chip">Manche {{ i + 1 }} : {{ CONFLICT_LABEL[c] }}</span>
      </p>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.table {
  padding: 16px;
  border-radius: 24px;
  background: linear-gradient(180deg, #f3e7d6, #e9d7bf);
  margin-bottom: 16px;
}

.mangoes {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}

.mango {
  font-size: 30px;
  text-align: center;
  opacity: 0.55;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.mango--mine {
  opacity: 1;
  transform: scale(1.12);
}

.mango--bad {
  opacity: 1;
  filter: grayscale(0.9) brightness(0.7);
}

.partner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.partner-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: white;
  font-size: 22px;
  flex-shrink: 0;
}

.speech {
  padding: 10px 14px;
  border-radius: 4px 16px 16px 16px;
  background: white;
  font-size: 15px;
  animation: pop 0.3s ease-out;
}

.simulated {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: #6d6168;
  text-align: right;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slider-label {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
  font-size: 15px;
}

.slider-label input {
  accent-color: var(--accent);
  height: 32px;
}

.primary {
  min-height: 52px;
  border: none;
  border-radius: 16px;
  background: var(--accent);
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
}

.option {
  min-height: 54px;
  padding: 12px 16px;
  border-radius: 16px;
  border: 2px solid #eadfd3;
  background: white;
  font-size: 15px;
  text-align: left;
  color: #1e1a1d;
  cursor: pointer;
}

.big {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
}

.rounds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.round-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fbf7f2;
  font-size: 12px;
  font-weight: 700;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}
</style>
