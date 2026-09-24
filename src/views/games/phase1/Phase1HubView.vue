<script setup lang="ts">
import { PHASE1_GAMES } from '@/games/phase1/catalog'

const sections = [
  { key: 'amour', title: 'Pour l’amour', games: PHASE1_GAMES.filter((g) => g.intention === 'amour') },
  { key: 'amitie', title: 'Pour l’amitié', games: PHASE1_GAMES.filter((g) => g.intention === 'amitie') },
]
</script>

<template>
  <main class="hub">
    <header class="head">
      <RouterLink to="/" class="back" aria-label="Retour aux jeux">‹</RouterLink>
      <div>
        <h1>Jeux de compatibilité</h1>
        <p>Phase 1 · chacun joue seul, sous pseudo. Sur le site, ton groupe est composé de robots.</p>
      </div>
    </header>

    <section v-for="s in sections" :key="s.key" class="section">
      <h2>{{ s.title }}</h2>
      <div class="grid">
        <RouterLink
          v-for="g in s.games"
          :key="g.id"
          :to="`/jeux/phase1/${g.id}`"
          class="tile"
          :style="{ '--accent': g.color }"
        >
          <span class="emoji">{{ g.emoji }}</span>
          <span class="title">{{ g.title }}</span>
          <span class="meta">{{ g.criterion }} · {{ g.weight }} %</span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hub {
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 760px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  background: #fbf7f2;
  color: #1e1a1d;
  font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
}

.head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.back {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: white;
  color: #1e1a1d;
  font-size: 26px;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(30, 26, 29, 0.08);
}

h1,
h2 {
  font-family: 'Fraunces', Georgia, serif;
}

h1 {
  font-size: 28px;
}

.head p {
  margin-top: 4px;
  font-size: 14px;
  color: #6d6168;
}

.section {
  margin-bottom: 26px;
}

.section h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 16px;
  border-radius: 22px;
  background: white;
  border: 1px solid #eadfd3;
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.tile:hover,
.tile:focus-visible {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 22%, transparent);
}

.emoji {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 30px;
  background: color-mix(in srgb, var(--accent) 15%, white);
  margin-bottom: 4px;
}

.title {
  font-weight: 800;
  font-size: 16px;
}

.meta {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}
</style>
