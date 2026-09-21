<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { ALL_COLORS, COLOR_HEX, COLOR_LABEL, type PlayerColor } from '@/games/ludo/constants'
import { createLudoGame, type LudoGame } from '@/games/ludo/engine'
import LudoBoard from '@/components/ludo/LudoBoard.vue'
import LudoDice from '@/components/ludo/LudoDice.vue'

const phase = ref<'setup' | 'playing'>('setup')
const count = ref(4)
const humans = ref<Set<PlayerColor>>(new Set(['red']))

const selectedPlayers = computed<PlayerColor[]>(() => {
  if (count.value === 2) return ['red', 'yellow']
  if (count.value === 3) return ['red', 'green', 'yellow']
  return ALL_COLORS.slice()
})

function toggleHuman(c: PlayerColor) {
  if (humans.value.has(c)) {
    if (humans.value.size > 1) humans.value.delete(c)
  } else {
    humans.value.add(c)
  }
}

let game: LudoGame | null = null

function startGame() {
  const players = selectedPlayers.value
  const bots = players.filter((c) => !humans.value.has(c))
  game = createLudoGame(players, bots)
  phase.value = 'playing'
  game.start()
}

function restart() {
  game = null
  phase.value = 'setup'
}

onBeforeUnmount(() => {
  game = null
})
</script>

<template>
  <div class="ludo-page">
    <div v-if="phase === 'setup'" class="setup">
      <h1>Ludo</h1>
      <p class="hint">Combien de camps ?</p>
      <div class="row">
        <button v-for="n in [2, 3, 4]" :key="n" :class="{ active: count === n }" @click="count = n">
          {{ n }}
        </button>
      </div>

      <p class="hint">Qui joue ? Les autres sont pilotés par l'ordinateur.</p>
      <div class="row wrap">
        <button
          v-for="c in selectedPlayers"
          :key="c"
          class="color-toggle"
          :class="{ active: humans.has(c) }"
          :style="{ '--c': COLOR_HEX[c] }"
          @click="toggleHuman(c)"
        >
          <span class="dot" />
          {{ COLOR_LABEL[c] }} · {{ humans.has(c) ? 'joueur' : 'ordi' }}
        </button>
      </div>

      <button class="play-btn" @click="startGame">Commencer la partie</button>
    </div>

    <div v-else-if="game" class="playing">
      <div class="players-strip">
        <div
          v-for="c in game.state.players"
          :key="c"
          class="player-chip"
          :class="{ active: game.current.value === c }"
          :style="{ '--c': COLOR_HEX[c] }"
        >
          <span class="dot" />
          {{ COLOR_LABEL[c] }} · {{ game.homeCount(c) }}/4
        </div>
      </div>

      <div class="board-wrap">
        <LudoBoard :game="game" />
      </div>

      <div class="control-bar">
        <div class="turn-info" :style="{ color: COLOR_HEX[game.current.value] }">
          <strong>{{ COLOR_LABEL[game.current.value] }}</strong>
          <span class="msg">{{
            game.state.message ||
            (game.state.awaitingChoice
              ? 'Touche un pion en surbrillance'
              : game.isBot(game.current.value)
                ? "Tour de l'ordinateur"
                : 'À toi de jouer')
          }}</span>
        </div>
        <button class="dice-btn" :disabled="!game.canRoll.value" @click="game.rollDice()">
          <LudoDice
            :value="game.state.dice"
            :rolling="game.state.rolling"
            :accent="COLOR_HEX[game.current.value]"
          />
        </button>
      </div>

      <div v-if="game.gameOver.value" class="result-overlay">
        <div class="result-card">
          <h2>Classement</h2>
          <ol>
            <li v-for="c in game.state.ranking" :key="c" :style="{ color: COLOR_HEX[c] }">
              {{ COLOR_LABEL[c] }}
            </li>
          </ol>
          <button @click="restart">Rejouer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ludo-page {
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

.color-toggle {
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

.color-toggle.active {
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
  max-width: 560px;
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

.board-wrap {
  width: 100%;
  max-width: min(560px, 92vw);
  margin: 0 auto;
}

.control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.turn-info {
  display: flex;
  flex-direction: column;
  font-size: clamp(14px, 3.6vw, 16px);
  min-width: 0;
}

.msg {
  color: var(--color-text-muted);
  font-size: clamp(11px, 3vw, 13px);
  font-weight: 400;
}

.dice-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.dice-btn:disabled {
  opacity: 0.5;
  cursor: default;
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

/* petits ecrans : la barre de controle passe en colonne pour eviter
   que le message soit ecrase contre le de */
@media (max-width: 420px) {
  .control-bar {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .dice-btn {
    align-self: center;
  }
}
</style>
