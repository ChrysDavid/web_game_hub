<script setup lang="ts">
import { computed, ref } from 'vue'
import { phase1Game } from '@/games/phase1/catalog'
import { ATTACHMENT_LABEL, SILENCE_SCENES } from '@/games/phase1/content'
import { robotSilence } from '@/games/phase1/robotAnswers'
import { ROBOTS, shuffled, type AttachmentStyle } from '@/games/phase1/robots'
import { attachmentPair, dominantStyle, type PairResult } from '@/games/phase1/scoring'
import { useGroup } from '@/games/phase1/useGroup'
import Phase1Shell from '../Phase1Shell.vue'

const STYLE_ORDER: AttachmentStyle[] = ['serein', 'anxieux', 'distant']

const game = phase1Game('pas-de-reponse')!
const phase = ref<'intro' | 'play' | 'result'>('intro')
const index = ref(0)
const choices = ref<AttachmentStyle[]>([])
// Petite mise en scene : le message part, "Vu", puis le temps passe avant de choisir.
const stage = ref<'typing' | 'seen' | 'later' | 'choose'>('typing')
const { progress, robotsReach, reset } = useGroup()

const scene = computed(() => SILENCE_SCENES[index.value]!)
// Les reponses ne sont jamais dans le meme ordre : pas de "bonne case" a retenir.
const options = computed(() => shuffled(scene.value.options))

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function playScene() {
  stage.value = 'typing'
  robotsReach(index.value + 1, 2500, 6000)
  await wait(700)
  stage.value = 'seen'
  await wait(900)
  stage.value = 'later'
  await wait(1100)
  stage.value = 'choose'
}

function start() {
  reset()
  index.value = 0
  choices.value = []
  phase.value = 'play'
  void playScene()
}

function choose(style: AttachmentStyle) {
  if (stage.value !== 'choose') return
  choices.value.push(style)
  if (index.value + 1 >= SILENCE_SCENES.length) {
    phase.value = 'result'
    return
  }
  index.value++
  void playScene()
}

const myStyle = computed(() => dominantStyle(choices.value, STYLE_ORDER))

const pairs = computed<PairResult[]>(() =>
  ROBOTS.map((robot) => {
    const theirStyle = dominantStyle(robotSilence(robot), STYLE_ORDER)
    return {
      robot,
      score: attachmentPair(myStyle.value, theirStyle),
      detail: `${robot.name} : ${ATTACHMENT_LABEL[theirStyle].toLowerCase()} · toi : ${ATTACHMENT_LABEL[myStyle.value].toLowerCase()}`,
    }
  }),
)

const counts = computed(() =>
  STYLE_ORDER.map((style) => ({ style, n: choices.value.filter((c) => c === style).length })),
)
</script>

<template>
  <Phase1Shell
    :game="game"
    :phase="phase"
    :step="choices.length"
    :total="SILENCE_SCENES.length"
    :group="progress"
    :pairs="pairs"
    @start="start"
    @replay="start"
  >
    <div class="phone">
      <div class="phone-head">
        <span class="contact-avatar">?</span>
        <span>{{ scene.who }}</span>
      </div>
      <div class="thread">
        <p v-for="(m, i) in scene.messages" :key="`${scene.id}-${i}`" class="bubble" :class="{ photo: m === '[photo]' }">
          {{ m === '[photo]' ? '🌅' : m }}
        </p>
        <p v-if="stage !== 'typing'" class="seen">{{ scene.seen }} ✓✓</p>
        <p v-if="stage === 'later' || stage === 'choose'" class="later">{{ scene.later }}</p>
      </div>
    </div>

    <Transition name="rise">
      <div v-if="stage === 'choose'" class="options">
        <p class="ask">Toujours pas de réponse. Tu fais quoi ?</p>
        <button v-for="o in options" :key="o.text" class="option" @click="choose(o.style)">{{ o.text }}</button>
      </div>
    </Transition>

    <template #mine>
      <p class="style">
        Ton style : <b>{{ ATTACHMENT_LABEL[myStyle] }}</b>
      </p>
      <div class="split">
        <div v-for="c in counts" :key="c.style" class="split-row">
          <span>{{ ATTACHMENT_LABEL[c.style] }}</span>
          <div class="split-bar"><i :style="{ width: `${(c.n / SILENCE_SCENES.length) * 100}%` }" /></div>
          <span>{{ c.n }}</span>
        </div>
      </div>
    </template>
  </Phase1Shell>
</template>

<style scoped>
.phone {
  border-radius: 26px;
  background: #ece5dd;
  padding: 0 0 16px;
  box-shadow: 0 10px 30px rgba(30, 26, 29, 0.12);
  overflow: hidden;
  margin-bottom: 16px;
}

.phone-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #1f2a44;
  color: white;
  font-size: 13px;
  font-weight: 700;
}

.contact-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #c2185b;
  flex-shrink: 0;
}

.thread {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  padding: 16px 14px 0;
  min-height: 170px;
}

.bubble {
  max-width: 80%;
  padding: 9px 13px;
  border-radius: 16px 16px 4px 16px;
  background: #dcf8c6;
  font-size: 15px;
  animation: pop 0.3s ease-out;
}

.bubble.photo {
  font-size: 54px;
  padding: 4px 16px;
}

.seen {
  font-size: 11px;
  color: #3478d4;
  animation: pop 0.3s ease-out;
}

.later {
  align-self: center;
  margin-top: 12px;
  padding: 4px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 700;
  color: #6d6168;
  animation: pop 0.3s ease-out;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ask {
  text-align: center;
  font-weight: 700;
  margin-bottom: 2px;
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
}

.option:active {
  border-color: var(--accent);
}

.style {
  font-size: 16px;
  margin-bottom: 12px;
}

.split {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.split-row {
  display: grid;
  grid-template-columns: 70px 1fr 20px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.split-bar {
  height: 8px;
  border-radius: 99px;
  background: #eadfd3;
  overflow: hidden;
}

.split-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
}

.rise-enter-active {
  transition: all 0.35s ease;
}

.rise-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
}
</style>
