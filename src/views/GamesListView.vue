<script setup lang="ts">
import { ref, computed } from 'vue'
import { gamesList, categoryLabels, type GameCategory } from '@/games/gamesList'
import GameCard from '@/components/GameCard.vue'

const active = ref<GameCategory | 'all'>('all')

const filtered = computed(() =>
  active.value === 'all'
    ? gamesList
    : gamesList.filter((g) => g.category === active.value),
)

const categories = Object.keys(categoryLabels) as GameCategory[]
</script>

<template>
  <main class="games-page">
    <div class="filters">
      <button :class="{ active: active === 'all' }" @click="active = 'all'">
        Tous
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        :class="{ active: active === cat }"
        @click="active = cat"
      >
        {{ categoryLabels[cat] }}
      </button>
    </div>

    <div class="games-grid">
      <GameCard v-for="game in filtered" :key="game.id" :game="game" />
    </div>
  </main>
</template>

<style scoped>
.games-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.filters button {
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.filters button:hover {
  border-color: rgba(226, 68, 123, 0.4);
  color: var(--color-text);
}

.filters button.active {
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-color: transparent;
  color: white;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 18px;
}
</style>
