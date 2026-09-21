<script setup lang="ts">
defineProps<{
  value: number | null
  rolling: boolean
  accent: string
}>()

// Rotation du cube pour amener la face voulue devant la camera.
const faceRotation: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  6: 'rotateX(0deg) rotateY(180deg)',
  2: 'rotateX(0deg) rotateY(-90deg)',
  5: 'rotateX(0deg) rotateY(90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)',
  4: 'rotateX(90deg) rotateY(0deg)',
}
</script>

<template>
  <div class="dice-scene" :style="{ '--accent': accent }">
    <div
      class="cube"
      :class="{ 'cube--rolling': rolling }"
      :style="!rolling && value ? { transform: faceRotation[value] } : {}"
    >
      <div class="face face-1"><i /></div>
      <div class="face face-2"><i /><i /></div>
      <div class="face face-3"><i /><i /><i /></div>
      <div class="face face-4"><i /><i /><i /><i /></div>
      <div class="face face-5"><i /><i /><i /><i /><i /></div>
      <div class="face face-6"><i /><i /><i /><i /><i /><i /></div>
    </div>
    <div class="dice-shadow" :class="{ 'dice-shadow--rolling': rolling }" />
  </div>
</template>

<style scoped>
.dice-scene {
  --size: clamp(46px, 13vw, 64px);
  width: var(--size);
  height: var(--size);
  perspective: 400px;
  position: relative;
}

.cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.2, 0.85, 0.25, 1);
}

.cube--rolling {
  animation: diceSpin 0.5s linear infinite;
}

@keyframes diceSpin {
  from {
    transform: rotateX(0deg) rotateY(0deg);
  }
  to {
    transform: rotateX(360deg) rotateY(360deg);
  }
}

.face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 15%;
  box-sizing: border-box;
  background: linear-gradient(135deg, #ffffff, #e6e0d2);
  border-radius: 18%;
  border: 2px solid var(--accent);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.face i {
  width: 100%;
  aspect-ratio: 1;
  max-width: 24%;
  border-radius: 50%;
  background: #0a0a0a;
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.15),
    0 1px 1px rgba(255, 255, 255, 0.3);
  align-self: center;
  justify-self: center;
}

.face-1 {
  transform: translateZ(calc(var(--size) / 2));
}
.face-6 {
  transform: rotateY(180deg) translateZ(calc(var(--size) / 2));
}
.face-2 {
  transform: rotateY(90deg) translateZ(calc(var(--size) / 2));
}
.face-5 {
  transform: rotateY(-90deg) translateZ(calc(var(--size) / 2));
}
.face-3 {
  transform: rotateX(90deg) translateZ(calc(var(--size) / 2));
}
.face-4 {
  transform: rotateX(-90deg) translateZ(calc(var(--size) / 2));
}

.face-1 i {
  grid-column: 2;
  grid-row: 2;
}

.face-2 i:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}
.face-2 i:nth-child(2) {
  grid-column: 3;
  grid-row: 3;
}

.face-3 i:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}
.face-3 i:nth-child(2) {
  grid-column: 2;
  grid-row: 2;
}
.face-3 i:nth-child(3) {
  grid-column: 3;
  grid-row: 3;
}

.face-4 i:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}
.face-4 i:nth-child(2) {
  grid-column: 3;
  grid-row: 1;
}
.face-4 i:nth-child(3) {
  grid-column: 1;
  grid-row: 3;
}
.face-4 i:nth-child(4) {
  grid-column: 3;
  grid-row: 3;
}

.face-5 i:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}
.face-5 i:nth-child(2) {
  grid-column: 3;
  grid-row: 1;
}
.face-5 i:nth-child(3) {
  grid-column: 2;
  grid-row: 2;
}
.face-5 i:nth-child(4) {
  grid-column: 1;
  grid-row: 3;
}
.face-5 i:nth-child(5) {
  grid-column: 3;
  grid-row: 3;
}

.face-6 i:nth-child(1) {
  grid-column: 1;
  grid-row: 1;
}
.face-6 i:nth-child(2) {
  grid-column: 1;
  grid-row: 2;
}
.face-6 i:nth-child(3) {
  grid-column: 1;
  grid-row: 3;
}
.face-6 i:nth-child(4) {
  grid-column: 3;
  grid-row: 1;
}
.face-6 i:nth-child(5) {
  grid-column: 3;
  grid-row: 2;
}
.face-6 i:nth-child(6) {
  grid-column: 3;
  grid-row: 3;
}

.dice-shadow {
  position: absolute;
  left: 50%;
  bottom: -22%;
  width: 70%;
  height: 18%;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.4), transparent 70%);
  transform: translateX(-50%);
  border-radius: 50%;
  transition: opacity 0.3s ease;
}

.dice-shadow--rolling {
  opacity: 0.6;
  animation: shadowPulse 0.5s linear infinite;
}

@keyframes shadowPulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(0.85); }
}
</style>
