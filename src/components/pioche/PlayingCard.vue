<script setup lang="ts">
import { computed } from 'vue'
import { RANK_LABEL, SUIT_COLOR, SUIT_SYMBOL, type Card } from '@/games/pioche/constants'

// Taille pilotee par la variable CSS --card-w du parent ; tout le reste en decoule.
const props = withDefaults(defineProps<{ card?: Card | null; faceDown?: boolean }>(), {
  card: null,
  faceDown: false,
})

// Position des symboles au centre de la carte (x, y en %), `true` = symbole retourne (bas de carte).
const L = 30
const M = 50
const R = 70
const PIPS: Record<number, [number, number, boolean?][]> = {
  2: [[M, 22], [M, 78, true]],
  3: [[M, 22], [M, 50], [M, 78, true]],
  4: [[L, 22], [R, 22], [L, 78, true], [R, 78, true]],
  5: [[L, 22], [R, 22], [M, 50], [L, 78, true], [R, 78, true]],
  6: [[L, 22], [R, 22], [L, 50], [R, 50], [L, 78, true], [R, 78, true]],
  7: [[L, 22], [R, 22], [M, 36], [L, 50], [R, 50], [L, 78, true], [R, 78, true]],
  8: [[L, 22], [R, 22], [M, 36], [L, 50], [R, 50], [M, 64, true], [L, 78, true], [R, 78, true]],
  9: [[L, 22], [R, 22], [L, 41], [R, 41], [M, 50], [L, 59, true], [R, 59, true], [L, 78, true], [R, 78, true]],
  10: [[L, 22], [R, 22], [M, 32], [L, 41], [R, 41], [L, 59, true], [R, 59, true], [M, 68, true], [L, 78, true], [R, 78, true]],
}

const symbol = computed(() => (props.card ? SUIT_SYMBOL[props.card.suit] : ''))
const color = computed(() => (props.card ? SUIT_COLOR[props.card.suit] : 'black'))
const label = computed(() => (props.card ? RANK_LABEL[props.card.rank] : ''))
const pips = computed(() => (props.card ? (PIPS[props.card.rank] ?? []) : []))
const isFace = computed(() => !!props.card && props.card.rank >= 11 && props.card.rank <= 13)
const isAce = computed(() => props.card?.rank === 14)
</script>

<template>
  <div class="card" :class="faceDown || !card ? 'card--back' : `card--front suit-${color}`">
    <template v-if="!faceDown && card">
      <span class="corner corner--top">
        <b>{{ label }}</b><i>{{ symbol }}</i>
      </span>
      <span class="corner corner--bottom">
        <b>{{ label }}</b><i>{{ symbol }}</i>
      </span>
      <span v-if="isAce" class="ace">{{ symbol }}</span>
      <span v-else-if="isFace" class="face">
        <b>{{ label }}</b>
        <i>{{ symbol }}</i>
      </span>
      <span
        v-for="([x, y, flip], i) in pips"
        v-else
        :key="i"
        class="pip"
        :class="{ 'pip--flip': flip }"
        :style="{ left: `${x}%`, top: `${y}%` }"
        >{{ symbol }}</span
      >
    </template>
    <span v-else class="back-emblem">♥</span>
  </div>
</template>

<style scoped>
.card {
  --w: var(--card-w, 64px);
  position: relative;
  width: var(--w);
  height: calc(var(--w) * 1.4);
  border-radius: calc(var(--w) * 0.08);
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.25),
    0 calc(var(--w) * 0.05) calc(var(--w) * 0.12) rgba(0, 0, 0, 0.28);
  flex-shrink: 0;
  overflow: hidden;
  user-select: none;
  font-family: Georgia, 'Times New Roman', serif;
}

.card--front {
  background: linear-gradient(160deg, #ffffff 0%, #f6f1e6 100%);
  border: 1px solid rgba(0, 0, 0, 0.16);
}

.suit-black {
  color: #17151d;
}

.suit-red {
  color: #d3263a;
}

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 0.95;
}

.corner b {
  font-size: calc(var(--w) * 0.21);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.corner i {
  font-style: normal;
  font-size: calc(var(--w) * 0.17);
}

.corner--top {
  top: 4%;
  left: 6%;
}

.corner--bottom {
  bottom: 4%;
  right: 6%;
  transform: rotate(180deg);
}

.pip {
  position: absolute;
  font-size: calc(var(--w) * 0.22);
  line-height: 1;
  transform: translate(-50%, -50%);
}

.pip--flip {
  transform: translate(-50%, -50%) rotate(180deg);
}

.ace {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--w) * 0.62);
}

/* Figures : cadre colore avec la lettre, sans dessin copie d'un jeu existant. */
.face {
  position: absolute;
  inset: 16% 18%;
  border-radius: calc(var(--w) * 0.05);
  border: calc(var(--w) * 0.02) solid currentColor;
  background:
    repeating-linear-gradient(45deg, transparent 0 6%, color-mix(in srgb, currentColor 8%, transparent) 6% 12%),
    linear-gradient(180deg, #fff8e4, #f3e2b5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.face b {
  font-size: calc(var(--w) * 0.42);
}

.face i {
  font-style: normal;
  font-size: calc(var(--w) * 0.24);
}

.card--back {
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.18) 0 calc(var(--w) * 0.02), transparent calc(var(--w) * 0.03)) 0 0 /
      calc(var(--w) * 0.14) calc(var(--w) * 0.14),
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0 1px, transparent 1px calc(var(--w) * 0.07)),
    repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.1) 0 1px, transparent 1px calc(var(--w) * 0.07)),
    linear-gradient(160deg, #2c56b8, #183a86);
  border: calc(var(--w) * 0.05) solid #fbf8f1;
  display: grid;
  place-items: center;
}

.back-emblem {
  width: 46%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fbf8f1;
  color: #e2447b;
  font-size: calc(var(--w) * 0.24);
  line-height: 1;
}
</style>
