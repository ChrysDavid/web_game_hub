<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import {
  OPPONENTS,
  PLAYER_COLOR,
  PLAYER_LABEL,
  SUITS,
  SUIT_COLOR,
  SUIT_NAME,
  SUIT_SYMBOL,
  type Card,
  type PlayerId,
  type Suit,
} from '@/games/pioche/constants'
import { createPiocheGame, type PiocheAnimator, type PiocheGame } from '@/games/pioche/engine'
import { discardJitter, handLayout, type CardBox } from '@/games/pioche/flight'
import PlayingCard from '@/components/pioche/PlayingCard.vue'
import CardFlights from '@/components/pioche/CardFlights.vue'

// Inclinaison de la table (vue "assis a table") : les cartes posees dessus suivent ce plan.
const TABLE_TILT = 40

// Place de chaque adversaire sur la table (en % de la table) et orientation de son eventail.
interface Seat {
  x: number
  y: number
  rot: number
}
const SEATS: Record<number, Partial<Record<PlayerId, Seat>>> = {
  1: { o1: { x: 50, y: 7, rot: 180 } },
  2: { o1: { x: 31, y: 14, rot: 125 }, o2: { x: 69, y: 14, rot: -125 } },
  3: { o1: { x: 30, y: 24, rot: 95 }, o2: { x: 50, y: 6, rot: 180 }, o3: { x: 70, y: 24, rot: -95 } },
}

const phase = ref<'setup' | 'playing'>('setup')
const opponentCount = ref(2)
const game = shallowRef<PiocheGame | null>(null)

const flights = ref<InstanceType<typeof CardFlights> | null>(null)
const sceneEl = ref<HTMLElement | null>(null)
const drawTopEl = ref<HTMLElement | null>(null)
const drawPileEl = ref<HTMLElement | null>(null)
const discardEl = ref<HTMLElement | null>(null)
const handEl = ref<HTMLElement | null>(null)
const seatEls = new Map<PlayerId, HTMLElement>()
const handCardEls = new Map<string, HTMLElement>()
const sceneW = ref(390)
const suitResolver = ref<((suit: Suit) => void) | null>(null)
const allowedSuits = ref<Suit[]>(SUITS.slice())

const opponents = computed(() => OPPONENTS.slice(0, opponentCount.value))
function seatOf(p: PlayerId): Seat {
  return SEATS[opponentCount.value]?.[p] ?? { x: 50, y: 7, rot: 180 }
}
const handCardW = computed(() => Math.round(Math.min(sceneW.value * 0.25, 118)))

function measure() {
  sceneW.value = sceneEl.value?.clientWidth ?? window.innerWidth
}

onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  game.value?.stop()
})

// --- Positions a l'ecran, pour les cartes qui volent -------------------------------------------

function boxOf(el: Element | null | undefined, extra: Partial<CardBox> = {}, flatWidth = false): CardBox {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 60, ...extra }
  const r = el.getBoundingClientRect()
  const w = flatWidth && el instanceof HTMLElement ? el.offsetWidth : r.width
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w, ...extra }
}

function handTarget(): CardBox {
  const r = handEl.value?.getBoundingClientRect()
  if (!r) return boxOf(null)
  return { x: r.left + r.width / 2, y: r.top + handCardW.value * 0.75, w: handCardW.value }
}

function seatBox(p: PlayerId): CardBox {
  return boxOf(seatEls.get(p), { tilt: TABLE_TILT, rot: seatOf(p).rot })
}

function handCardBox(card: Card): CardBox {
  const g = game.value
  const hand = g?.state.hands.me ?? []
  const i = hand.findIndex((c) => c.id === card.id)
  const { rot } = handLayout(i, hand.length, handCardW.value, sceneW.value)
  return boxOf(handCardEls.get(card.id), { rot }, true)
}

function discardBox(card: Card): CardBox {
  const { rot } = discardJitter(card)
  return boxOf(discardEl.value, { tilt: TABLE_TILT, rot })
}

const animator: PiocheAnimator = {
  async draw(p, card, fast) {
    await flights.value?.fly({
      card,
      from: boxOf(drawTopEl.value, { tilt: TABLE_TILT }),
      to: p === 'me' ? handTarget() : seatBox(p),
      faceUpFrom: false,
      faceUpTo: p === 'me',
      duration: fast ? 420 : 620,
      lift: p === 'me' ? 70 : 30,
    })
  },
  async play(p, card, detach) {
    const from = p === 'me' ? handCardBox(card) : seatBox(p)
    detach()
    await flights.value?.fly({
      card,
      from,
      to: discardBox(card),
      faceUpFrom: p === 'me',
      faceUpTo: true,
      duration: 600,
      lift: p === 'me' ? 90 : 50,
    })
  },
  async reshuffle(cards) {
    // Quelques cartes du talon volent vers la pioche en se retournant (pas les 40 : trop lourd).
    const shown = cards.slice(-6)
    const to = boxOf(drawPileEl.value, { tilt: TABLE_TILT })
    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
    await Promise.all(
      shown.map(async (card, i) => {
        await delay(i * 80)
        await flights.value?.fly({
          card,
          from: discardBox(card),
          to: { ...to, rot: (i - 3) * 4 },
          faceUpFrom: true,
          faceUpTo: false,
          duration: 520,
          lift: 40,
        })
      }),
    )
  },
  async reveal(card) {
    await flights.value?.fly({
      card,
      from: boxOf(drawTopEl.value, { tilt: TABLE_TILT }),
      to: discardBox(card),
      faceUpFrom: false,
      faceUpTo: true,
      duration: 650,
      lift: 60,
    })
  },
  chooseSuit(allowed) {
    allowedSuits.value = allowed
    return new Promise<Suit>((resolve) => {
      suitResolver.value = resolve
    })
  },
}

// --- Partie ------------------------------------------------------------------------------------

function startGame() {
  game.value?.stop()
  handCardEls.clear()
  game.value = createPiocheGame(['me', ...opponents.value], { animator })
  phase.value = 'playing'
  // Laisse la table s'afficher avant la distribution (les positions doivent exister).
  requestAnimationFrame(() => void game.value?.start())
}

function backToSetup() {
  game.value?.stop()
  game.value = null
  phase.value = 'setup'
}

function pickSuit(suit: Suit) {
  suitResolver.value?.(suit)
  suitResolver.value = null
}

// Carte refusee (pas jouable) : elle part vers la table puis revient d'elle-meme dans la main.
const rejectedId = ref<string | null>(null)
let rejectTimer: ReturnType<typeof setTimeout> | undefined

function onHandCard(card: Card) {
  const g = game.value
  if (!g?.isMyTurn.value) return
  if (g.canPlayCard(card)) {
    void g.playCard(card)
    return
  }
  clearTimeout(rejectTimer)
  rejectedId.value = null
  requestAnimationFrame(() => {
    rejectedId.value = card.id
    rejectTimer = setTimeout(() => (rejectedId.value = null), 520)
  })
}

function onDrawPile() {
  if (game.value?.canDraw.value) void game.value.drawCard()
}

function bindSeat(p: PlayerId, el: unknown) {
  if (el instanceof HTMLElement) seatEls.set(p, el)
}

function bindHandCard(id: string, el: unknown) {
  if (el instanceof HTMLElement) handCardEls.set(id, el)
  else handCardEls.delete(id)
}

// --- Affichage ---------------------------------------------------------------------------------

const drawLayers = computed(() => {
  const n = game.value?.state.drawPile.length ?? 0
  return Math.min(6, Math.ceil(n / 7))
})

const discardShown = computed(() => {
  const s = game.value?.state
  if (!s?.tableCard) return []
  return [...s.discardPile.slice(-3), s.tableCard]
})

const suitChanged = computed(() => {
  const s = game.value?.state
  return !!s?.tableCard && !!s.activeSuit && s.activeSuit !== s.tableCard.suit
})

const winnerTitle = computed(() => {
  const winner = game.value?.state.winner
  if (!winner) return ''
  return winner === 'me' ? 'Bravo, tu as gagné !' : `${PLAYER_LABEL[winner]} a gagné`
})

function handStyle(i: number, n: number) {
  const { x, y, rot } = handLayout(i, n, handCardW.value, sceneW.value)
  return { transform: `translateX(-50%) translate(${x}px, ${y}px) rotate(${rot}deg)`, zIndex: i }
}

function fanStyle(i: number, n: number) {
  const shown = Math.min(n, 12)
  const offset = i - (shown - 1) / 2
  return { transform: `translateX(-50%) translateX(${offset * 7}px) rotate(${offset * 5}deg)` }
}
</script>

<template>
  <div ref="sceneEl" class="scene" :style="{ '--hand-w': `${handCardW}px` }">
    <div class="wall" />

    <RouterLink to="/" class="back" aria-label="Retour aux jeux">‹</RouterLink>

    <!-- Choix de la table -->
    <div v-if="phase === 'setup'" class="setup">
      <div class="setup-card">
        <div class="setup-cards">
          <PlayingCard :card="{ id: 'd8', suit: 'hearts', rank: 8 }" class="deco deco--1" />
          <PlayingCard :card="{ id: 'dA', suit: 'spades', rank: 14 }" class="deco deco--2" />
          <PlayingCard face-down class="deco deco--3" />
        </div>
        <h1>8 américain</h1>
        <p class="hint">Adversaires</p>
        <div class="choice">
          <button v-for="n in [1, 2, 3]" :key="n" :class="{ active: opponentCount === n }" @click="opponentCount = n">
            <span class="avatars">
              <span
                v-for="p in OPPONENTS.slice(0, n)"
                :key="p"
                class="mini-avatar"
                :style="{ background: PLAYER_COLOR[p] }"
                >{{ PLAYER_LABEL[p][0] }}</span
              >
            </span>
            {{ n }}
          </button>
        </div>
        <button class="play-btn" @click="startGame">S'asseoir à la table</button>
      </div>
    </div>

    <template v-else-if="game">
      <!-- Adversaires, au mur comme autour d'une vraie table -->
      <div class="opponents">
        <div
          v-for="p in opponents"
          :key="p"
          class="badge"
          :class="{ 'badge--active': game.current.value === p && game.state.phase === 'playing' }"
          :style="{ '--c': PLAYER_COLOR[p] }"
        >
          <span class="avatar">{{ PLAYER_LABEL[p][0] }}</span>
          <span class="name">{{ PLAYER_LABEL[p] }}</span>
          <span class="count">{{ game.state.hands[p].length }}</span>
          <span v-if="game.current.value === p && game.state.phase === 'playing'" class="thinking">
            <i /><i /><i />
          </span>
          <span v-if="game.state.announced[p] && game.state.hands[p].length === 1" class="call">Carte !</span>
        </div>
      </div>

      <!-- Table en bois, vue de biais -->
      <div class="stage">
        <div class="table">
          <div
            v-for="p in opponents"
            :key="p"
            class="seat"
            :style="{
              left: `${seatOf(p).x}%`,
              top: `${seatOf(p).y}%`,
              transform: `translate(-50%, -50%) rotate(${seatOf(p).rot}deg)`,
            }"
          >
            <span :ref="(el) => bindSeat(p, el)" class="seat-anchor" />
            <PlayingCard
              v-for="(c, i) in game.state.hands[p].slice(0, 12)"
              :key="c.id"
              face-down
              class="fan-card"
              :style="fanStyle(i, game.state.hands[p].length)"
            />
          </div>

          <div
            ref="drawPileEl"
            class="pile pile--draw"
            :class="{ 'pile--active': game.canDraw.value }"
            @click="onDrawPile"
          >
            <PlayingCard
              v-for="l in drawLayers"
              :key="l"
              face-down
              class="stack-card"
              :style="{ transform: `translate(${-l * 1.2}px, ${-l * 2}px)` }"
            />
            <span v-if="game.state.drawPile.length" ref="drawTopEl" class="pile-top">
              <PlayingCard face-down :style="{ transform: `translate(${-drawLayers * 1.2}px, ${-drawLayers * 2}px)` }" />
            </span>
            <span class="pile-count">{{ game.state.drawPile.length }}</span>
          </div>

          <div ref="discardEl" class="pile pile--discard">
            <PlayingCard
              v-for="c in discardShown"
              :key="c.id"
              :card="c"
              class="discard-card"
              :style="{
                transform: `translate(${discardJitter(c).dx}px, ${discardJitter(c).dy}px) rotate(${discardJitter(c).rot}deg)`,
              }"
            />
          </div>
        </div>
      </div>

      <!-- Couleur demandee apres un 8, et message du tour -->
      <div class="status">
        <span
          v-if="suitChanged && game.state.activeSuit"
          class="suit-chip"
          :class="`suit-chip--${SUIT_COLOR[game.state.activeSuit]}`"
          >{{ SUIT_SYMBOL[game.state.activeSuit] }} demandé</span
        >
        <span class="direction" :class="{ 'direction--reverse': game.state.direction === -1 }" title="Sens du jeu"
          >↻</span
        >
        <span v-if="game.state.message" class="message">{{ game.state.message }}</span>
        <button v-if="game.canPass.value" class="pass-btn" @click="game.pass()">Passer</button>
      </div>

      <!-- Annonce de la derniere carte : toujours la, c'est au joueur d'y penser -->
      <button
        v-if="game.state.phase === 'playing'"
        class="call-btn"
        :class="{ 'call-btn--done': game.state.announced.me && game.state.hands.me.length === 1 }"
        @click="game.announce()"
      >
        Carte !
      </button>

      <!-- Ma main, tenue comme de vraies cartes -->
      <div ref="handEl" class="hand">
        <div
          v-for="(card, i) in game.state.hands.me"
          :key="card.id"
          :ref="(el) => bindHandCard(card.id, el)"
          class="hand-card"
          :class="{ 'hand-card--rejected': rejectedId === card.id }"
          :style="handStyle(i, game.state.hands.me.length)"
          @click="onHandCard(card)"
        >
          <PlayingCard :card="card" />
        </div>
      </div>

      <!-- Choix de la couleur apres un 8 -->
      <div v-if="suitResolver" class="overlay">
        <div class="panel">
          <h2>Quelle couleur demandes-tu ?</h2>
          <div class="suits">
            <button
              v-for="s in allowedSuits"
              :key="s"
              class="suit-btn"
              :class="`suit-btn--${SUIT_COLOR[s]}`"
              @click="pickSuit(s)"
            >
              <span class="suit-symbol">{{ SUIT_SYMBOL[s] }}</span>
              {{ SUIT_NAME[s] }}
            </button>
          </div>
        </div>
      </div>

      <!-- Fin de partie -->
      <div v-if="game.state.phase === 'over'" class="overlay">
        <div class="panel">
          <h2>{{ winnerTitle }}</h2>
          <ol class="ranking">
            <li v-for="(p, i) in game.ranking.value" :key="p">
              <span class="place">{{ i + 1 }}</span>
              <span class="mini-avatar" :style="{ background: PLAYER_COLOR[p] }">{{ PLAYER_LABEL[p][0] }}</span>
              <span class="rank-name">{{ PLAYER_LABEL[p] }}</span>
              <span class="rank-left">{{ game.state.hands[p].length }} carte{{ game.state.hands[p].length > 1 ? 's' : '' }}</span>
            </li>
          </ol>
          <button class="play-btn" @click="startGame">Rejouer</button>
          <button class="link-btn" @click="backToSetup">Changer de table</button>
        </div>
      </div>
    </template>

    <CardFlights ref="flights" />
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  width: 100%;
  max-width: 560px;
  height: 100vh;
  height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #3a2414;
  font-family: 'Segoe UI', system-ui, sans-serif;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Papier peint raye, comme dans une vraie piece */
.wall {
  position: absolute;
  inset: 0 0 auto;
  height: 34%;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0) 60%, rgba(60, 35, 15, 0.35) 100%),
    repeating-linear-gradient(90deg, #f1e7d2 0 22px, #e6d8bb 22px 25px, #f6eedd 25px 44px, #ddcdae 44px 46px);
}

.back {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 30;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.75);
  color: #3a2414;
  font-size: 28px;
  line-height: 1;
  text-decoration: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* ---------- Table ---------- */

.stage {
  position: absolute;
  inset: 0;
  perspective: 900px;
  perspective-origin: 50% 0%;
  pointer-events: none;
}

.table {
  position: absolute;
  left: 50%;
  top: 25%;
  width: 190%;
  height: 120%;
  transform: translateX(-50%) rotateX(40deg);
  transform-origin: 50% 0;
  border-radius: 50%;
  background:
    radial-gradient(ellipse 45% 30% at 50% 22%, rgba(255, 236, 200, 0.28), transparent 70%),
    repeating-linear-gradient(91deg, rgba(60, 30, 10, 0.07) 0 2px, transparent 2px 11px),
    repeating-linear-gradient(89deg, rgba(255, 220, 170, 0.06) 0 1px, transparent 1px 27px),
    linear-gradient(180deg, #c08652 0%, #a0673a 45%, #7d4a24 100%);
  box-shadow:
    0 0 0 12px #6a3b1a,
    0 -6px 0 12px #8a5230,
    0 30px 60px rgba(0, 0, 0, 0.5);
}

.seat {
  position: absolute;
  width: 0;
  height: 0;
  --card-w: 46px;
}

.seat-anchor {
  position: absolute;
  left: -23px;
  top: -32px;
  width: 46px;
  height: 64px;
}

.fan-card {
  position: absolute;
  left: 0;
  top: -32px;
  transform-origin: 50% 120%;
  transition: transform 0.35s ease;
}

.pile {
  position: absolute;
  top: 21%;
  --card-w: 76px;
  width: 76px;
  height: 106px;
  pointer-events: auto;
}

.pile--draw {
  left: calc(50% - 88px);
}

.pile--discard {
  left: calc(50% + 12px);
}

.stack-card,
.pile-top,
.discard-card {
  position: absolute;
  inset: 0;
}

.pile--active {
  cursor: pointer;
}

.pile-count {
  position: absolute;
  left: -16px;
  top: -18px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff4e0;
  font-size: 13px;
  font-weight: 700;
}

/* ---------- Adversaires ---------- */

.opponents {
  position: absolute;
  top: 12px;
  left: 60px;
  right: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 5;
}

.badge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
  padding: 6px 8px 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  color: #3a2414;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.badge--active::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 17px;
  border: 3px solid var(--c);
  animation: pulse 1.2s ease-in-out infinite;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--c);
  color: white;
  font-weight: 800;
  font-size: 17px;
  border: 2px solid white;
}

.name {
  font-size: 12px;
  font-weight: 700;
}

.count {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: #183a86;
  color: white;
  font-size: 11px;
  font-weight: 800;
  display: grid;
  place-items: center;
}

.thinking {
  display: flex;
  gap: 3px;
  height: 6px;
}

.thinking i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c);
  animation: dot 1s ease-in-out infinite;
}

.thinking i:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking i:nth-child(3) {
  animation-delay: 0.3s;
}

/* ---------- Statut ---------- */

.status {
  position: absolute;
  left: 0;
  right: 0;
  top: 96px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  z-index: 10;
}

.message {
  padding: 7px 14px;
  border-radius: 18px;
  background: rgba(20, 10, 4, 0.55);
  color: #fff4e0;
  font-size: 14px;
  font-weight: 600;
}

.suit-chip {
  padding: 6px 12px;
  border-radius: 18px;
  background: #fbf8f1;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.suit-chip--red {
  color: #d3263a;
}

.suit-chip--black {
  color: #17151d;
}

.direction {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(20, 10, 4, 0.55);
  color: #fff4e0;
  font-size: 18px;
  transition: transform 0.5s ease;
}

/* Apres un Valet, la fleche tourne dans l'autre sens */
.direction--reverse {
  transform: scaleX(-1);
}

.call {
  position: absolute;
  bottom: -14px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #d3263a;
  color: white;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  animation: pop 0.3s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.call-btn {
  position: absolute;
  right: 12px;
  bottom: calc(var(--hand-w) * 1.2 + 16px);
  z-index: 25;
  min-width: 64px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 22px;
  border: 2px solid #fbf8f1;
  background: #d3263a;
  color: white;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}

.call-btn:active {
  transform: scale(0.94);
}

.call-btn--done {
  background: #2e9e57;
}

.pass-btn {
  padding: 8px 18px;
  min-height: 40px;
  border-radius: 20px;
  border: none;
  background: #fbf8f1;
  color: #3a2414;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

/* ---------- Ma main ---------- */

.hand {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(var(--hand-w) * -0.22);
  height: calc(var(--hand-w) * 1.4 + 30px);
  z-index: 20;
  perspective: 700px;
}

.hand-card {
  --card-w: var(--hand-w);
  position: absolute;
  left: 50%;
  bottom: 0;
  transform-origin: 50% 100%;
  transition: transform 0.35s cubic-bezier(0.3, 0.8, 0.3, 1);
  cursor: pointer;
}

.hand-card > * {
  transform: rotateX(8deg);
}

/* Carte refusee : elle part vers la table, hesite, puis revient dans la main */
.hand-card--rejected > * {
  animation: bounce-back 0.5s cubic-bezier(0.3, 0.7, 0.3, 1);
}

@keyframes bounce-back {
  0% {
    transform: rotateX(8deg);
  }
  40% {
    transform: translateY(calc(var(--hand-w) * -0.7)) rotateX(20deg) rotate(-4deg);
  }
  60% {
    transform: translateY(calc(var(--hand-w) * -0.62)) rotateX(20deg) rotate(4deg);
  }
  100% {
    transform: rotateX(8deg);
  }
}

/* ---------- Fenetres ---------- */

.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 10, 4, 0.55);
}

.panel {
  width: 100%;
  max-width: 340px;
  padding: 24px 20px;
  border-radius: 20px;
  background: #fbf8f1;
  color: #2a1a0e;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  animation: pop 0.3s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.panel h2 {
  font-family: Georgia, serif;
  font-size: 21px;
  margin-bottom: 16px;
}

.suits {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.suit-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  min-height: 84px;
  border-radius: 14px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  background: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

.suit-btn--red {
  color: #d3263a;
}

.suit-btn--black {
  color: #17151d;
}

.suit-symbol {
  font-size: 38px;
  line-height: 1;
}

.ranking {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.ranking li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: white;
}

.place {
  width: 18px;
  font-weight: 800;
  color: #a0673a;
}

.rank-name {
  flex: 1;
  text-align: left;
  font-weight: 700;
}

.rank-left {
  font-size: 13px;
  color: #7d6a58;
}

.mini-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  color: white;
  font-weight: 800;
  font-size: 12px;
  border: 2px solid white;
}

.play-btn {
  width: 100%;
  min-height: 50px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(180deg, #2c56b8, #183a86);
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(24, 58, 134, 0.4);
}

.link-btn {
  margin-top: 10px;
  min-height: 40px;
  border: none;
  background: none;
  color: #7d4a24;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}

/* ---------- Ecran de choix ---------- */

.setup {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 70px 16px 24px;
  background: linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.25));
}

.setup-card {
  width: 100%;
  max-width: 360px;
  padding: 70px 22px 22px;
  border-radius: 22px;
  background: #fbf8f1;
  color: #2a1a0e;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.setup-cards {
  position: absolute;
  left: 50%;
  top: -46px;
  --card-w: 70px;
  width: 0;
  height: 0;
}

.deco {
  position: absolute;
  top: 0;
  left: -35px;
  transform-origin: 50% 110%;
}

.deco--1 {
  transform: rotate(-16deg) translateX(-24px);
}

.deco--2 {
  transform: rotate(0deg) translateY(-6px);
}

.deco--3 {
  transform: rotate(16deg) translateX(24px);
}

.setup h1 {
  font-family: Georgia, serif;
  font-size: 30px;
  margin-bottom: 12px;
}

.hint {
  margin: 18px 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: #5a4535;
}

.choice {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.choice button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  min-height: 72px;
  border-radius: 14px;
  border: 2px solid #e6d8bb;
  background: white;
  color: #2a1a0e;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
}

.choice button.active {
  border-color: #2c56b8;
  background: #eef3ff;
}

.avatars {
  display: flex;
}

.avatars .mini-avatar + .mini-avatar {
  margin-left: -8px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

@keyframes dot {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@keyframes pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pile--ready::after,
  .badge--active::before,
  .thinking i {
    animation: none;
  }
}
</style>
