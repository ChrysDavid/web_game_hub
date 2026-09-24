<script setup lang="ts">
import { computed } from 'vue'
import type { Phase1Game } from '@/games/phase1/catalog'
import { ROBOTS, type Robot } from '@/games/phase1/robots'
import type { PairResult } from '@/games/phase1/scoring'

const props = withDefaults(
  defineProps<{
    game: Phase1Game
    phase: 'intro' | 'play' | 'result'
    step?: number
    total?: number
    /** Avancement de chaque robot (meme unite que `step`). */
    group?: Record<string, number>
    pairs?: PairResult[]
  }>(),
  { step: 0, total: 1, group: () => ({}), pairs: () => [] },
)

defineEmits<{ start: []; replay: [] }>()

const sortedPairs = computed(() => props.pairs.slice().sort((a, b) => b.score - a.score))
const intentionLabel = computed(() => (props.game.intention === 'amour' ? 'Amour' : 'Amitié'))

function robotDone(robot: Robot) {
  return Math.min(1, (props.group[robot.id] ?? 0) / props.total)
}

function scoreColor(score: number) {
  if (score >= 70) return '#3f8f63'
  if (score >= 45) return '#e39a2f'
  return '#c2185b'
}
</script>

<template>
  <div class="p1" :style="{ '--accent': game.color }">
    <header class="top">
      <RouterLink to="/jeux/phase1" class="back" aria-label="Retour aux jeux de phase 1">‹</RouterLink>
      <span class="top-title">{{ game.title }}</span>
      <span class="chip">{{ intentionLabel }}</span>
    </header>

    <!-- Accueil du jeu -->
    <section v-if="phase === 'intro'" class="intro">
      <div class="emoji">{{ game.emoji }}</div>
      <h1>{{ game.title }}</h1>
      <p class="instruction">{{ game.instruction }}</p>
      <div class="group-preview">
        <p>Ton groupe joue les mêmes défis, chacun de son côté :</p>
        <div class="avatars">
          <span class="avatar avatar--me">Toi</span>
          <span v-for="r in ROBOTS" :key="r.id" class="avatar" :style="{ background: r.color }">{{ r.name }}</span>
        </div>
        <small>Sur le site, les autres membres sont des robots.</small>
      </div>
      <button class="primary" @click="$emit('start')">Commencer</button>
    </section>

    <!-- Partie -->
    <section v-else-if="phase === 'play'" class="play">
      <div class="progress" role="progressbar" :aria-valuenow="step" :aria-valuemax="total">
        <span :style="{ width: `${Math.min(100, (step / total) * 100)}%` }" />
      </div>
      <div class="group-live">
        <span class="mini mini--me">Toi</span>
        <span
          v-for="r in ROBOTS"
          :key="r.id"
          class="mini"
          :style="{ '--c': r.color, '--done': robotDone(r) }"
          :title="`${r.name} joue aussi`"
        >
          {{ r.name[0] }}
          <i v-if="robotDone(r) >= 1" class="check">✓</i>
        </span>
      </div>
      <slot />
    </section>

    <!-- Resultats -->
    <section v-else class="result">
      <div class="card">
        <h2>Ton résultat</h2>
        <slot name="mine" />
      </div>

      <div class="card">
        <h2>Compatibilité avec ton groupe</h2>
        <ul class="pairs">
          <li v-for="p in sortedPairs" :key="p.robot.id">
            <span class="avatar avatar--small" :style="{ background: p.robot.color }">{{ p.robot.name[0] }}</span>
            <div class="pair-body">
              <div class="pair-head">
                <strong>{{ p.robot.name }}</strong>
                <span class="score" :style="{ color: scoreColor(p.score) }">{{ p.score }} %</span>
              </div>
              <div class="bar"><span :style="{ width: `${p.score}%`, background: scoreColor(p.score) }" /></div>
              <small>{{ p.detail }}</small>
            </div>
          </li>
        </ul>
      </div>

      <div class="card card--explain">
        <h2>Ce que ce jeu mesure</h2>
        <p class="criterion">
          {{ game.criterion }} · <b>{{ game.weight }} %</b> du score {{ game.intention === 'amour' ? 'amour' : 'amitié' }}
        </p>
        <p>{{ game.measures }}</p>
        <p class="note">
          Dans l'app, le jeu n'envoie que tes réponses. C'est le serveur qui compare chaque paire du groupe et
          ajoute ces points au score de compatibilité, sans jamais révéler qui est qui.
        </p>
      </div>

      <div class="actions">
        <button class="primary" @click="$emit('replay')">Rejouer</button>
        <RouterLink to="/jeux/phase1" class="secondary">Autres jeux</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.p1 {
  --ink: #1e1a1d;
  --muted: #6d6168;
  --paper: #fbf7f2;
  --line: #eadfd3;
  min-height: 100vh;
  min-height: 100dvh;
  max-width: 560px;
  margin: 0 auto;
  padding: 12px 16px 32px;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
}

.top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.back {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: white;
  color: var(--ink);
  font-size: 26px;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(30, 26, 29, 0.08);
}

.top-title {
  flex: 1;
  font-weight: 700;
  font-size: 15px;
}

.chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 14%, white);
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
}

h1,
h2 {
  font-family: 'Fraunces', Georgia, serif;
}

.intro {
  text-align: center;
  padding-top: 20px;
}

.emoji {
  width: 110px;
  height: 110px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 54px;
  background: color-mix(in srgb, var(--accent) 16%, white);
  box-shadow: 0 10px 30px color-mix(in srgb, var(--accent) 25%, transparent);
}

.intro h1 {
  font-size: 32px;
  margin-bottom: 10px;
}

.instruction {
  font-size: 16px;
  line-height: 1.5;
  color: var(--muted);
  margin-bottom: 26px;
}

.group-preview {
  padding: 16px;
  border-radius: 18px;
  background: white;
  border: 1px solid var(--line);
  margin-bottom: 26px;
  font-size: 14px;
  color: var(--muted);
}

.group-preview small {
  display: block;
  margin-top: 10px;
  font-size: 12px;
}

.avatars {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.avatar {
  padding: 6px 12px;
  border-radius: 999px;
  color: white;
  font-weight: 700;
  font-size: 13px;
}

.avatar--me {
  background: var(--ink);
}

.avatar--small {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.primary {
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 16px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 35%, transparent);
}

.primary:active {
  transform: scale(0.98);
}

.secondary {
  display: block;
  margin-top: 10px;
  text-align: center;
  color: var(--muted);
  font-weight: 700;
  text-decoration: none;
  padding: 10px;
}

.progress {
  height: 8px;
  border-radius: 99px;
  background: var(--line);
  overflow: hidden;
  margin-bottom: 12px;
}

.progress span {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: var(--accent);
  transition: width 0.4s ease;
}

.group-live {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 18px;
}

.mini {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  color: white;
  background: conic-gradient(var(--c) calc(var(--done) * 360deg), #d8ccc0 0);
}

.mini--me {
  background: var(--ink);
  font-size: 10px;
}

.check {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #3f8f63;
  color: white;
  font-size: 10px;
  font-style: normal;
}

.card {
  padding: 18px;
  border-radius: 20px;
  background: white;
  border: 1px solid var(--line);
  margin-bottom: 14px;
}

.card h2 {
  font-size: 20px;
  margin-bottom: 12px;
}

.pairs {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pairs li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.pair-body {
  flex: 1;
}

.pair-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.score {
  font-weight: 800;
}

.bar {
  height: 8px;
  border-radius: 99px;
  background: var(--line);
  overflow: hidden;
  margin-bottom: 4px;
}

.bar span {
  display: block;
  height: 100%;
  border-radius: 99px;
  animation: grow 0.8s ease-out;
}

.pair-body small {
  color: var(--muted);
  font-size: 12px;
}

.card--explain p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
  margin-bottom: 8px;
}

.card--explain .criterion {
  color: var(--ink);
  font-weight: 700;
}

.note {
  font-size: 12px !important;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--paper);
}

@keyframes grow {
  from {
    width: 0;
  }
}
</style>
