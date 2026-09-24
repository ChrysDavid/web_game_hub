<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { GAGES, LEVELS, ROBOT_ACTIONS, ROBOT_TRUTHS, type Intention, type Kind, type Level } from '@/games/actionverite/content'
import {
  GAGE_REFUSED_PENALTY,
  JOKERS,
  POINTS,
  TURNS,
  WHEEL,
  complete,
  drawPrompt,
  gageDone,
  gageRefused,
  isOver,
  levelForTurn,
  newGame,
  nextTurn,
  refuse,
  winner,
  type AvState,
  type Player,
} from '@/games/actionverite/engine'
import SpinWheel from '@/components/actionverite/SpinWheel.vue'
import SoundToggle from '@/components/SoundToggle.vue'
import { playSound } from '@/services/sound'

/**
 * Action ou Verite, phase 2 : le duo joue ensemble pendant l'appel vocal. Sur le site, ton duo
 * est un robot (il repond, fait les actions, refuse parfois et juge tes reponses).
 */

const DUO_NAME = 'Ayo'
const THINK_SECONDS = 45
// Le robot refuse parfois, et juge parfois une reponse "pas respectee" : pour voir les gages.
const ROBOT_REFUSE_RATE = 0.2
const ROBOT_STRICT_RATE = 0.12

type Stage = 'setup' | 'spin' | 'choose' | 'prompt' | 'robot' | 'judge' | 'gage' | 'over'

const intention = ref<Intention>('amour')
const maxLevel = ref<Level>('complice')
const stage = ref<Stage>('setup')
const game = reactive<AvState>(newGame('amour', 'complice'))
const note = ref('')
const robotLine = ref('')
const secondsLeft = ref(THINK_SECONDS)
const wheel = ref<InstanceType<typeof SpinWheel> | null>(null)
const gageWheel = ref<InstanceType<typeof SpinWheel> | null>(null)
let clock: ReturnType<typeof setInterval> | undefined

const who = computed(() => (game.current === 'me' ? 'Toi' : DUO_NAME))
const level = computed(() => LEVELS.find((l) => l.id === levelForTurn(game.turn, game.maxLevel))!)
const gageSlices = computed(() => {
  const deck = GAGES.find((g) => g.tier === (game.gage?.tier ?? 1))!
  return deck.items.map((_, i) => ({ label: `${deck.label.split(' ')[1]} ${i + 1}`, emoji: deck.emoji, color: ['#1f2a44', '#c2185b', '#ff7a59', '#8faf9a'][i % 4]! }))
})
const kindLabel = (k: Kind) => (k === 'verite' ? 'Vérité' : 'Action')

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function stopClock() {
  clearInterval(clock)
  clock = undefined
}

onBeforeUnmount(stopClock)

function start() {
  Object.assign(game, newGame(intention.value, maxLevel.value))
  note.value = ''
  stage.value = 'spin'
  playSound('cardShuffle')
}

async function spinWheel() {
  if (wheel.value?.spinning) return
  note.value = ''
  const index = Math.floor(Math.random() * WHEEL.length)
  await wheel.value?.spin(index)
  const segment = WHEEL[index]!
  if (segment.id === 'choix') {
    stage.value = 'choose'
    if (game.current === 'duo') {
      await wait(900)
      pick(Math.random() < 0.5 ? 'verite' : 'action')
    }
    return
  }
  if (segment.id === 'deux') {
    drawPrompt(game, 'verite', true)
  } else {
    drawPrompt(game, segment.id)
  }
  showPrompt()
}

function pick(kind: Kind) {
  drawPrompt(game, kind)
  showPrompt()
}

function showPrompt() {
  playSound('cardSlide')
  if (game.current === 'me') {
    stage.value = 'prompt'
    secondsLeft.value = THINK_SECONDS
    stopClock()
    clock = setInterval(() => {
      secondsLeft.value--
      if (secondsLeft.value <= 0) {
        stopClock()
        note.value = 'Temps écoulé : ça compte comme un refus.'
        void startGage(false)
      }
    }, 1000)
  } else {
    void robotTurn()
  }
}

// --- Mon tour ----------------------------------------------------------------------------------

async function iDidIt() {
  stopClock()
  stage.value = 'robot'
  robotLine.value = `${DUO_NAME} réfléchit…`
  await wait(1200)
  if (Math.random() < ROBOT_STRICT_RATE) {
    note.value = `${DUO_NAME} trouve que ce n’est pas respecté (trop vague !). Gage.`
    await startGage(false)
    return
  }
  complete(game)
  note.value = `${DUO_NAME} valide ✓ +${POINTS[game.prompt!.kind]} point${POINTS[game.prompt!.kind] > 1 ? 's' : ''}`
  await endTurn()
}

async function iRefuse(useJoker: boolean) {
  stopClock()
  await startGage(useJoker)
}

// --- Tour du robot -----------------------------------------------------------------------------

async function robotTurn() {
  stage.value = 'robot'
  robotLine.value = `${DUO_NAME} réfléchit…`
  await wait(1600)
  if (Math.random() < ROBOT_REFUSE_RATE) {
    robotLine.value = `${DUO_NAME} refuse !`
    await wait(900)
    const useJoker = game.jokers.duo > 0
    note.value = useJoker ? `${DUO_NAME} utilise son joker 🃏` : ''
    await startGage(useJoker)
    return
  }
  const prompt = game.prompt!
  robotLine.value =
    prompt.kind === 'verite'
      ? ROBOT_TRUTHS[Math.floor(Math.random() * ROBOT_TRUTHS.length)]!
      : `${DUO_NAME} ${ROBOT_ACTIONS[Math.floor(Math.random() * ROBOT_ACTIONS.length)]}`
  stage.value = 'judge'
}

async function judge(respected: boolean) {
  if (respected) {
    complete(game)
    note.value = `Validé ✓ +${POINTS[game.prompt!.kind]} pour ${DUO_NAME}`
    await endTurn()
    return
  }
  note.value = `Pas respecté : ${DUO_NAME} reçoit un gage.`
  await startGage(false)
}

// --- Gages -------------------------------------------------------------------------------------

async function startGage(useJoker: boolean) {
  const absorbed = refuse(game, useJoker)
  if (absorbed) {
    if (game.current === 'me') note.value = 'Joker utilisé 🃏 : pas de gage, pas de point.'
    await endTurn()
    return
  }
  stage.value = 'gage'
  const deck = GAGES.find((g) => g.tier === game.gage!.tier)!
  await wait(300)
  await gageWheel.value?.spin(deck.items.indexOf(game.gage!.text))
  if (game.current === 'duo') {
    await wait(1400)
    if (Math.random() < 0.85) {
      robotLine.value = `${DUO_NAME} fait son gage 😅`
      gageDone(game)
    } else {
      robotLine.value = `${DUO_NAME} refuse son gage : −${GAGE_REFUSED_PENALTY} points`
      gageRefused(game)
    }
    await wait(1400)
    await endTurn()
  }
}

async function myGage(done: boolean) {
  if (done) {
    gageDone(game)
    note.value = 'Gage fait 👏'
  } else {
    gageRefused(game)
    note.value = `Gage refusé : −${GAGE_REFUSED_PENALTY} points`
  }
  await endTurn()
}

async function endTurn() {
  await wait(1100)
  nextTurn(game)
  robotLine.value = ''
  if (isOver(game)) {
    stage.value = 'over'
    return
  }
  stage.value = 'spin'
  if (game.current === 'duo') {
    await wait(900)
    await spinWheel()
  }
}

const result = computed(() => {
  const w = winner(game)
  if (w === 'egalite') return 'Égalité parfaite !'
  return w === 'me' ? 'Tu gagnes la partie !' : `${DUO_NAME} gagne la partie !`
})

function avatarOf(p: Player) {
  return p === 'me' ? 'Toi' : DUO_NAME
}
</script>

<template>
  <main class="av">
    <header class="top">
      <RouterLink to="/" class="back" aria-label="Retour aux jeux">‹</RouterLink>
      <span class="title">Action ou Vérité</span>
      <SoundToggle />
    </header>

    <!-- Choix de la partie -->
    <section v-if="stage === 'setup'" class="setup">
      <div class="logo"><span>💬</span><span>⚡</span></div>
      <h1>Action ou Vérité</h1>
      <p class="sub">Phase 2 · à jouer à deux pendant l’appel. Sur le site, ton duo est un robot.</p>

      <p class="label">Vous vous découvrez pour…</p>
      <div class="toggle">
        <button :class="{ on: intention === 'amour' }" @click="intention = 'amour'">❤️ L’amour</button>
        <button :class="{ on: intention === 'amitie' }" @click="intention = 'amitie'">🤝 L’amitié</button>
      </div>

      <p class="label">Jusqu’où on va ?</p>
      <div class="toggle">
        <button v-for="l in LEVELS" :key="l.id" :class="{ on: maxLevel === l.id }" @click="maxLevel = l.id">
          {{ l.emoji }} {{ l.label }}
        </button>
      </div>

      <ul class="rules">
        <li>La roue choisit : <b>Vérité</b> (+1), <b>Action</b> (+2), <b>Au choix</b> ou <b>À deux</b>.</li>
        <li>Plus la partie avance, plus la température monte.</li>
        <li>Tu refuses ? Ton <b>joker</b> 🃏 te sauve une fois. Sinon : <b>roue des gages</b>, de plus en plus corsés.</li>
        <li>Réponse bâclée ? Ton duo peut dire « pas respecté » : gage aussi. Refuser un gage : −{{ GAGE_REFUSED_PENALTY }}.</li>
      </ul>
      <button class="primary" @click="start">Commencer · {{ TURNS }} tours</button>
    </section>

    <!-- Partie -->
    <template v-else-if="stage !== 'over'">
      <div class="board">
        <div v-for="p in (['me', 'duo'] as Player[])" :key="p" class="player" :class="{ active: game.current === p }">
          <span class="avatar" :class="`avatar--${p}`">{{ avatarOf(p)[0] }}</span>
          <span class="name">{{ avatarOf(p) }}</span>
          <span class="score">{{ game.scores[p] }} pts</span>
          <span class="jokers">{{ '🃏'.repeat(game.jokers[p]) || '—' }}</span>
        </div>
      </div>
      <p class="turn-line">
        Tour {{ Math.min(game.turn + 1, TURNS) }} / {{ TURNS }} · <span class="level">{{ level.emoji }} {{ level.label }}</span>
      </p>

      <!-- Roue principale -->
      <div v-show="stage === 'spin' || stage === 'choose'" class="spin-zone">
        <p class="whose">{{ game.current === 'me' ? 'À toi de tourner !' : `${DUO_NAME} tourne la roue…` }}</p>
        <SpinWheel ref="wheel" :slices="WHEEL" :size="270" />
        <button v-if="stage === 'spin' && game.current === 'me'" class="primary spin-btn" @click="spinWheel">
          Tourner la roue
        </button>
        <div v-if="stage === 'choose' && game.current === 'me'" class="choose">
          <button class="kind kind--verite" @click="pick('verite')">💬 Vérité</button>
          <button class="kind kind--action" @click="pick('action')">⚡ Action</button>
        </div>
      </div>

      <!-- Carte question / action -->
      <div v-if="game.prompt && ['prompt', 'robot', 'judge'].includes(stage)" class="card" :class="`card--${game.prompt.kind}`">
        <p class="card-kind">
          {{ kindLabel(game.prompt.kind) }}{{ game.prompt.both ? ' · À deux' : '' }} · {{ who }}
        </p>
        <p class="card-text">{{ game.prompt.text }}</p>
        <p v-if="game.prompt.both" class="card-both">Vous répondez tous les deux !</p>

        <template v-if="stage === 'prompt'">
          <div class="timer"><span :style="{ width: `${(secondsLeft / THINK_SECONDS) * 100}%` }" /></div>
          <button class="primary" @click="iDidIt">
            {{ game.prompt.kind === 'verite' ? 'J’ai répondu ✓' : 'C’est fait ✓' }}
          </button>
          <div class="refuse-row">
            <button class="ghost" @click="iRefuse(false)">Je refuse</button>
            <button v-if="game.jokers.me > 0" class="ghost" @click="iRefuse(true)">Joker 🃏</button>
          </div>
        </template>

        <p v-if="robotLine && (stage === 'robot' || stage === 'judge')" class="robot-line">
          <span class="avatar avatar--duo small">{{ DUO_NAME[0] }}</span>{{ robotLine }}
        </p>
        <div v-if="stage === 'judge'" class="judge">
          <p>C’est respecté ?</p>
          <button class="primary" @click="judge(true)">Validé ✓</button>
          <button class="ghost" @click="judge(false)">Pas respecté ✗</button>
        </div>
      </div>

      <!-- Roue des gages -->
      <div v-show="stage === 'gage'" class="gage">
        <p class="whose">Roue des gages · {{ who }}</p>
        <SpinWheel ref="gageWheel" :slices="gageSlices" :size="220" />
        <div v-if="game.gage && !gageWheel?.spinning" class="gage-card">
          <p class="gage-tier">{{ GAGES.find((g) => g.tier === game.gage!.tier)!.emoji }} {{ game.gage.label }}</p>
          <p class="card-text">{{ game.gage.text }}</p>
          <template v-if="game.current === 'me'">
            <button class="primary" @click="myGage(true)">Gage fait ✓</button>
            <button class="ghost" @click="myGage(false)">Je refuse (−{{ GAGE_REFUSED_PENALTY }})</button>
          </template>
          <p v-else-if="robotLine" class="robot-line">
            <span class="avatar avatar--duo small">{{ DUO_NAME[0] }}</span>{{ robotLine }}
          </p>
        </div>
      </div>

      <p v-if="note" class="note">{{ note }}</p>
    </template>

    <!-- Fin -->
    <section v-else class="over">
      <div class="trophy">🏆</div>
      <h1>{{ result }}</h1>
      <div class="final">
        <div v-for="p in (['me', 'duo'] as Player[])" :key="p" class="final-row">
          <span class="avatar" :class="`avatar--${p}`">{{ avatarOf(p)[0] }}</span>
          <span class="name">{{ avatarOf(p) }}</span>
          <span class="score">{{ game.scores[p] }} pts</span>
          <small>{{ game.refusals[p] }} refus · joker {{ JOKERS - game.jokers[p] ? 'utilisé' : 'gardé' }}</small>
        </div>
      </div>
      <button class="primary" @click="start">Rejouer</button>
      <button class="ghost" @click="stage = 'setup'">Changer les réglages</button>
    </section>
  </main>
</template>

<style scoped>
.av {
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 560px;
  margin: 0 auto;
  padding: 12px 16px 32px;
  background:
    radial-gradient(circle at 10% 0%, rgba(194, 24, 91, 0.12), transparent 45%),
    radial-gradient(circle at 100% 30%, rgba(255, 122, 89, 0.12), transparent 40%),
    #fbf7f2;
  color: #1e1a1d;
  font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
}

.top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.back {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: white;
  color: #1e1a1d;
  font-size: 26px;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(30, 26, 29, 0.08);
}

.title {
  flex: 1;
  font-weight: 800;
}

h1 {
  font-family: 'Fraunces', Georgia, serif;
}

.setup {
  text-align: center;
}

.logo {
  display: flex;
  justify-content: center;
  gap: 6px;
  font-size: 44px;
  margin: 10px 0;
}

.logo span:first-child {
  transform: rotate(-10deg);
}

.logo span:last-child {
  transform: rotate(10deg);
}

.setup h1 {
  font-size: 32px;
}

.sub {
  color: #6d6168;
  font-size: 14px;
  margin: 6px 0 18px;
}

.label {
  font-weight: 800;
  margin: 14px 0 8px;
}

.toggle {
  display: flex;
  gap: 8px;
}

.toggle button {
  flex: 1;
  min-height: 48px;
  border-radius: 14px;
  border: 2px solid #eadfd3;
  background: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  color: #1e1a1d;
}

.toggle button.on {
  border-color: #c2185b;
  background: #fdeef4;
}

.rules {
  list-style: none;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 18px 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: white;
  border: 1px solid #eadfd3;
  font-size: 13px;
  color: #4d4349;
}

.primary {
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(90deg, #c2185b, #ff7a59);
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(194, 24, 91, 0.3);
}

.primary:active {
  transform: scale(0.98);
}

.ghost {
  width: 100%;
  min-height: 46px;
  margin-top: 8px;
  border-radius: 14px;
  border: 2px solid #eadfd3;
  background: white;
  font-weight: 700;
  color: #1e1a1d;
  cursor: pointer;
}

.board {
  display: flex;
  gap: 10px;
}

.player {
  flex: 1;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 8px;
  align-items: center;
  padding: 10px;
  border-radius: 16px;
  background: white;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}

.player.active {
  border-color: #c2185b;
}

.avatar {
  grid-row: span 2;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 800;
}

.avatar--me {
  background: #1e1a1d;
}

.avatar--duo {
  background: #c2185b;
}

.avatar.small {
  display: inline-grid;
  width: 26px;
  height: 26px;
  font-size: 12px;
  margin-right: 8px;
  vertical-align: middle;
}

.name {
  font-weight: 800;
  font-size: 14px;
}

.score {
  font-size: 13px;
  font-weight: 700;
  color: #c2185b;
}

.jokers {
  grid-column: 2;
  font-size: 12px;
}

.turn-line {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #6d6168;
  margin: 10px 0 14px;
}

.level {
  color: #c2185b;
}

.spin-zone,
.gage {
  text-align: center;
}

.whose {
  font-weight: 800;
  margin-bottom: 18px;
}

.spin-btn {
  margin-top: 22px;
}

.choose {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.kind {
  flex: 1;
  min-height: 60px;
  border: none;
  border-radius: 16px;
  color: white;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.kind--verite {
  background: #1f2a44;
}

.kind--action {
  background: #c2185b;
}

.card,
.gage-card {
  margin-top: 6px;
  padding: 20px;
  border-radius: 24px;
  background: white;
  box-shadow: 0 14px 34px rgba(30, 26, 29, 0.12);
  animation: flip 0.45s ease-out;
}

.card--verite {
  border-top: 8px solid #1f2a44;
}

.card--action {
  border-top: 8px solid #c2185b;
}

.gage-card {
  margin-top: 18px;
  border-top: 8px solid #e9a12c;
  text-align: left;
}

.card-kind,
.gage-tier {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6d6168;
}

.card-text {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  line-height: 1.3;
  margin: 10px 0 14px;
}

.card-both {
  font-size: 13px;
  font-weight: 700;
  color: #e9a12c;
  margin-bottom: 12px;
}

.timer {
  height: 6px;
  border-radius: 99px;
  background: #eadfd3;
  overflow: hidden;
  margin-bottom: 14px;
}

.timer span {
  display: block;
  height: 100%;
  background: #c2185b;
  transition: width 1s linear;
}

.refuse-row {
  display: flex;
  gap: 8px;
}

.robot-line {
  margin-top: 6px;
  padding: 12px;
  border-radius: 14px;
  background: #fbf7f2;
  font-size: 15px;
}

.judge {
  margin-top: 14px;
  text-align: center;
}

.judge p {
  font-weight: 800;
  margin-bottom: 8px;
}

.note {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 14px;
  background: #1f2a44;
  color: white;
  font-size: 14px;
  text-align: center;
  animation: flip 0.3s ease-out;
}

.over {
  text-align: center;
  padding-top: 20px;
}

.trophy {
  font-size: 64px;
}

.over h1 {
  font-size: 28px;
  margin: 8px 0 18px;
}

.final {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.final-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
  text-align: left;
  padding: 12px;
  border-radius: 16px;
  background: white;
}

.final-row small {
  grid-column: 2 / 4;
  color: #6d6168;
}

@keyframes flip {
  from {
    opacity: 0;
    transform: perspective(600px) rotateX(-25deg) translateY(10px);
  }
}
</style>
