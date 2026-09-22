<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { ALL_PLAYERS, PLAYER_COLOR, PLAYER_LABEL, type Card, type PlayerId } from '@/games/pioche/constants'
import { createPiocheGame, type PiocheGame } from '@/games/pioche/engine'
import PlayingCard from '@/components/pioche/PlayingCard.vue'

const phase = ref<'setup' | 'playing'>('setup')
const count = ref(2)
const humans = ref<Set<PlayerId>>(new Set(['p1']))

const selectedPlayers = computed<PlayerId[]>(() => ALL_PLAYERS.slice(0, count.value))

function toggleHuman(p: PlayerId) {
  if (humans.value.has(p)) {
    if (humans.value.size > 1) humans.value.delete(p)
  } else {
    humans.value.add(p)
  }
}

let game: PiocheGame | null = null

function startGame() {
  const players = selectedPlayers.value
  const bots = players.filter((p) => !humans.value.has(p))
  game = createPiocheGame(players, bots)
  phase.value = 'playing'
  game.start()
}

function restart() {
  game = null
  phase.value = 'setup'
}

function onCardClick(g: PiocheGame, p: PlayerId, card: Card) {
  if (g.isSelectable(p, card)) g.playCard(p, card)
}

onBeforeUnmount(() => {
  game = null
})
</script>

<template>
  <div class="pioche-page">
    <div v-if="phase === 'setup'" class="setup">
      <h1>Pioche</h1>
      <p class="hint">Combien de joueurs ?</p>
      <div class="row">
        <button v-for="n in [2, 3, 4]" :key="n" :class="{ active: count === n }" @click="count = n">
          {{ n }}
        </button>
      </div>

      <p class="hint">Qui joue ? Les autres sont pilotés par l'ordinateur.</p>
      <div class="row wrap">
        <button
          v-for="p in selectedPlayers"
          :key="p"
          class="player-toggle"
          :class="{ active: humans.has(p) }"
          :style="{ '--c': PLAYER_COLOR[p] }"
          @click="toggleHuman(p)"
        >
          <span class="dot" />
          {{ PLAYER_LABEL[p] }} · {{ humans.has(p) ? 'joueur' : 'ordi' }}
        </button>
      </div>

      <button class="play-btn" @click="startGame">Commencer la partie</button>
    </div>

    <div v-else-if="game" class="playing">
      <div class="players-strip">
        <div
          v-for="p in game.state.players"
          :key="p"
          class="player-chip"
          :class="{ active: game.current.value === p }"
          :style="{ '--c': PLAYER_COLOR[p] }"
        >
          <span class="dot" />
          {{ PLAYER_LABEL[p] }} · {{ game.state.hands[p].length }}
        </div>
      </div>

      <div class="table-area">
        <div class="pile draw-pile">
          <PlayingCard face-down accent="#7a5cff" />
          <span class="pile-count">{{ game.state.drawPile.length }}</span>
        </div>
        <div class="pile table-pile">
          <PlayingCard v-if="game.state.tableCard" :card="game.state.tableCard" />
        </div>
      </div>

      <div class="turn-info" :style="{ color: PLAYER_COLOR[game.current.value] }">
        <strong>{{ PLAYER_LABEL[game.current.value] }}</strong>
        <span class="msg">{{ game.state.message }}</span>
      </div>

      <button v-if="game.needsDraw.value" class="draw-btn" @click="game.drawCard()">
        Piocher (aucune carte jouable)
      </button>

      <div class="hand-wrap">
        <div
          v-for="p in game.state.players.filter((pp) => !game.isBot(pp))"
          :key="p"
          class="hand"
          :class="{ 'hand--current': game.current.value === p }"
        >
          <div class="hand-label" :style="{ color: PLAYER_COLOR[p] }">{{ PLAYER_LABEL[p] }}</div>
          <div class="hand-cards">
            <PlayingCard
              v-for="(card, i) in game.state.hands[p]"
              :key="i"
              :card="card"
              class="hand-card"
              :class="{ selectable: game.isSelectable(p, card) }"
              :accent="PLAYER_COLOR[p]"
              @click="onCardClick(game, p, card)"
            />
          </div>
        </div>
      </div>

      <div v-if="game.gameOver.value" class="result-overlay">
        <div class="result-card">
          <h2>Classement</h2>
          <ol>
            <li v-for="p in game.ranking.value" :key="p" :style="{ color: PLAYER_COLOR[p] }">
              {{ PLAYER_LABEL[p] }}
            </li>
          </ol>
          <button @click="restart">Rejouer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pioche-page {
  min-height: 100vh;
  padding: clamp(16px, 4vw, 32px) clamp(12px, 4vw, 20px) 60px;
  display: flex;
  justify-content: center;
}

.setup {
  max-width: 420px;
  width: 100%;
  text-align: center;
}

.setup h1 {
  font-size: clamp(26px, 7vw, 34px);
  margin-bottom: 24px;
  letter-spacing: 4px;
}

.hint {
  color: var(--color-text-muted);
  font-size: 14px;
  margin: 20px 0 10px;
}

.row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.row.wrap {
  flex-wrap: wrap;
}

.row button {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
}

.row button.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.player-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.player-toggle.active {
  color: white;
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 25%, transparent);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--c);
  display: inline-block;
  flex-shrink: 0;
}

.play-btn {
  margin-top: 30px;
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  color: white;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  min-height: 48px;
}

.playing {
  max-width: 640px;
  width: 100%;
}

.players-strip {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 18px;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: clamp(10px, 2.6vw, 12px);
  font-weight: 600;
  color: var(--color-text-muted);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}

.player-chip.active {
  color: white;
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 20%, transparent);
}

.table-area {
  --card-w: clamp(56px, 15vw, 76px);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
  margin-bottom: 18px;
}

.pile {
  position: relative;
}

.pile-count {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
  white-space: nowrap;
}

.turn-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
  margin-bottom: 16px;
}

.msg {
  color: var(--color-text-muted);
  font-size: clamp(12px, 3.2vw, 14px);
  font-weight: 400;
}

.draw-btn {
  display: block;
  margin: 0 auto 20px;
  padding: 12px 22px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  color: white;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  min-height: 44px;
}

.hand-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hand {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
}

.hand--current {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}

.hand-label {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hand-cards {
  --card-w: clamp(42px, 11vw, 58px);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.hand-card {
  opacity: 0.5;
  cursor: default;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.hand-card.selectable {
  opacity: 1;
  cursor: pointer;
}

.hand-card.selectable:hover {
  transform: translateY(-6px);
}

.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.result-card {
  background: var(--color-bg-alt);
  padding: 30px;
  border-radius: 18px;
  text-align: center;
  min-width: 260px;
  width: 100%;
  max-width: 340px;
}

.result-card ol {
  margin: 16px 0;
  padding-left: 20px;
  text-align: left;
}

.result-card button {
  margin-top: 12px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary);
  color: white;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
}
</style>
