<script setup lang="ts">
import { computed } from 'vue'
import { COLOR_HEX, type PlayerColor } from '@/games/ludo/constants'
import type { LudoGameView } from '@/games/ludo/types'
import LudoBoard from './LudoBoard.vue'
import LudoDice from './LudoDice.vue'
import SoundToggle from '@/components/SoundToggle.vue'

/**
 * Table de jeu commune (partie locale contre l'ordinateur et partie en ligne) :
 * - le plateau est tourne pour que `viewer` soit toujours en bas a gauche ;
 * - chaque joueur a son "poste" a cote de son coin : pseudo, anneau de tour, chrono et de.
 *   Le de apparait et roule chez le joueur qui joue, jamais ailleurs.
 */
const props = defineProps<{
  game: LudoGameView
  viewer: PlayerColor
  nameOf: (color: PlayerColor) => string
  statusText: string
  secondsLeft?: number | null
  turnSeconds?: number
}>()

// Coin de chaque couleur sur le plateau non tourne, dans le sens des aiguilles d'une montre :
// 0 = haut gauche, 1 = haut droite, 2 = bas droite, 3 = bas gauche.
const BASE_CORNER: Record<PlayerColor, number> = { red: 0, green: 1, yellow: 2, blue: 3 }

const quarterTurns = computed(() => (3 - BASE_CORNER[props.viewer] + 4) % 4)
const rotation = computed(() => quarterTurns.value * 90)

function colorAt(corner: number): PlayerColor | null {
  return (
    props.game.state.players.find((c) => (BASE_CORNER[c] + quarterTurns.value) % 4 === corner) ??
    null
  )
}

const topPods = computed(() => [colorAt(0), colorAt(1)])
const bottomPods = computed(() => [colorAt(3), colorAt(2)])

const TIMER_RADIUS = 21
const TIMER_LENGTH = 2 * Math.PI * TIMER_RADIUS

function timerOffset() {
  if (props.secondsLeft == null || !props.turnSeconds) return 0
  return TIMER_LENGTH * (1 - Math.max(0, props.secondsLeft) / props.turnSeconds)
}

function isActive(color: PlayerColor | null) {
  return color != null && !props.game.gameOver.value && props.game.current.value === color
}

function roll(color: PlayerColor) {
  if (isActive(color) && props.game.canRoll.value) props.game.rollDice()
}
</script>

<template>
  <div class="table">
    <SoundToggle class="sound" />
    <template v-for="(row, r) in [topPods, bottomPods]" :key="r">
      <div class="pods" :class="r === 0 ? 'pods--top' : 'pods--bottom'">
        <div
          v-for="(color, side) in row"
          :key="side"
          class="pod"
          :class="{
            'pod--right': side === 1,
            'pod--active': isActive(color),
            'pod--empty': !color,
          }"
          :style="color ? { '--c': COLOR_HEX[color] } : {}"
        >
          <template v-if="color">
            <div class="avatar">
              <svg v-if="isActive(color) && secondsLeft != null" class="timer" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  :r="TIMER_RADIUS"
                  :stroke-dasharray="TIMER_LENGTH"
                  :stroke-dashoffset="timerOffset()"
                />
              </svg>
              <span class="avatar-dot">{{ nameOf(color).charAt(0).toUpperCase() }}</span>
            </div>
            <div class="pod-text">
              <span class="pod-name">{{ nameOf(color) }}</span>
              <span class="pod-sub">{{ game.homeCount(color) }}/4 rentrés</span>
            </div>
            <button
              v-if="isActive(color)"
              class="dice-box"
              :class="{ 'dice-box--ready': isActive(color) && game.canRoll.value }"
              :disabled="!(isActive(color) && game.canRoll.value)"
              :aria-label="`Lancer le dé (${nameOf(color)})`"
              @click="roll(color)"
            >
              <LudoDice
                :value="game.state.dice"
                :rolling="game.state.rolling"
              />
            </button>
          </template>
        </div>
      </div>

      <div v-if="r === 0" class="board-slot">
        <LudoBoard :game="game" :rotation="rotation" />
      </div>
    </template>

    <p class="status" :style="{ color: COLOR_HEX[game.current.value] }">{{ statusText }}</p>
  </div>
</template>

<style scoped>
/* Largeur du plateau : toute la largeur sur mobile, sans jamais depasser la hauteur disponible
   (il reste la place des postes des joueurs et du message). */
.sound {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 30;
}

.table {
  --board: min(100%, 600px, calc(100dvh - 190px));
  width: var(--board);
  min-width: min(100%, 300px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.board-slot {
  width: 100%;
}

.pods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pod {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition:
    background 0.3s,
    border-color 0.3s,
    box-shadow 0.3s;
}

.pod--right {
  flex-direction: row-reverse;
  text-align: right;
}

.pod--empty {
  visibility: hidden;
}

.pod--active {
  background: color-mix(in srgb, var(--c) 22%, rgba(20, 16, 28, 0.6));
  border-color: color-mix(in srgb, var(--c) 70%, white);
  box-shadow: 0 0 16px color-mix(in srgb, var(--c) 45%, transparent);
}

.avatar {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.avatar-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: white;
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in srgb, var(--c) 45%, white),
    var(--c) 55%,
    color-mix(in srgb, var(--c) 70%, black)
  );
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 -2px 3px rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
}

.timer {
  position: absolute;
  inset: -5px;
  width: calc(100% + 10px);
  height: calc(100% + 10px);
  transform: rotate(-90deg);
}

.timer circle {
  fill: none;
  stroke: #fff;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}

.pod-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.pod-name {
  font-size: clamp(12px, 3.4vw, 14px);
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pod-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

.dice-box {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.22);
  padding: 0;
  cursor: default;
}



.dice-box--ready {
  cursor: pointer;
  animation: readyGlow 1.2s ease-in-out infinite;
}

@keyframes readyGlow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.35);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(255, 255, 255, 0);
  }
}

.status {
  margin: 2px 0 0;
  min-height: 20px;
  text-align: center;
  font-size: clamp(13px, 3.6vw, 15px);
  font-weight: 700;
}

@media (max-width: 380px) {
  .pod-sub {
    display: none;
  }

  .avatar {
    width: 32px;
    height: 32px;
  }

  .avatar-dot {
    width: 26px;
    height: 26px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dice-box--ready {
    animation: none;
  }
}
</style>
