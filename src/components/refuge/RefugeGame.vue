<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Phaser from 'phaser'
import { RefugeScene, type RefugeHud } from '@/games/refuge/RefugeScene'
import { CHAPTERS } from '@/games/refuge/story'
import { MAX_ENERGY, PROVISIONS, SHOP, canBuy, type ProvisionId, type ShopId } from '@/games/refuge/economy'
import SoundToggle from '@/components/SoundToggle.vue'
import { MISSION_ENERGY, type Role } from '@/games/refuge/missions'
import HuntMission from './HuntMission.vue'
import MarketMission from './MarketMission.vue'

const container = ref<HTMLDivElement | null>(null)
let game: Phaser.Game | null = null

// Etat mute par la scene Phaser ; Vue affiche l'interface par-dessus le monde.
const hud = reactive<RefugeHud>({
  state: 'title',
  chapter: 0,
  chapterTitle: '',
  letter: null,
  objectives: [],
  hint: '',
  toast: '',
  coins: 0,
  earned: 0,
  energy: 0,
  bag: null,
  stand: { built: false, mangoes: 0, juice: 0 },
  owned: [],
  shopOpen: false,
})

const questOpen = ref(true)
const shopTab = ref<'provisions' | 'maison' | 'maquis' | 'monde'>('provisions')

onMounted(() => {
  if (!container.value) return
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container.value,
    backgroundColor: '#5a8f4e',
    pixelArt: true,
    // Le monde remplit tout l'ecran (portrait ou paysage) ; la camera suit le personnage.
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [RefugeScene],
  })
  game.scene.start('refuge', { hud })
})

onBeforeUnmount(() => {
  game?.destroy(true)
  game = null
})

function send(event: string, arg?: unknown) {
  game?.events.emit(event, arg)
}

const energyColor = computed(() => (hud.energy < 20 ? '#e0453a' : hud.energy < 50 ? '#f2a51a' : '#4caf6a'))
const bagIcon = computed(() => (hud.bag ? { wood: '🪵', stone: '🪨', mango: '🥭' }[hud.bag.kind] : ''))
const shopItems = computed(() => SHOP.filter((i) => i.group === shopTab.value))

function buy(id: ShopId) {
  send('refuge:buy', id)
}

function provision(id: ProvisionId) {
  send('refuge:provision', id)
}

// Missions a risque : dans l'app, chacun joue son role sur son telephone ; ici, on choisit le sien.
const mission = ref<'pick' | Role | null>(null)

function openMissions() {
  if (hud.energy < MISSION_ENERGY) {
    hud.toast = `Trop fatigué pour une mission (il faut ${MISSION_ENERGY} d’énergie). Mange d’abord 🍛`
    setTimeout(() => (hud.toast = ''), 3000)
    return
  }
  mission.value = 'pick'
}

function missionDone(role: Role, coins: number) {
  mission.value = null
  send('refuge:mission', { role, coins })
}

function lockedLabel(from: number) {
  return `Chapitre ${from}`
}
</script>

<template>
  <div class="refuge">
    <div ref="container" class="world" />

    <!-- Interface de jeu -->
    <template v-if="hud.state === 'play'">
      <header class="topbar">
        <RouterLink to="/" class="menu-btn" aria-label="Revenir au menu des jeux">⌂ Menu</RouterLink>
        <button class="chapter" @click="questOpen = !questOpen">
          <span>Ch. {{ hud.chapter }}</span> {{ hud.chapterTitle }} <i>{{ questOpen ? '▴' : '▾' }}</i>
        </button>
        <span class="coins">💰 {{ hud.coins }} F</span>
        <SoundToggle class="round" />
      </header>

      <div class="energy" :title="`Énergie ${hud.energy}/${MAX_ENERGY}`">
        <span>⚡</span>
        <div class="energy-bar"><i :style="{ width: `${(hud.energy / MAX_ENERGY) * 100}%`, background: energyColor }" /></div>
      </div>

      <Transition name="fold">
        <ul v-if="questOpen" class="quest">
          <li v-for="o in hud.objectives" :key="o.label" :class="{ done: o.done >= o.total }">
            <span class="q-icon">{{ o.done >= o.total ? '✅' : o.icon }}</span>
            <span class="q-label">{{ o.label }}</span>
            <span class="q-count">{{ o.total === 100 ? `${o.done}%` : `${o.done}/${o.total}` }}</span>
          </li>
        </ul>
      </Transition>

      <Transition name="toast">
        <p v-if="hud.toast" class="toast">{{ hud.toast }}</p>
      </Transition>

      <footer class="dock">
        <p v-if="hud.hint" class="hint">{{ hud.hint }}</p>
        <div class="dock-row">
          <div class="bag" :class="{ empty: !hud.bag }">
            <template v-if="hud.bag">{{ bagIcon }} ×{{ hud.bag.count }}</template>
            <template v-else>🎒 vide</template>
          </div>
          <div v-if="hud.stand.built" class="stand-chip">🥭 {{ hud.stand.mangoes }} · 🧃 {{ hud.stand.juice }}</div>
          <button v-if="hud.bag?.kind === 'mango'" class="action eat" @click="send('refuge:eat')">Manger 🥭</button>
        </div>
        <div class="nav">
          <button class="nav-btn" @click="send('refuge:goto', 'home')"><span>🏠</span>Maison</button>
          <button v-if="hud.chapter >= 3" class="nav-btn" @click="send('refuge:goto', 'stand')"><span>🧃</span>Maquis</button>
          <button class="nav-btn" @click="send('refuge:goto', 'market')"><span>🛒</span>Marché</button>
          <button class="nav-btn mission-btn" @click="openMissions"><span>🎯</span>Missions</button>
        </div>
      </footer>
    </template>

    <!-- Boutique du marche : feuille qui monte du bas (pouce-friendly) -->
    <Transition name="sheet">
      <div v-if="hud.shopOpen" class="sheet-backdrop" @click.self="hud.shopOpen = false">
        <section class="sheet">
          <div class="sheet-head">
            <h2>Marché du village</h2>
            <span class="coins">💰 {{ hud.coins }} F</span>
            <button class="close" aria-label="Fermer" @click="hud.shopOpen = false">✕</button>
          </div>
          <nav class="tabs">
            <button :class="{ on: shopTab === 'provisions' }" @click="shopTab = 'provisions'">Provisions</button>
            <button :class="{ on: shopTab === 'maison' }" @click="shopTab = 'maison'">Maison</button>
            <button :class="{ on: shopTab === 'maquis' }" @click="shopTab = 'maquis'">Maquis</button>
            <button :class="{ on: shopTab === 'monde' }" @click="shopTab = 'monde'">Monde</button>
          </nav>
          <div class="items">
            <template v-if="shopTab === 'provisions'">
              <article v-for="p in PROVISIONS" :key="p.id" class="item">
                <span class="item-emoji">{{ p.emoji }}</span>
                <div class="item-body">
                  <b>{{ p.label }}</b>
                  <small>{{ p.description }}</small>
                </div>
                <button class="buy" @click="provision(p.id)">
                  {{ p.id === 'sell-mangoes' ? 'Vendre' : `${p.price} F` }}
                </button>
              </article>
            </template>
            <template v-else>
              <article v-for="i in shopItems" :key="i.id" class="item" :class="{ owned: hud.owned.includes(i.id) }">
                <span class="item-emoji">{{ i.emoji }}</span>
                <div class="item-body">
                  <b>{{ i.label }}</b>
                  <small>{{ i.description }}</small>
                </div>
                <button
                  class="buy"
                  :disabled="!canBuy(i.id, hud.coins, hud.owned, hud.chapter)"
                  @click="buy(i.id)"
                >
                  {{ hud.owned.includes(i.id) ? '✓' : hud.chapter < i.from ? lockedLabel(i.from) : `${i.price} F` }}
                </button>
              </article>
            </template>
          </div>
        </section>
      </div>
    </Transition>

    <!-- Choix de la mission : chacun son role -->
    <Transition name="sheet">
      <div v-if="mission === 'pick'" class="sheet-backdrop" @click.self="mission = null">
        <section class="sheet">
          <div class="sheet-head">
            <h2>Missions du jour</h2>
            <button class="close" aria-label="Fermer" @click="mission = null">✕</button>
          </div>
          <p class="mission-intro">
            Chacun part de son côté, en même temps. Dans l’app, ton partenaire joue l’autre mission sur son téléphone.
            Coût : {{ MISSION_ENERGY }} d’énergie.
          </p>
          <button class="role" @click="mission = 'chasse'">
            <span class="role-emoji">🏹</span>
            <span><b>La chasse</b> · lui, par défaut<small>Gibier à rapporter… mais serpents, buffles et panthères peuvent te blesser.</small></span>
          </button>
          <button class="role" @click="mission = 'commerce'">
            <span class="role-emoji">🧃</span>
            <span><b>Le commerce</b> · elle, par défaut<small>Faux billets, monnaie à rendre et voleurs : sois prudente, vérifie tout.</small></span>
          </button>
        </section>
      </div>
    </Transition>

    <div v-if="mission === 'chasse' || mission === 'commerce'" class="mission-screen">
      <HuntMission v-if="mission === 'chasse'" @done="(r) => missionDone('chasse', r.coins)" />
      <MarketMission v-else @done="(r) => missionDone('commerce', r.coins)" />
    </div>

    <!-- Ecran titre -->
    <div v-if="hud.state === 'title'" class="overlay title">
      <RouterLink to="/" class="menu-btn menu-btn--corner" aria-label="Revenir au menu des jeux">⌂ Menu</RouterLink>
      <div class="title-card">
        <p class="eyebrow">Jeu à deux · phase 2</p>
        <h1>Notre Refuge</h1>
        <p class="pitch">
          Mama Adjoua vous a laissé sa terre et des lettres. Mangez, ramassez, ouvrez votre petit maquis,
          et construisez ensemble votre maison… puis tout un monde autour.
        </p>
        <ul class="features">
          <li>🏠 Une maison qui grandit pièce par pièce</li>
          <li>🧃 Un commerce à faire prospérer</li>
          <li>🌉 Un monde à embellir</li>
          <li>💌 5 chapitres, 5 lettres</li>
        </ul>
        <button class="primary" @click="send('refuge:start')">Commencer l’histoire</button>
        <small>Touche la carte pour te déplacer et agir. Sur le site, ton partenaire est joué par l’ordinateur.</small>
      </div>
    </div>

    <!-- Lettre de Mama Adjoua -->
    <div v-if="hud.state === 'letter' && hud.letter" class="overlay letter-overlay">
      <article class="letter">
        <p class="eyebrow">Chapitre {{ hud.chapter }} · {{ hud.chapterTitle }}</p>
        <h2>{{ hud.letter.title }}</h2>
        <p class="letter-text">{{ hud.letter.text }}</p>
        <button class="primary" @click="send('refuge:letter-closed')">Continuer</button>
      </article>
    </div>

    <!-- Fin -->
    <div v-if="hud.state === 'finished'" class="overlay night">
      <div class="title-card">
        <p class="eyebrow">Fin · {{ CHAPTERS.length }} chapitres</p>
        <h1>Votre refuge ❤️</h1>
        <p class="pitch">
          Une maison, un maquis qui a rapporté <b>{{ hud.earned }} F</b>, un monde plus beau autour de vous,
          et une première soirée au coin du feu. Mama Adjoua serait fière.
        </p>
        <button class="primary" @click="send('refuge:replay')">Rejouer</button>
        <RouterLink to="/" class="secondary">Autres jeux</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.refuge {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #1b1422;
  font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  color: #1e1a1d;
  touch-action: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.world {
  position: absolute;
  inset: 0;
}

.world :deep(canvas) {
  display: block;
}

/* --- Barre du haut --- */
.topbar {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 8px);
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.topbar > * {
  pointer-events: auto;
}

.round {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  background: rgba(251, 247, 242, 0.92);
  color: #1e1a1d;
  font-size: 24px;
  text-decoration: none;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.menu-btn {
  height: 42px;
  padding: 0 14px;
  flex-shrink: 0;
  border-radius: 21px;
  display: grid;
  place-items: center;
  background: rgba(251, 247, 242, 0.95);
  color: #1e1a1d;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.menu-btn--corner {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 12px;
}

.chapter {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 12px;
  border-radius: 21px;
  border: none;
  background: rgba(30, 26, 29, 0.78);
  color: #fbf7f2;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(8px);
}

.chapter span {
  color: #ffd35c;
  margin-right: 4px;
}

.chapter i {
  font-style: normal;
  opacity: 0.7;
}

.coins {
  height: 42px;
  padding: 0 12px;
  border-radius: 21px;
  display: grid;
  place-items: center;
  background: rgba(251, 247, 242, 0.92);
  font-weight: 800;
  font-size: 14px;
  white-space: nowrap;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.energy {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 58px);
  left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(30, 26, 29, 0.7);
  color: white;
  font-size: 13px;
}

.energy-bar {
  width: 110px;
  height: 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.2);
  overflow: hidden;
}

.energy-bar i {
  display: block;
  height: 100%;
  border-radius: 99px;
  transition:
    width 0.4s ease,
    background 0.4s;
}

.quest {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 92px);
  left: 8px;
  max-width: min(330px, calc(100% - 16px));
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(251, 247, 242, 0.94);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
  font-size: 13px;
}

.quest li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quest li.done .q-label {
  text-decoration: line-through;
  color: #3f8f63;
}

.q-count {
  margin-left: auto;
  padding-left: 8px;
  font-weight: 800;
}

.toast {
  position: absolute;
  top: 34%;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 40px);
  padding: 12px 18px;
  border-radius: 16px;
  background: #fbf7f2;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

/* --- Bas de l'ecran : consigne, sac, raccourcis (a portee de pouce) --- */
.dock {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.dock > * {
  pointer-events: auto;
}

.hint {
  align-self: center;
  max-width: 100%;
  padding: 8px 14px;
  border-radius: 16px;
  background: rgba(30, 26, 29, 0.8);
  color: #fff4dc;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  backdrop-filter: blur(8px);
}

.dock-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bag,
.stand-chip {
  height: 44px;
  padding: 0 14px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: rgba(251, 247, 242, 0.94);
  font-weight: 800;
  font-size: 15px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.bag.empty {
  color: #8a7f86;
  font-weight: 600;
}

.action {
  margin-left: auto;
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: 24px;
  font-weight: 800;
  font-size: 15px;
  color: white;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  animation: pulse 1.4s ease-in-out infinite;
}

.eat {
  background: linear-gradient(90deg, #ff7a59, #f2a51a);
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  flex: 1;
  min-height: 58px;
  border: none;
  border-radius: 18px;
  background: rgba(251, 247, 242, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 800;
  color: #1e1a1d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
}

.nav-btn span {
  font-size: 22px;
  line-height: 1;
}

.nav-btn:active,
.buy:active,
.primary:active {
  transform: scale(0.96);
}

.mission-btn {
  background: linear-gradient(135deg, #ffd35c, #ff7a59);
}

.mission-screen {
  position: absolute;
  inset: 0;
  z-index: 40;
}

.mission-intro {
  font-size: 13px;
  color: #6d6168;
  margin-bottom: 12px;
}

.role {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  margin-bottom: 10px;
  border: 2px solid #eadfd3;
  border-radius: 18px;
  background: white;
  text-align: left;
  font-size: 15px;
  color: #1e1a1d;
}

.role small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #6d6168;
}

.role-emoji {
  font-size: 36px;
}

/* --- Boutique en feuille du bas --- */
.sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(20, 14, 10, 0.45);
}

.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 78%;
  display: flex;
  flex-direction: column;
  padding: 14px 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
  border-radius: 24px 24px 0 0;
  background: #fbf7f2;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.35);
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.sheet-head h2 {
  flex: 1;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 20px;
}

.close {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #eadfd3;
  font-size: 16px;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.tabs button {
  flex: 1;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 12px;
  border: 2px solid #eadfd3;
  background: white;
  font-weight: 800;
  font-size: 13px;
  white-space: nowrap;
}

.tabs button.on {
  border-color: #c2185b;
  background: #fdeef4;
  color: #c2185b;
}

.items {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 16px;
  background: white;
  border: 1px solid #eadfd3;
}

.item.owned {
  opacity: 0.6;
}

.item-emoji {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-size: 26px;
  background: #fbf7f2;
}

.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

.item-body small {
  color: #6d6168;
  font-size: 12px;
}

.buy {
  min-width: 84px;
  min-height: 44px;
  padding: 0 10px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(90deg, #c2185b, #ff7a59);
  color: white;
  font-weight: 800;
  font-size: 13px;
}

.buy:disabled {
  background: #d8ccc0;
  color: #6d6168;
}

/* --- Ecrans --- */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-y: auto;
}

.title {
  background:
    linear-gradient(180deg, rgba(27, 20, 34, 0.35), rgba(27, 20, 34, 0.85)),
    url('/thumbnails/refuge.jpg') center / cover;
}

.night {
  background: rgba(11, 16, 48, 0.72);
}

.letter-overlay {
  background: rgba(20, 14, 10, 0.55);
  backdrop-filter: blur(3px);
}

.title-card {
  width: min(440px, 100%);
  padding: 24px 20px;
  border-radius: 26px;
  background: rgba(251, 247, 242, 0.96);
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  animation: pop 0.4s cubic-bezier(0.3, 1.4, 0.5, 1);
}

.eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c2185b;
}

.title-card h1 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(32px, 9vw, 44px);
  margin: 6px 0 10px;
}

.pitch {
  font-size: 15px;
  line-height: 1.5;
  color: #4d4349;
  margin-bottom: 14px;
}

.features {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.features li {
  padding: 8px 10px;
  border-radius: 12px;
  background: #f1e7d2;
}

.title-card small {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  color: #6d6168;
}

.primary {
  width: 100%;
  min-height: 54px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(90deg, #c2185b, #ff7a59);
  color: white;
  font-size: 16px;
  font-weight: 800;
  box-shadow: 0 10px 24px rgba(194, 24, 91, 0.35);
}

.secondary {
  display: block;
  margin-top: 12px;
  color: #6d6168;
  font-weight: 700;
  text-decoration: none;
}

.letter {
  width: min(460px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 26px 22px;
  border-radius: 6px;
  background:
    repeating-linear-gradient(180deg, transparent 0 31px, rgba(120, 90, 50, 0.12) 31px 32px),
    linear-gradient(160deg, #fdf6e6, #f3e3c3);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    inset 0 0 40px rgba(150, 110, 60, 0.18);
  transform: rotate(-0.6deg);
  animation: unfold 0.5s ease-out;
}

.letter h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 22px;
  margin: 6px 0 14px;
}

.letter-text {
  white-space: pre-line;
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-size: 16px;
  line-height: 2;
  color: #3a2a1a;
  margin-bottom: 20px;
}

/* --- Transitions --- */
.toast-enter-active,
.toast-leave-active,
.fold-enter-active,
.fold-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}

@keyframes pop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
}

@keyframes unfold {
  from {
    transform: rotate(-0.6deg) scaleY(0.6);
    opacity: 0;
  }
}

@keyframes pulse {
  50% {
    transform: scale(1.05);
  }
}

/* Grand ecran : l'interface reste compacte et lisible. */
@media (min-width: 900px) {
  .dock {
    left: 50%;
    right: auto;
    width: 520px;
    transform: translateX(-50%);
  }
}
</style>
