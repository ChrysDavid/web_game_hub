<script setup lang="ts">
import type { GameMeta } from '@/games/gamesList'

defineProps<{ game: GameMeta }>()
</script>

<template>
  <RouterLink :to="game.route" class="game-card">
    <div class="thumbnail-wrap">
      <img :src="game.thumbnail" :alt="game.title" class="thumbnail" />
      <span class="badge" :class="game.type === '3D' ? 'badge-3d' : 'badge-2d'">
        {{ game.type }}
      </span>
    </div>
    <h3>{{ game.title }}</h3>
  </RouterLink>
</template>

<style scoped>
.game-card {
  display: block;
  border-radius: 16px;
  overflow: hidden;
  background: var(--color-bg-alt);
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.game-card:hover {
  transform: translateY(-4px);
  border-color: rgba(226, 68, 123, 0.4);
}

.thumbnail-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #26222f;
}

.badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
  color: white;
}

.badge-2d { background: #4a7dd8; }
.badge-3d { background: #d84a8f; }

h3 {
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 600;
}
</style>
