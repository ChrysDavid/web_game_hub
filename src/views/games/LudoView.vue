<script setup lang="ts">
import { ref, computed, shallowRef, onBeforeUnmount } from 'vue'
import { ALL_COLORS, COLOR_HEX, COLOR_LABEL, type PlayerColor } from '@/games/ludo/constants'
import { createLudoGame, type LudoGame } from '@/games/ludo/engine'
import LudoOnline from '@/components/ludo/LudoOnline.vue'
import LudoTable from '@/components/ludo/LudoTable.vue'
import { getAppSession } from '@/services/appLink'

// Ouvert depuis l'app (ticket dans l'URL) : partie entre vraies personnes.
// Ouvert directement sur le site : partie contre l'ordinateur, comme avant.
const appSession = getAppSession()

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

const game = shallowRef<LudoGame | null>(null)

// Le plateau est vu depuis le premier joueur humain (sa couleur en bas a gauche).
const viewer = computed<PlayerColor>(
  () => selectedPlayers.value.find((c) => humans.value.has(c)) ?? 'red',
)

function nameOf(c: PlayerColor) {
  if (game.value?.isBot(c)) return `Ordi ${COLOR_LABEL[c]}`
  return humans.value.size === 1 ? 'Toi' : `Joueur ${COLOR_LABEL[c]}`
}

const statusText = computed(() => {
  const g = game.value
  if (!g) return ''
  if (g.state.message) return g.state.message
  if (g.state.awaitingChoice) return 'Touche un pion en surbrillance'
  return g.isBot(g.current.value) ? `Tour de ${nameOf(g.current.value)}` : 'À toi : touche ton dé'
})

function startGame() {
  const players = selectedPlayers.value
  const bots = players.filter((c) => !humans.value.has(c))
  game.value = createLudoGame(players, bots)
  phase.value = 'playing'
  game.value.start()
}

function restart() {
  game.value = null
  phase.value = 'setup'
}

onBeforeUnmount(() => {
  game.value = null
})
</script>

<template>
  <div class="ludo-page">
    <LudoOnline v-if="appSession" :session="appSession" />

    <div v-else-if="phase === 'setup'" class="setup">
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
      <LudoTable :game="game" :viewer="viewer" :name-of="nameOf" :status-text="statusText" />

      <div v-if="game.gameOver.value" class="result-overlay">
        <div class="result-card">
          <h2>Classement</h2>
          <ol>
            <li v-for="c in game.state.ranking" :key="c" :style="{ color: COLOR_HEX[c] }">
              {{ nameOf(c) }}
            </li>
          </ol>
          <button @click="restart">Rejouer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fond de page : nuit profonde avec halos rose/violet/or et un motif discret de points de de. */
.ludo-page {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(10px, 3vw, 28px) 8px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  isolation: isolate;
  background:
    radial-gradient(circle at 12% 8%, rgba(226, 68, 123, 0.32), transparent 42%),
    radial-gradient(circle at 88% 92%, rgba(122, 92, 255, 0.3), transparent 45%),
    radial-gradient(circle at 85% 12%, rgba(233, 176, 44, 0.14), transparent 35%),
    radial-gradient(circle at 10% 88%, rgba(46, 158, 87, 0.12), transparent 35%),
    linear-gradient(160deg, #1d1629 0%, #120e1a 55%, #0b0910 100%);
}

.ludo-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1.5'%3E%3Crect x='8' y='8' width='22' height='22' rx='5'/%3E%3Crect x='44' y='42' width='20' height='20' rx='5' transform='rotate(15 54 52)'/%3E%3C/g%3E%3Cg fill='%23fff'%3E%3Ccircle cx='14' cy='14' r='2'/%3E%3Ccircle cx='19' cy='19' r='2'/%3E%3Ccircle cx='24' cy='24' r='2'/%3E%3Ccircle cx='50' cy='48' r='1.8'/%3E%3Ccircle cx='58' cy='56' r='1.8'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 72px 72px;
  pointer-events: none;
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
  width: 100%;
}

.result-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
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
