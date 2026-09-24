<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { MENU, MISSION_SECONDS, makeOrder, saleResult, type Order } from '@/games/refuge/missions'
import { playSound } from '@/services/sound'

/**
 * Mission "Le commerce" : calculer le total, verifier le billet (faux billets), rendre la bonne
 * monnaie, et chasser la main du voleur qui vise la caisse. Les clients s'impatientent.
 */
const emit = defineEmits<{ done: [result: { coins: number; sales: number; mistakes: number }] }>()

const FACES = ['👩🏾', '👨🏿', '👵🏾', '🧔🏾', '👩🏿‍🦱', '👨🏾‍🦲']
const PATIENCE_MS = 14000
const THIEF_MS = 1700

type Step = 'total' | 'bill' | 'change' | 'result'

const s = reactive({
  coins: 0,
  sales: 0,
  mistakes: 0,
  left: MISSION_SECONDS,
  over: false,
  step: 'total' as Step,
  message: '',
  good: true,
  zoom: false,
  patience: 1,
  thief: false,
  totalGiven: 0,
})
const order = ref<Order>(makeOrder(Math.random))
const face = ref(FACES[0]!)
let clock: ReturnType<typeof setInterval> | undefined
let patienceTimer: ReturnType<typeof setInterval> | undefined
let thiefTimer: ReturnType<typeof setTimeout> | undefined
let thiefGone: ReturnType<typeof setTimeout> | undefined
let customerAt = 0

function nextCustomer() {
  order.value = makeOrder(Math.random)
  face.value = FACES[Math.floor(Math.random() * FACES.length)]!
  s.step = 'total'
  s.zoom = false
  s.patience = 1
  customerAt = Date.now()
}

function settle(accepted: boolean, change = 0) {
  const r = saleResult(order.value, accepted, s.totalGiven, change)
  s.coins += r.coins
  if (r.ok) s.sales++
  else s.mistakes++
  s.good = r.ok
  s.message = r.reason
  s.step = 'result'
  playSound(r.ok ? 'pawnCapture' : 'cardShove', 0.7)
  setTimeout(() => !s.over && nextCustomer(), 1300)
}

function chooseTotal(total: number) {
  s.totalGiven = total
  if (total !== order.value.total) {
    settle(true, 0)
    return
  }
  s.step = 'bill'
}

function scheduleThief() {
  thiefTimer = setTimeout(
    () => {
      if (s.over) return
      s.thief = true
      thiefGone = setTimeout(() => {
        if (!s.thief) return
        s.thief = false
        s.coins -= 50
        s.mistakes++
        s.message = '🖐 Un voleur a pris 50 F dans la caisse !'
        s.good = false
        playSound('cardShove')
        scheduleThief()
      }, THIEF_MS)
    },
    6000 + Math.random() * 7000,
  )
}

function catchThief() {
  if (!s.thief) return
  s.thief = false
  clearTimeout(thiefGone)
  s.message = 'Voleur repéré, il s’enfuit ! 👀'
  s.good = true
  playSound('pawnCapture', 0.6)
  scheduleThief()
}

function billColor(o: Order) {
  const real = { 500: '#7fa36b', 1000: '#c98a4b', 2000: '#4f7fbf' }[o.bill as 500 | 1000 | 2000]
  // Un faux billet "couleur" a une teinte legerement fausse, a reperer.
  return o.fake === 'couleur' ? '#b56fb0' : real
}

onMounted(() => {
  nextCustomer()
  clock = setInterval(() => {
    s.left--
    if (s.left <= 0) {
      s.over = true
      clearInterval(clock)
      clearInterval(patienceTimer)
      clearTimeout(thiefTimer)
      clearTimeout(thiefGone)
    }
  }, 1000)
  patienceTimer = setInterval(() => {
    if (s.step === 'result' || s.over) return
    s.patience = Math.max(0, 1 - (Date.now() - customerAt) / PATIENCE_MS)
    if (s.patience <= 0) {
      s.mistakes++
      s.message = 'Le client en a eu marre d’attendre… 😤'
      s.good = false
      s.step = 'result'
      setTimeout(() => !s.over && nextCustomer(), 1100)
    }
  }, 200)
  scheduleThief()
})

onBeforeUnmount(() => {
  clearInterval(clock)
  clearInterval(patienceTimer)
  clearTimeout(thiefTimer)
  clearTimeout(thiefGone)
})
</script>

<template>
  <div class="market">
    <header class="bar">
      <span>💰 {{ s.coins }} F</span>
      <span>✅ {{ s.sales }}</span>
      <span>⚠️ {{ s.mistakes }}</span>
      <span class="time">⏱ {{ s.left }}s</span>
    </header>

    <div class="stall">
      <ul class="menu">
        <li v-for="m in MENU" :key="m.id">{{ m.emoji }} {{ m.price }} F</li>
        <li class="ref">Vrai billet : bonne couleur + filigrane 🐘</li>
      </ul>

      <div class="customer">
        <span class="face">{{ face }}</span>
        <div class="patience"><i :style="{ width: `${s.patience * 100}%` }" /></div>
        <p class="order">
          <span v-for="l in order.lines" :key="l.id">{{ l.qty }} × {{ l.emoji }}</span>
        </p>
      </div>

      <button v-if="s.thief" class="thief" @pointerdown="catchThief">🖐</button>
      <span class="cashbox">🗃️</span>
    </div>

    <section class="counter">
      <template v-if="s.step === 'total'">
        <p class="ask">Combien ça fait ?</p>
        <div class="choices">
          <button v-for="t in order.totalOptions" :key="t" @click="chooseTotal(t)">{{ t }} F</button>
        </div>
      </template>

      <template v-else-if="s.step === 'bill'">
        <p class="ask">Le client te donne ce billet :</p>
        <div class="bill" :class="{ zoom: s.zoom }" :style="{ background: billColor(order) }" @click="s.zoom = !s.zoom">
          <b>{{ order.bill }} F CFA</b>
          <span v-if="order.fake !== 'filigrane'" class="watermark">🐘</span>
          <small>{{ s.zoom ? 'Touche pour réduire' : '🔍 Touche pour vérifier' }}</small>
        </div>
        <div class="choices">
          <button class="ok" @click="s.step = 'change'">Accepter</button>
          <button class="no" @click="settle(false)">Refuser (faux)</button>
        </div>
      </template>

      <template v-else-if="s.step === 'change'">
        <p class="ask">Rends la monnaie sur {{ order.bill }} F :</p>
        <div class="choices">
          <button v-for="c in order.changeOptions" :key="c" @click="settle(true, c)">{{ c }} F</button>
        </div>
      </template>

      <p v-else class="result" :class="{ bad: !s.good }">{{ s.message }}</p>
      <p v-if="s.step !== 'result' && s.message" class="last" :class="{ bad: !s.good }">{{ s.message }}</p>
    </section>

    <div v-if="s.over" class="end">
      <div class="end-card">
        <h2>{{ s.coins > 0 ? 'Bonne journée de vente !' : 'Journée difficile…' }}</h2>
        <p>{{ s.sales }} ventes réussies · {{ s.mistakes }} erreurs ou vols</p>
        <p class="big">💰 {{ Math.max(0, s.coins) }} F</p>
        <button class="primary" @click="emit('done', { coins: Math.max(0, s.coins), sales: s.sales, mistakes: s.mistakes })">
          Rapporter au refuge
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.market {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #3a2414;
  color: #1e1a1d;
}

.bar {
  display: flex;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-weight: 800;
}

.time {
  color: #ffd35c;
}

.stall {
  position: relative;
  flex: 1;
  min-height: 200px;
  padding: 12px;
  background:
    repeating-linear-gradient(90deg, #d9534f 0 28px, #fbf7f2 28px 56px) top / 100% 26px no-repeat,
    linear-gradient(180deg, #f6e1b8, #e6c68f);
}

.menu {
  position: absolute;
  top: 36px;
  left: 12px;
  list-style: none;
  padding: 8px 10px;
  border-radius: 10px;
  background: #2d2a26;
  color: #fff4dc;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
}

.menu .ref {
  margin-top: 4px;
  font-size: 11px;
  color: #ffd35c;
}

.customer {
  position: absolute;
  right: 16px;
  top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.face {
  font-size: 64px;
  line-height: 1;
}

.patience {
  width: 90px;
  height: 7px;
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.patience i {
  display: block;
  height: 100%;
  background: #e0453a;
}

.order {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 12px;
  background: white;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.cashbox {
  position: absolute;
  left: 50%;
  bottom: 10px;
  font-size: 40px;
  transform: translateX(-50%);
}

.thief {
  position: absolute;
  left: calc(50% + 30px);
  bottom: 18px;
  width: 70px;
  height: 70px;
  border: none;
  background: none;
  font-size: 50px;
  animation: sneak 1.7s linear forwards;
}

.counter {
  padding: 14px 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
  background: #fbf7f2;
  border-radius: 20px 20px 0 0;
  min-height: 42%;
}

.ask {
  font-weight: 800;
  font-size: 17px;
  text-align: center;
  margin-bottom: 10px;
}

.choices {
  display: flex;
  gap: 8px;
}

.choices button {
  flex: 1;
  min-height: 56px;
  border: none;
  border-radius: 14px;
  background: white;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  font-size: 17px;
  font-weight: 800;
}

.choices .ok {
  background: #3f8f63;
  color: white;
}

.choices .no {
  background: #c2185b;
  color: white;
}

.bill {
  position: relative;
  width: 180px;
  height: 90px;
  margin: 0 auto 12px;
  border-radius: 8px;
  border: 3px solid rgba(255, 255, 255, 0.6);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  transition: transform 0.25s ease;
  cursor: zoom-in;
}

.bill.zoom {
  transform: scale(1.5);
  z-index: 2;
}

.bill b {
  font-size: 20px;
}

.bill small {
  font-size: 10px;
}

/* Filigrane : a peine visible sans verifier (loupe). */
.watermark {
  position: absolute;
  right: 10px;
  top: 8px;
  font-size: 16px;
  opacity: 0.18;
}

.bill.zoom .watermark {
  opacity: 0.75;
}

.result,
.last {
  text-align: center;
  font-weight: 800;
  color: #3f8f63;
}

.result {
  font-size: 18px;
  padding-top: 16px;
}

.last {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.8;
}

.bad {
  color: #c2185b;
}

.end {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
}

.end-card {
  width: min(360px, 100%);
  padding: 22px;
  border-radius: 22px;
  background: #fbf7f2;
  text-align: center;
}

.end-card h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: 24px;
}

.end-card p {
  margin: 8px 0;
  color: #6d6168;
}

.end-card .big {
  font-size: 24px;
  font-weight: 800;
  color: #1e1a1d;
}

.primary {
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(90deg, #c2185b, #ff7a59);
  color: white;
  font-size: 16px;
  font-weight: 800;
}

@keyframes sneak {
  from {
    transform: translateX(120px);
  }
  to {
    transform: translateX(-20px);
  }
}
</style>
