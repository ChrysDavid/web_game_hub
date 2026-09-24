<script setup lang="ts">
import { soundSettings, toggleMute } from '@/services/sound'
</script>

<template>
  <button
    class="sound-toggle"
    :aria-label="soundSettings.muted ? 'Activer le son' : 'Couper le son'"
    :aria-pressed="!soundSettings.muted"
    @click="toggleMute"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <template v-if="soundSettings.muted">
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </template>
      <template v-else>
        <path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </template>
    </svg>
  </button>
</template>

<style scoped>
.sound-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.75);
  color: #3a2414;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.sound-toggle svg {
  width: 22px;
  height: 22px;
}
</style>
