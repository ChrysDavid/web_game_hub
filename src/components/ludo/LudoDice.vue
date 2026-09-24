<script setup lang="ts">
/**
 * De 3D (cube CSS). Pendant le lancer, il culbute avec un petit rebond, puis se pose sur la face
 * tiree. La taille se regle avec la variable CSS `--size` du parent.
 */
import { ref, watch } from 'vue'

const props = defineProps<{
  value: number | null
  rolling: boolean
}>()

// Le de garde sa derniere face visible entre deux lancers (au lieu de revenir sur 1).
const shown = ref(props.value ?? 1)
watch(
  () => props.value,
  (v) => {
    if (v) shown.value = v
  },
)

// Rotation du cube pour amener la face voulue face a l'ecran (legerement incline pour le relief).
const faceRotation: Record<number, string> = {
  1: 'rotateX(-14deg) rotateY(16deg)',
  6: 'rotateX(-14deg) rotateY(196deg)',
  2: 'rotateX(-14deg) rotateY(-74deg)',
  5: 'rotateX(-14deg) rotateY(106deg)',
  3: 'rotateX(-104deg) rotateY(0deg) rotateZ(-16deg)',
  4: 'rotateX(76deg) rotateY(0deg) rotateZ(16deg)',
}

// Position des points sur une grille 3x3 (colonne, ligne), par face.
const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
  6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]],
}
</script>

<template>
  <div class="dice-scene" :class="{ 'dice-scene--rolling': rolling }">
    <div
      class="cube"
      :class="{ 'cube--rolling': rolling }"
      :style="!rolling ? { transform: faceRotation[shown] } : {}"
    >
      <div v-for="n in 6" :key="n" class="face" :class="`face-${n}`">
        <i
          v-for="([col, row], i) in PIPS[n]"
          :key="i"
          :style="{ gridColumn: col, gridRow: row }"
          :class="{ red: n === 1 }"
        />
      </div>
    </div>
    <div class="dice-shadow" />
  </div>
</template>

<style scoped>
.dice-scene {
  --size: 44px;
  --half: calc(var(--size) / 2);
  width: var(--size);
  height: var(--size);
  perspective: 500px;
  position: relative;
}

.dice-scene--rolling .cube {
  animation:
    diceTumble 0.55s linear infinite,
    diceHop 0.55s ease-in-out infinite;
}

.cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.2, 1.3, 0.35, 1);
}

@keyframes diceTumble {
  from {
    transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  to {
    transform: translateY(0) rotateX(360deg) rotateY(720deg) rotateZ(180deg);
  }
}

@keyframes diceHop {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -28%;
  }
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 13%;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 30% 25%, #ffffff 0%, #f6f1e7 55%, #e4dccb 100%);
  border-radius: 16%;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.08),
    inset -3px -4px 6px rgba(120, 100, 70, 0.22),
    inset 3px 3px 5px rgba(255, 255, 255, 0.9);
  backface-visibility: hidden;
}

/* Points bien gras, creuses dans la face (degrade + ombre interne). */
.face i {
  width: 82%;
  aspect-ratio: 1;
  border-radius: 50%;
  align-self: center;
  justify-self: center;
  background: radial-gradient(circle at 35% 30%, #4a4552 0%, #16131b 60%, #000 100%);
  box-shadow:
    inset 0 2px 2px rgba(0, 0, 0, 0.6),
    0 1px 0 rgba(255, 255, 255, 0.85);
}

/* Le "1" en rouge, comme sur les des classiques. */
.face i.red {
  width: 95%;
  background: radial-gradient(circle at 35% 30%, #ff6b6b 0%, #c81e1e 60%, #7a0d0d 100%);
}

.face-1 {
  transform: translateZ(var(--half));
}
.face-6 {
  transform: rotateY(180deg) translateZ(var(--half));
}
.face-2 {
  transform: rotateY(90deg) translateZ(var(--half));
}
.face-5 {
  transform: rotateY(-90deg) translateZ(var(--half));
}
.face-3 {
  transform: rotateX(90deg) translateZ(var(--half));
}
.face-4 {
  transform: rotateX(-90deg) translateZ(var(--half));
}

.dice-shadow {
  position: absolute;
  left: 50%;
  bottom: -18%;
  width: 80%;
  height: 20%;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45), transparent 70%);
  transform: translateX(-50%);
  border-radius: 50%;
  pointer-events: none;
}

.dice-scene--rolling .dice-shadow {
  animation: shadowHop 0.55s ease-in-out infinite;
}

@keyframes shadowHop {
  0%,
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) scale(0.7);
    opacity: 0.55;
  }
}
</style>
