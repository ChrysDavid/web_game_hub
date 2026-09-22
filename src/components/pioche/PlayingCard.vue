<script setup lang="ts">
import { computed } from 'vue'
import { RANK_LABEL, SUIT_COLOR, SUIT_SYMBOL, type Card } from '@/games/pioche/constants'

const props = withDefaults(
  defineProps<{
    card?: Card | null
    faceDown?: boolean
    accent?: string
  }>(),
  {
    card: null,
    faceDown: false,
    accent: '#e2447b',
  },
)

const suitSymbol = computed(() => (props.card ? SUIT_SYMBOL[props.card.suit] : ''))
const suitColor = computed(() => (props.card ? SUIT_COLOR[props.card.suit] : 'black'))
const rankLabel = computed(() => (props.card ? RANK_LABEL[props.card.rank] : ''))
</script>

<template>
  <div class="playing-card" :class="{ 'is-back': faceDown || !card }" :style="{ '--accent': accent }">
    <div v-if="faceDown || !card" class="back-face">
      <div class="back-pattern" />
    </div>
    <div v-else class="front-face" :class="`suit-${suitColor}`">
      <span class="corner corner-top">{{ rankLabel }}<br />{{ suitSymbol }}</span>
      <span class="pip">{{ suitSymbol }}</span>
      <span class="corner corner-bottom">{{ rankLabel }}<br />{{ suitSymbol }}</span>
    </div>
  </div>
</template>

<style scoped>
.playing-card {
  width: var(--card-w, 56px);
  height: calc(var(--card-w, 56px) * 1.42);
  border-radius: 8%;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
  position: relative;
  flex-shrink: 0;
}

.front-face {
  width: 100%;
  height: 100%;
  border-radius: 8%;
  background: #f7f2e6;
  border: 1px solid rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
}

.suit-black {
  color: #16141c;
}

.suit-red {
  color: #d94141;
}

.pip {
  font-size: clamp(18px, 3.4vw, 28px);
}

.corner {
  position: absolute;
  font-size: clamp(9px, 1.8vw, 12px);
  font-weight: 700;
  line-height: 1.05;
  text-align: center;
}

.corner-top {
  top: 6%;
  left: 8%;
}

.corner-bottom {
  bottom: 6%;
  right: 8%;
  transform: rotate(180deg);
}

.back-face {
  width: 100%;
  height: 100%;
  border-radius: 8%;
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #1c1926));
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-sizing: border-box;
  padding: 12%;
}

.back-pattern {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  background-image: radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px);
  background-size: 6px 6px;
}
</style>
