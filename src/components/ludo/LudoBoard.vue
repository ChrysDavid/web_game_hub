<script setup lang="ts">
import { computed } from 'vue'
import {
  ALL_COLORS,
  BOARD_CELLS,
  COLOR_HEX,
  GRID_SIZE,
  HOME_PATH,
  MAX_STEP,
  TRACK,
  START_INDEX,
  YARD_ORIGIN,
  YARD_SLOTS,
  centerOf,
  type PlayerColor,
} from '@/games/ludo/constants'
import type { Token } from '@/games/ludo/engine'
import type { LudoGameView } from '@/games/ludo/types'

/**
 * Plateau de Ludo. `rotation` (0, 90, 180 ou 270 degres) tourne le plateau pour que la couleur du
 * joueur soit toujours en bas a gauche ; les pions sont contre-tournes pour rester debout.
 */
const props = withDefaults(defineProps<{ game: LudoGameView; rotation?: number }>(), {
  rotation: 0,
})

const unit = 100 / GRID_SIZE

function pct(v: number) {
  return `${v * unit}%`
}

const activePlayers = computed(() => new Set(props.game.state.players))

// Case d'entree du couloir final de chaque couleur (derniere case du circuit) : on y dessine une
// fleche qui pointe vers le couloir, comme sur les plateaux classiques.
const ENTRY_ARROWS = ALL_COLORS.map((color) => {
  const [row, col] = TRACK[(START_INDEX[color] + 50) % 52]!
  const [homeRow, homeCol] = HOME_PATH[color][0]!
  const angle = Math.atan2(homeRow - row, homeCol - col) * (180 / Math.PI)
  return { color, row, col, angle }
})

// Fleche de depart sur la case de sortie de chaque couleur (sens de la marche).
const START_ARROWS = ALL_COLORS.map((color) => {
  const [row, col] = TRACK[START_INDEX[color]]!
  const [nextRow, nextCol] = TRACK[START_INDEX[color] + 1]!
  const angle = Math.atan2(nextRow - row, nextCol - col) * (180 / Math.PI)
  return { color, row, col, angle }
})

const selecting = computed(() => props.game.state.tokens.some((t) => isSelectable(t)))

// Regroupe les pions qui partagent la meme case pour les decaler en eventail.
const pawnLayout = computed(() => {
  const layout = new Map<Token, { x: number; y: number; crowded: boolean }>()
  const groups = new Map<string, Token[]>()

  for (const t of props.game.state.tokens) {
    const [col, row] = centerOf(t.color, t.step, t.id)
    layout.set(t, { x: col, y: row, crowded: false })
    if (t.step >= 0) {
      const key = `${col.toFixed(2)}:${row.toFixed(2)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(t)
    }
  }

  groups.forEach((list) => {
    if (list.length < 2) return
    const r = 0.24
    list.forEach((t, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / list.length
      const p = layout.get(t)!
      layout.set(t, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, crowded: true })
    })
  })

  return layout
})

function isSelectable(t: Token) {
  return props.game.isMovable(t) && !props.game.isBot(t.color)
}

function pawnStyle(t: Token) {
  const p = pawnLayout.value.get(t)!
  return {
    left: pct(p.x),
    top: pct(p.y),
    '--pawn-color': COLOR_HEX[t.color],
    '--pawn-light': `color-mix(in srgb, ${COLOR_HEX[t.color]} 45%, white)`,
    '--pawn-dark': `color-mix(in srgb, ${COLOR_HEX[t.color]} 70%, black)`,
    '--counter': `${-props.rotation}deg`,
    '--scale': p.crowded ? 0.78 : 1,
    // Les pions du bas passent devant ceux du haut (vue legerement plongeante).
    zIndex: isSelectable(t) ? 40 : 10 + Math.round(p.y),
  }
}

function yardInactive(color: PlayerColor) {
  return !activePlayers.value.has(color)
}
</script>

<template>
  <div class="board-frame">
    <div class="board" :style="{ transform: `rotate(${rotation}deg)` }">
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
        <svg v-if="cell.kind === 'star'" class="star" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"
          />
        </svg>
      </div>

      <!-- fleches d'entree du couloir final -->
      <div
        v-for="a in ENTRY_ARROWS"
        :key="`entry-${a.color}`"
        class="board-arrow"
        :class="{ 'board-arrow--dim': yardInactive(a.color) }"
        :style="{
          left: pct(a.col),
          top: pct(a.row),
          width: pct(1),
          height: pct(1),
          '--arrow-color': COLOR_HEX[a.color],
          '--angle': `${a.angle}deg`,
        }"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10h9V5.5L21 12l-8 6.5V14H4z" />
        </svg>
      </div>

      <!-- fleches de depart (case de sortie) -->
      <div
        v-for="a in START_ARROWS"
        :key="`start-${a.color}`"
        class="board-arrow board-arrow--start"
        :style="{
          left: pct(a.col),
          top: pct(a.row),
          width: pct(1),
          height: pct(1),
          '--angle': `${a.angle}deg`,
        }"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10h9V5.5L21 12l-8 6.5V14H4z" />
        </svg>
      </div>

      <!-- garages -->
      <div
        v-for="color in ALL_COLORS"
        :key="color"
        class="yard"
        :class="[`yard--${color}`, { 'yard--inactive': yardInactive(color) }]"
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

      <!-- pions : seuls les pions jouables recoivent les clics, pour qu'un pion voisin ne
           "vole" jamais le tap sur une case chargee -->
      <div
        v-for="t in game.state.tokens"
        :key="`${t.color}-${t.id}`"
        class="pawn"
        :class="{
          'pawn--selectable': isSelectable(t),
          'pawn--home': t.step === MAX_STEP,
          'pawn--muted': selecting && !isSelectable(t),
        }"
        :style="pawnStyle(t)"
        @click="isSelectable(t) && game.playToken(t)"
      >
        <span v-if="isSelectable(t)" class="pawn-ring" />
        <svg class="pawn-body" viewBox="0 0 40 52" aria-hidden="true">
          <defs>
            <radialGradient :id="`pawn-${t.color}-${t.id}`" cx="38%" cy="28%" r="80%">
              <stop offset="0%" style="stop-color: var(--pawn-light)" />
              <stop offset="50%" style="stop-color: var(--pawn-color)" />
              <stop offset="100%" style="stop-color: var(--pawn-dark)" />
            </radialGradient>
          </defs>
          <ellipse cx="20" cy="45" rx="15" ry="5.5" class="pawn-base-shadow" />
          <path
            d="M7 44c0-4 5-6 7-12-3-2-5-5-5-9a11 11 0 0 1 22 0c0 4-2 7-5 9 2 6 7 8 7 12 0 3-6 5-13 5S7 47 7 44z"
            class="pawn-shape"
            :style="{ fill: `url(#pawn-${t.color}-${t.id})` }"
          />
          <ellipse cx="15.5" cy="19" rx="4" ry="5" class="pawn-shine" />
        </svg>
        <span v-if="isSelectable(t)" class="pawn-chevron" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Cadre en bois/laque : donne l'epaisseur du plateau (effet 3D sans deformer les clics). */
.board-frame {
  padding: 2.2%;
  border-radius: 22px;
  background: linear-gradient(160deg, #3b2f4a 0%, #231c2e 55%, #15111c 100%);
  box-shadow:
    0 2px 0 rgba(255, 255, 255, 0.08) inset,
    0 10px 0 #0d0a12,
    0 22px 40px rgba(0, 0, 0, 0.55);
}

.board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #f7f2e6;
  border-radius: 14px;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.15),
    inset 0 3px 8px rgba(0, 0, 0, 0.18);
  transition: transform 0.6s ease;
}

.cell {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid rgba(60, 45, 30, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #fffdf7, #efe7d6);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.9),
    inset -1px -1px 0 rgba(0, 0, 0, 0.06);
}

.cell--start,
.cell--home {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--cell-color) 70%, white),
    var(--cell-color) 60%,
    color-mix(in srgb, var(--cell-color) 85%, black)
  );
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.35),
    inset -1px -2px 2px rgba(0, 0, 0, 0.2);
}

/* Etoile des cases protegees : pleine, bien grasse, avec relief. */
.star {
  width: 78%;
  height: 78%;
  fill: #8d8272;
  stroke: #5a5146;
  stroke-width: 1.4;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.9));
}

.board-arrow {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 1;
}

.board-arrow svg {
  width: 80%;
  height: 80%;
  transform: rotate(var(--angle));
  fill: var(--arrow-color);
  stroke: color-mix(in srgb, var(--arrow-color) 70%, black);
  stroke-width: 1.2;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
}

.board-arrow--start svg {
  fill: rgba(255, 255, 255, 0.95);
  stroke: rgba(0, 0, 0, 0.25);
  width: 62%;
  height: 62%;
}

.board-arrow--dim {
  opacity: 0.35;
}

.yard {
  position: absolute;
  box-sizing: border-box;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--yard-color) 55%, white),
    var(--yard-color) 55%,
    color-mix(in srgb, var(--yard-color) 80%, black)
  );
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.35),
    inset 0 -4px 8px rgba(0, 0, 0, 0.25);
}

.yard--red {
  border-top-left-radius: 14px;
}
.yard--green {
  border-top-right-radius: 14px;
}
.yard--yellow {
  border-bottom-right-radius: 14px;
}
.yard--blue {
  border-bottom-left-radius: 14px;
}

.yard--inactive {
  background: #d9d2c3;
  filter: grayscale(1);
  opacity: 0.6;
}

.yard-inner {
  position: absolute;
  inset: 15%;
  background: linear-gradient(145deg, #fffdf7, #eee5d3);
  border-radius: 16%;
  box-shadow:
    inset 0 3px 6px rgba(0, 0, 0, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.5);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  place-items: center;
}

.yard-slot {
  width: 58%;
  height: 58%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--yard-color, #999) 18%, white);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.22);
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
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.25);
}

.center-inner {
  position: absolute;
  inset: 22%;
  background: radial-gradient(circle at 35% 30%, #fffdf7, #e9e0cc);
  border-radius: 50%;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.3),
    inset 0 -2px 3px rgba(0, 0, 0, 0.12);
}

/* --- Pions 3D : silhouette de pion debout, contre-tournee pour rester droite --- */

.pawn {
  position: absolute;
  width: calc(100% / 15 * 0.95);
  height: calc(100% / 15 * 1.24);
  transform: translate(-50%, -86%) rotate(var(--counter)) scale(var(--scale));
  transform-origin: 50% 86%;
  pointer-events: none;
  transition:
    left 0.15s ease-out,
    top 0.15s ease-out,
    transform 0.2s ease,
    opacity 0.2s ease;
}

.pawn-body {
  width: 100%;
  height: 100%;
  overflow: visible;
  display: block;
}

.pawn-base-shadow {
  fill: rgba(0, 0, 0, 0.35);
}

.pawn-shape {
  stroke: #fff;
  stroke-width: 2.4;
  paint-order: stroke;
  filter: drop-shadow(0 2px 1.5px rgba(0, 0, 0, 0.35));
}

.pawn-shine {
  fill: rgba(255, 255, 255, 0.55);
}

.pawn--home {
  opacity: 0.55;
}

.pawn--muted {
  opacity: 0.8;
}

/* Pion jouable : legerement souleve, cliquable sur une zone plus large que lui. */
.pawn--selectable {
  pointer-events: auto;
  cursor: pointer;
  transform: translate(-50%, -92%) rotate(var(--counter)) scale(calc(var(--scale) * 1.06));
}

.pawn--selectable::before {
  content: '';
  position: absolute;
  inset: -35% -45% -15%;
  border-radius: 50%;
}

.pawn--selectable:active {
  transform: translate(-50%, -86%) rotate(var(--counter)) scale(calc(var(--scale) * 0.94));
}

/* Anneau lumineux au sol, pile sous le pion : discret mais visible. */
.pawn-ring {
  position: absolute;
  left: 50%;
  top: 86%;
  width: 120%;
  aspect-ratio: 2.4;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 6px 1px var(--pawn-color);
  transform: translate(-50%, -50%);
  animation: ringPulse 1.1s ease-out infinite;
  pointer-events: none;
}

@keyframes ringPulse {
  0% {
    transform: translate(-50%, -50%) scale(0.75);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.25);
    opacity: 0;
  }
}

/* Petit chevron juste au-dessus de la tete du pion. */
.pawn-chevron {
  position: absolute;
  left: 50%;
  top: -24%;
  width: 34%;
  aspect-ratio: 1;
  border-right: 3px solid #fff;
  border-bottom: 3px solid #fff;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.7));
  transform: translateX(-50%) rotate(45deg);
  animation: chevronBob 0.9s ease-in-out infinite;
  pointer-events: none;
}

@keyframes chevronBob {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -3px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pawn-ring,
  .pawn-chevron {
    animation: none;
  }
}
</style>
