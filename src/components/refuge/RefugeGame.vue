<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import Phaser from 'phaser'
import { RefugeScene, type RefugeHud } from '@/games/refuge/RefugeScene'

const container = ref<HTMLDivElement | null>(null)
let game: Phaser.Game | null = null

// Objet reactif Vue, mute directement par la scene Phaser (pas d'event bus
// necessaire : Phaser ecrit dedans, Vue re-rend automatiquement).
const hud = reactive<RefugeHud>({
  wood: 0,
  stone: 0,
  buildProgress: 0,
  buildRequired: { wood: 6, stone: 4 },
  message: '',
  phase: 'gather',
})

onMounted(() => {
  if (!container.value) return
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container.value,
    width: 960,
    height: 640,
    backgroundColor: '#3d6b3f',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [RefugeScene],
  })
  game.scene.start('refuge', { hud })
})

onBeforeUnmount(() => {
  game?.destroy(true)
  game = null
})
</script>

<template>
  <div class="refuge-game">
    <div ref="container" class="canvas-wrap" />

    <div class="hud">
      <div class="resources">
        <span class="res">🪵 {{ hud.wood }} / {{ hud.buildRequired.wood }}</span>
        <span class="res">🪨 {{ hud.stone }} / {{ hud.buildRequired.stone }}</span>
      </div>
      <p class="message">{{ hud.message }}</p>
      <div v-if="hud.phase === 'build'" class="build-bar">
        <div class="build-bar-fill" :style="{ width: `${hud.buildProgress * 100}%` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.refuge-game {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.canvas-wrap {
  width: 100%;
  aspect-ratio: 960 / 640;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
}

.canvas-wrap :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.hud {
  margin-top: 14px;
  text-align: center;
}

.resources {
  display: flex;
  justify-content: center;
  gap: 20px;
  font-size: clamp(14px, 4vw, 17px);
  font-weight: 700;
}

.message {
  color: var(--color-text-muted);
  font-size: clamp(12px, 3.2vw, 14px);
  min-height: 18px;
  margin-top: 8px;
}

.build-bar {
  width: min(320px, 90%);
  height: 10px;
  margin: 10px auto 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.build-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.15s linear;
}
</style>
