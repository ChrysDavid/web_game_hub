<script setup lang="ts">
import { computed } from 'vue'
import {
  ALL_COLORS,
  BOARD_CELLS,
  COLOR_HEX,
  GRID_SIZE,
  YARD_ORIGIN,
  YARD_SLOTS,
  centerOf,
} from '@/games/ludo/constants'
import type { Token } from '@/games/ludo/engine'
import type { LudoGameView } from '@/games/ludo/types'

const props = defineProps<{ game: LudoGameView }>()

const unit = 100 / GRID_SIZE

function pct(v: number) {
  return `${v * unit}%`
}

const activePlayers = computed(() => new Set(props.game.state.players))

// Regroupe les pions qui partagent la meme case pour les decaler en eventail.
const pawnPositions = computed(() => {
  const positions = new Map<Token, [number, number]>()
  const groups = new Map<string, Token[]>()

  for (const t of props.game.state.tokens) {
    const [col, row] = centerOf(t.color, t.step, t.id)
    positions.set(t, [col, row])
    if (t.step >= 0) {
      const key = `${col.toFixed(2)}:${row.toFixed(2)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(t)
    }
  }

  groups.forEach((list) => {
    if (list.length < 2) return
    const r = 0.17
    list.forEach((t, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / list.length
      const [col, row] = positions.get(t)!
      positions.set(t, [col + Math.cos(a) * r, row + Math.sin(a) * r])
    })
  })

  return positions
})

function isSelectable(t: Token) {
  return props.game.isMovable(t) && !props.game.isBot(t.color)
}
</script>

<template>
  <div class="board">
    <!-- cases du circuit + couloirs -->
    <div
      v-for="cell in BOARD_CELLS"
      :key="`${cell.row}-${cell.col}`"
      class="cell"
      :class="[`cell--${cell.kind}`]"
      :style="{
        left: pct(cell.col),
        top: pct(cell.row),
        width: pct(1),
        height: pct(1),
        '--cell-color': cell.color ? COLOR_HEX[cell.color] : undefined,
      }"
    >
      <span v-if="cell.kind === 'star'" class="star">★</span>
    </div>

    <!-- garages -->
    <div
      v-for="color in ALL_COLORS"
      :key="color"
      class="yard"
      :class="{ 'yard--inactive': !activePlayers.has(color) }"
      :style="{
        left: pct(YARD_ORIGIN[color][1]),
        top: pct(YARD_ORIGIN[color][0]),
        width: pct(6),
        height: pct(6),
        '--yard-color': COLOR_HEX[color],
      }"
    >
      <div class="yard-inner">
        <div v-for="(slot, i) in YARD_SLOTS[color]" :key="i" class="yard-slot" />
      </div>
    </div>

    <!-- triangle central -->
    <div class="center">
      <div class="center-inner" />
    </div>

    <!-- pions -->
    <div
      v-for="t in game.state.tokens"
      :key="`${t.color}-${t.id}`"
      class="pawn"
      :class="{ 'pawn--selectable': isSelectable(t), 'pawn--home': t.step === 56 }"
      :style="{
        left: pct(pawnPositions.get(t)![0]),
        top: pct(pawnPositions.get(t)![1]),
        '--pawn-color': COLOR_HEX[t.color],
      }"
      @click="isSelectable(t) && game.playToken(t)"
    >
      <span v-if="isSelectable(t)" class="pawn-arrow">▼</span>
    </div>
  </div>
</template>

<style scoped>
.board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #f7f2e6;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.cell {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell--path {
  background: #f7f2e6;
}

.cell--start,
.cell--home {
  background: var(--cell-color);
}

.cell--star {
  background: #f7f2e6;
}

.star {
  color: rgba(0, 0, 0, 0.35);
  font-size: 60%;
}

.yard {
  position: absolute;
  box-sizing: border-box;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--yard-color) 55%, white),
    var(--yard-color)
  );
  border: 2px solid rgba(0, 0, 0, 0.1);
}

.yard--inactive {
  background: #d9d2c3;
  filter: grayscale(1);
  opacity: 0.6;
}

.yard-inner {
  position: absolute;
  inset: 16%;
  background: #f7f2e6;
  border-radius: 14%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  place-items: center;
}

.yard-slot {
  width: 60%;
  height: 60%;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--yard-color, #999) 70%, white);
  opacity: 0.5;
}

.center {
  position: absolute;
  left: 40%;
  top: 40%;
  width: 20%;
  height: 20%;
  background: conic-gradient(
    from -45deg,
    #2e9e57 0deg 90deg,
    #e9b02c 90deg 180deg,
    #2f6bd1 180deg 270deg,
    #d94141 270deg 360deg
  );
}

.center-inner {
  position: absolute;
  inset: 22%;
  background: #f7f2e6;
  border-radius: 50%;
}

/* --- Pions avec relief renforce et ombre portee separee --- */

.pawn {
  position: absolute;
  width: calc(100% / 15 * 0.86);
  height: calc(100% / 15 * 0.86);
  transform: translate(-50%, -58%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 32% 28%,
    color-mix(in srgb, var(--pawn-color) 45%, white) 0%,
    var(--pawn-color) 55%,
    color-mix(in srgb, var(--pawn-color) 75%, black) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.92);
  box-shadow:
    inset -3px -4px 6px rgba(0, 0, 0, 0.25),
    inset 2px 3px 4px rgba(255, 255, 255, 0.35),
    0 6px 10px rgba(0, 0, 0, 0.4);
  transition:
    left 0.15s ease-out,
    top 0.15s ease-out,
    transform 0.15s ease;
  cursor: default;
  z-index: 2;
}

/* ombre projetee au sol, separee du pion pour l'effet "piece qui tient debout" */
.pawn::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -22%;
  width: 78%;
  height: 26%;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.4), transparent 72%);
  transform: translateX(-50%);
  border-radius: 50%;
  z-index: -1;
}

/* zone tactile agrandie, invisible, pour un tap confortable sur mobile */
.pawn::before {
  content: '';
  position: absolute;
  inset: -45%;
  pointer-events: auto;
}

.pawn--home {
  opacity: 0.6;
}

.pawn--selectable {
  cursor: pointer;
  animation: pawnPulse 0.9s ease-in-out infinite alternate;
}

.pawn--selectable:active {
  transform: translate(-50%, -58%) scale(0.9);
}

@keyframes pawnPulse {
  from {
    box-shadow:
      inset -3px -4px 6px rgba(0, 0, 0, 0.25),
      inset 2px 3px 4px rgba(255, 255, 255, 0.35),
      0 6px 10px rgba(0, 0, 0, 0.4),
      0 0 0 3px rgba(255, 255, 255, 0.5),
      0 0 0 rgba(255, 255, 255, 0.5);
  }
  to {
    box-shadow:
      inset -3px -4px 6px rgba(0, 0, 0, 0.25),
      inset 2px 3px 4px rgba(255, 255, 255, 0.35),
      0 6px 10px rgba(0, 0, 0, 0.4),
      0 0 0 3px rgba(255, 255, 255, 0.9),
      0 0 18px 6px rgba(255, 255, 255, 0.85);
  }
}

.pawn-arrow {
  position: absolute;
  top: -170%;
  left: 50%;
  transform: translateX(-50%);
  font-size: clamp(10px, 2.6vw, 16px);
  color: #fff;
  text-shadow:
    0 0 6px rgba(0, 0, 0, 0.8),
    0 0 3px rgba(0, 0, 0, 1);
  animation: arrowBounce 0.7s ease-in-out infinite;
  pointer-events: none;
  z-index: 3;
}

@keyframes arrowBounce {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-5px);
  }
}
</style>
