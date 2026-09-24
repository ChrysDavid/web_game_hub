/** Economie de "Notre Refuge" : le maquis de jus de mangue et la boutique du marche. */

export type ShopId =
  | 'roof'
  | 'door'
  | 'windows'
  | 'press'
  | 'sign'
  | 'premium'
  | 'bridge'
  | 'lamps'
  | 'well'
  | 'garden'

export interface ShopItem {
  id: ShopId
  label: string
  emoji: string
  price: number
  /** Chapitre a partir duquel l'objet est en vente. */
  from: number
  group: 'maison' | 'maquis' | 'monde'
  description: string
}

export const SHOP: ShopItem[] = [
  { id: 'roof', label: 'Tuiles du toit', emoji: '🧱', price: 250, from: 3, group: 'maison', description: '10 tuiles rouges pour couvrir la maison.' },
  { id: 'door', label: 'Porte en bois', emoji: '🚪', price: 120, from: 3, group: 'maison', description: 'Pour enfin fermer la maison.' },
  { id: 'windows', label: 'Deux fenêtres', emoji: '🪟', price: 80, from: 3, group: 'maison', description: 'De la lumière à l’étage.' },
  { id: 'press', label: 'Presse rapide', emoji: '⚙️', price: 80, from: 3, group: 'maquis', description: 'Le jus est prêt deux fois plus vite.' },
  { id: 'sign', label: 'Belle enseigne', emoji: '🪧', price: 100, from: 3, group: 'maquis', description: 'Les clients viennent plus souvent.' },
  { id: 'premium', label: 'Jus premium', emoji: '⭐', price: 150, from: 3, group: 'maquis', description: 'Un jus meilleur : +10 F par verre.' },
  { id: 'bridge', label: 'Pont sur la rivière', emoji: '🌉', price: 250, from: 4, group: 'monde', description: 'Ouvre la prairie de Mama, au sud.' },
  { id: 'lamps', label: 'Lampadaires', emoji: '🏮', price: 150, from: 4, group: 'monde', description: 'Le chemin s’illumine le soir.' },
  { id: 'well', label: 'Puits', emoji: '🪣', price: 150, from: 4, group: 'monde', description: 'De l’eau fraîche pour tout le village.' },
  { id: 'garden', label: 'Jardin fleuri', emoji: '🌸', price: 100, from: 4, group: 'monde', description: 'Des fleurs autour de la maison.' },
]

export const BASE_JUICE_PRICE = 25
export const STAND_COST_WOOD = 3
export const BAG_SIZE = 4

export function shopItem(id: ShopId) {
  return SHOP.find((i) => i.id === id)!
}

export function canBuy(id: ShopId, coins: number, owned: ShopId[], chapter: number) {
  const item = shopItem(id)
  return !owned.includes(id) && chapter >= item.from && coins >= item.price
}

export function juicePrice(owned: ShopId[]) {
  return BASE_JUICE_PRICE + (owned.includes('premium') ? 10 : 0)
}

/** Temps entre deux clients (ms). */
export function customerInterval(owned: ShopId[]) {
  return owned.includes('sign') ? 3500 : 6000
}

/** Temps pour presser une mangue en un verre de jus (ms). */
export function pressTime(owned: ShopId[]) {
  return owned.includes('press') ? 900 : 1800
}

/** Provisions du marche : se racheter a volonte (manger, materiaux), ou vendre ses mangues. */
export type ProvisionId = 'food' | 'stone' | 'wood' | 'sell-mangoes'

export const PROVISIONS: { id: ProvisionId; label: string; emoji: string; price: number; description: string }[] = [
  { id: 'food', label: 'Un bon garba', emoji: '🍛', price: 15, description: '+40 d’énergie.' },
  { id: 'stone', label: 'Une pierre taillée', emoji: '🪨', price: 20, description: 'Si tu préfères acheter que ramasser.' },
  { id: 'wood', label: 'Une planche', emoji: '🪵', price: 15, description: 'Si tu préfères acheter que ramasser.' },
  { id: 'sell-mangoes', label: 'Vendre mes mangues', emoji: '🥭', price: 10, description: '10 F la mangue, au marchand.' },
]

export const MAX_ENERGY = 100
export const FOOD_ENERGY = 40
export const MANGO_ENERGY = 20
/** Energie depensee par ramassage. */
export const WORK_ENERGY = 6

export const HOUSE_ITEMS: ShopId[] = ['roof', 'door', 'windows']
export const WORLD_ITEMS: ShopId[] = ['bridge', 'lamps', 'well', 'garden']
