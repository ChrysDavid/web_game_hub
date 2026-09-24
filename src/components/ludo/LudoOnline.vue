<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { COLOR_HEX, COLOR_LABEL, type PlayerColor } from '@/games/ludo/constants'
import { createOnlineLudoGame } from '@/games/ludo/online'
import { notifyApp, type AppSession } from '@/services/appLink'
import LudoBoard from './LudoBoard.vue'
import LudoDice from './LudoDice.vue'

/** Partie en ligne entre 2 et 4 vraies personnes, uniquement quand le jeu est ouvert depuis l'app. */
const props = defineProps<{ session: AppSession }>()

const game = createOnlineLudoGame(props.session)
const s = game.state

onMounted(() => game.start())
onBeforeUnmount(() => game.leave())

function label(c: PlayerColor) {
  return c === s.myColor ? `${COLOR_LABEL[c]} (toi)` : COLOR_LABEL[c]
}

const statusText = computed(() => {
  if (s.message) return s.message
  if (s.awaitingChoice && game.isMyTurn.value) return 'Touche un pion en surbrillance'
  return game.isMyTurn.value ? 'À toi de jouer' : `Tour de ${COLOR_LABEL[game.current.value]}`
})

const lobbyText = computed(() => {
  if (s.lobbyPlayers < s.minPlayers) return 'On attend au moins un autre joueur…'
  if (s.startsIn != null) return `La partie commence dans ${s.startsIn} s`
  return 'La partie va commencer'
})

function quit() {
  game.leave()
  notifyApp('close')
}
</script>

<template>
  <div class="online">
    <div v-if="s.phase === 'connecting'" class="center-card">
      <div class="spinner" />
      <p>Connexion au salon…</p>
    </div>

    <div v-else-if="s.phase === 'lobby'" class="center-card">
      <h1>Ludo</h1>
      <p class="hint">Partie entre vraies personnes, de {{ s.minPlayers }} à {{ s.maxPlayers }} joueurs.</p>
      <div class="seats">
        <span
          v-for="i in s.maxPlayers"
          :key="i"
          class="seat"
          :class="{ filled: i <= s.lobbyPlayers }"
        />
      </div>
      <p class="count">{{ s.lobbyPlayers }} / {{ s.maxPlayers }} joueurs</p>
      <p class="hint">{{ lobbyText }}</p>
      <button class="ghost-btn" @click="quit">Quitter</button>
    </div>

    <div v-else-if="s.phase === 'error'" class="center-card">
      <p>{{ s.error }}</p>
      <button class="ghost-btn" @click="notifyApp('close')">Retour à l’app</button>
    </div>

    <div v-else class="playing">
      <div class="players-strip">
        <div
          v-for="c in s.players"
          :key="c"
          class="player-chip"
          :class="{ active: game.current.value === c, gone: s.abandoned.includes(c) }"
          :style="{ '--c': COLOR_HEX[c] }"
        >
          <span class="dot" />
          {{ label(c) }} · {{ game.homeCount(c) }}/4
        </div>
      </div>

      <div class="board-wrap">
        <LudoBoard :game="game" />
      </div>

      <div class="control-bar">
        <div class="turn-info" :style="{ color: COLOR_HEX[game.current.value] }">
          <strong>{{ label(game.current.value) }}</strong>
          <span class="msg">{{ statusText }}</span>
          <span v-if="s.secondsLeft != null && s.phase === 'playing'" class="msg timer">
            {{ s.secondsLeft }} s
          </span>
        </div>
        <button class="dice-btn" :disabled="!game.canRoll.value" @click="game.rollDice()">
          <LudoDice :value="s.dice" :rolling="s.rolling" :accent="COLOR_HEX[game.current.value]" />
        </button>
      </div>

      <div v-if="game.gameOver.value" class="result-overlay">
        <div class="result-card">
          <h2>Classement</h2>
          <ol>
            <li v-for="c in s.ranking" :key="c" :style="{ color: COLOR_HEX[c] }">{{ label(c) }}</li>
          </ol>
          <button @click="notifyApp('replay')">Rejouer</button>
          <button class="ghost-btn" @click="notifyApp('close')">Quitter</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.online {
  width: 100%;
  display: flex;
  justify-content: center;
}

.center-card {
  max-width: 420px;
  width: 100%;
  text-align: center;
  padding-top: 40px;
}

.center-card h1 {
  font-size: clamp(26px, 7vw, 34px);
  letter-spacing: 4px;
  margin-bottom: 8px;
}

.hint {
  color: var(--color-text-muted);
  font-size: 14px;
  margin: 14px 0;
}

.seats {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.seat {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  transition: background 0.3s;
}

.seat.filled {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.count {
  margin-top: 12px;
  font-weight: 700;
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 16px;
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ghost-btn {
  margin-top: 20px;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: var(--color-text);
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
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

.player-chip.gone {
  opacity: 0.4;
  text-decoration: line-through;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--c);
  display: inline-block;
  flex-shrink: 0;
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

.timer {
  font-variant-numeric: tabular-nums;
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
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-card ol {
  margin: 16px 0;
  padding-left: 20px;
  text-align: left;
}

.result-card button:not(.ghost-btn) {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary);
  color: white;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
}

.result-card .ghost-btn {
  margin-top: 0;
}

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
