import type { Card } from './constants'

/** Position visuelle d'une carte : centre (x, y) en pixels ecran, largeur, rotation, inclinaison. */
export interface CardBox {
  x: number
  y: number
  w: number
  rot?: number
  tilt?: number
}

export interface FlightOptions {
  card: Card
  from: CardBox
  to: CardBox
  faceUpFrom: boolean
  faceUpTo: boolean
  duration?: number
  /** Hauteur de l'arc (px) : la carte se souleve comme tenue par une main. */
  lift?: number
}

/** Rotation et petit decalage "naturels" d'une carte posee sur le talon, stables pour une carte donnee. */
export function discardJitter(card: Card) {
  let hash = 0
  for (const ch of card.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const unit = (shift: number) => (((hash >>> shift) & 0xff) / 255) * 2 - 1
  return { rot: unit(0) * 14, dx: unit(8) * 6, dy: unit(16) * 6 }
}

/** Eventail de la main : ecart, rotation et arc de chaque carte selon la largeur disponible. */
export function handLayout(index: number, count: number, cardW: number, width: number) {
  const mid = (count - 1) / 2
  const offset = index - mid
  // Marge laissee a chaque bord pour que les cartes inclinees des extremites restent visibles.
  const spacing = count > 1 ? Math.min(cardW * 0.6, (width - cardW - 48) / (count - 1)) : 0
  const step = count > 1 ? Math.min(5, 30 / (count - 1)) : 0
  return { x: offset * spacing, y: offset * offset * 1.4, rot: offset * step }
}
