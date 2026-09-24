/**
 * Missions a risque de "Notre Refuge" (phase 2 : chacun joue la sienne sur son telephone).
 * - Chasse : gibier a toucher, dangers (serpent, buffle, panthere), 3 coeurs.
 * - Commerce : total a calculer, faux billets a reperer, monnaie a rendre, voleurs a chasser.
 */

export type Role = 'chasse' | 'commerce'

export const MISSION_SECONDS = 50
export const MISSION_ENERGY = 20
export const HEARTS = 3
export const SPEARS = 10

// --- Chasse ---------------------------------------------------------------------------------------

export type AnimalKind = 'antilope' | 'phaco' | 'pintade' | 'serpent' | 'buffle' | 'panthere'

export const ANIMALS: Record<AnimalKind, { emoji: string; meat: number; danger: boolean; speed: number; hits: number }> = {
  antilope: { emoji: '🦌', meat: 3, danger: false, speed: 170, hits: 1 },
  phaco: { emoji: '🐗', meat: 2, danger: false, speed: 120, hits: 1 },
  pintade: { emoji: '🐦', meat: 1, danger: false, speed: 210, hits: 1 },
  serpent: { emoji: '🐍', meat: 0, danger: true, speed: 0, hits: 1 },
  buffle: { emoji: '🐃', meat: 0, danger: true, speed: 0, hits: 3 },
  panthere: { emoji: '🐆', meat: 0, danger: true, speed: 0, hits: 2 },
}

/** Ce qui apparait : de plus en plus de dangers au fil du temps. */
export function pickAnimal(elapsed: number, rand: () => number): AnimalKind {
  const danger = Math.min(0.45, 0.15 + elapsed / 120)
  const r = rand()
  if (r < danger) {
    const d = rand()
    return d < 0.45 ? 'serpent' : d < 0.8 ? 'buffle' : 'panthere'
  }
  const g = rand()
  return g < 0.3 ? 'antilope' : g < 0.65 ? 'phaco' : 'pintade'
}

export const MEAT_PRICE = 15

/** Mort a la chasse : on s'enfuit en laissant la moitie de la viande. */
export function huntReward(meat: number, dead: boolean) {
  const kept = dead ? Math.floor(meat / 2) : meat
  return { meat: kept, coins: kept * MEAT_PRICE }
}

// --- Commerce -------------------------------------------------------------------------------------

export const MENU = [
  { id: 'jus', emoji: '🧃', label: 'Jus de mangue', price: 25 },
  { id: 'brochette', emoji: '🍢', label: 'Brochette', price: 50 },
  { id: 'alloco', emoji: '🍌', label: 'Alloco', price: 75 },
] as const

export interface Order {
  lines: { id: string; emoji: string; qty: number; price: number }[]
  total: number
  bill: number
  /** Faux billet : raison visible a la verification. */
  fake: 'couleur' | 'filigrane' | null
  /** Choix de monnaie a rendre (un seul est juste). */
  changeOptions: number[]
  totalOptions: number[]
}

const BILLS = [500, 1000, 2000]

function shuffle<T>(items: T[], rand: () => number) {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function makeOrder(rand: () => number, fakeRate = 0.28): Order {
  const count = 1 + Math.floor(rand() * 3)
  const lines = shuffle([...MENU], rand)
    .slice(0, count)
    .map((m) => ({ id: m.id, emoji: m.emoji, qty: 1 + Math.floor(rand() * 3), price: m.price }))
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const bill = BILLS.find((b) => b >= total && rand() < 0.7) ?? BILLS.find((b) => b >= total) ?? 2000
  const fake = rand() < fakeRate ? (rand() < 0.5 ? 'couleur' : 'filigrane') : null
  const change = bill - total
  const changeOptions = shuffle([change, change + 25, Math.max(0, change - 25)], rand)
  const totalOptions = shuffle([total, total + 25, Math.max(25, total - 25)], rand)
  return { lines, total, bill, fake, changeOptions, totalOptions }
}

/** Resultat d'une vente : ce qu'on gagne (ou perd) selon ses verifications. */
export function saleResult(order: Order, accepted: boolean, totalGiven: number, changeGiven: number) {
  if (!accepted) return order.fake ? { coins: 0, ok: true, reason: 'Faux billet refusé, bravo !' } : { coins: 0, ok: false, reason: 'Le billet était bon : client perdu.' }
  if (order.fake) return { coins: -order.total, ok: false, reason: 'Faux billet accepté : marchandise perdue !' }
  if (totalGiven !== order.total) return { coins: 0, ok: false, reason: 'Mauvais total : le client est parti fâché.' }
  const diff = order.bill - order.total - changeGiven
  if (diff < 0) return { coins: order.total + diff, ok: false, reason: `Trop de monnaie rendue (${-diff} F perdus).` }
  if (diff > 0) return { coins: 0, ok: false, reason: 'Pas assez de monnaie : le client proteste et repart.' }
  return { coins: order.total, ok: true, reason: `Vente réussie : +${order.total} F` }
}

/** Chance que le partenaire (joue par l'ordinateur sur le site) reussisse sa mission. */
export function partnerMissionResult(role: Role, rand: () => number) {
  if (role === 'chasse') {
    const meat = 4 + Math.floor(rand() * 8)
    const dead = rand() < 0.15
    return { ...huntReward(meat, dead), text: dead ? 'a dû fuir un buffle, mais a sauvé un peu de viande' : `a rapporté ${meat} morceaux de viande` }
  }
  const coins = 150 + Math.floor(rand() * 8) * 25
  const robbed = rand() < 0.2
  return { meat: 0, coins: robbed ? coins - 75 : coins, text: robbed ? 'a vendu, mais un voleur a pris 75 F' : `a bien vendu au marché (${coins} F)` }
}
