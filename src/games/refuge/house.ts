/**
 * Plan de la maison, visible en transparence des le debut : chaque materiau apporte remplit une
 * case precise, pour voir a quoi il sert. Maison de 5 cases de large sur 4 de haut :
 * - rangee du bas : mur de pierre (5 pierres), avec l'ouverture de la porte au milieu ;
 * - rangee au-dessus : etage en bois (5 bois) ;
 * - deux rangees de toit (tuiles achetees au marche) ;
 * - porte et fenetres (achetees au marche) remplacent ensuite leurs cases.
 * Les numeros sont ceux de la planche Kenney "Tiny Town" (public/games/refuge/town.png).
 */

export type HouseMaterial = 'stone' | 'wood' | 'roof' | 'door' | 'windows'

export interface HouseSlot {
  material: HouseMaterial
  /** Position en cases par rapport au centre de la maison. */
  dx: number
  dy: number
  frame: number
}

const row = (material: HouseMaterial, dy: number, frames: number[]): HouseSlot[] =>
  frames.map((frame, i) => ({ material, dx: i - 2, dy, frame }))

export const HOUSE_SLOTS: HouseSlot[] = [
  // Pierre : de gauche a droite, l'ouverture de la porte au milieu.
  ...row('stone', 1, [76, 77, 78, 77, 79]),
  // Bois : l'etage.
  ...row('wood', 0, [72, 73, 73, 73, 75]),
  // Toit : du bas vers le haut, pour le voir "monter".
  ...row('roof', -1, [64, 65, 65, 65, 66]),
  ...row('roof', -2, [52, 53, 53, 53, 54]),
  { material: 'door', dx: 0, dy: 1, frame: 90 },
  { material: 'windows', dx: -1, dy: 0, frame: 84 },
  { material: 'windows', dx: 1, dy: 0, frame: 84 },
]

export const NEEDED = { stone: 5, wood: 5 } as const

/** Index de la prochaine case a remplir avec ce materiau, ou -1 si tout est deja pose. */
export function nextSlot(placed: number[], material: HouseMaterial) {
  return HOUSE_SLOTS.findIndex((slot, i) => slot.material === material && !placed.includes(i))
}

export function countPlaced(placed: number[], material: HouseMaterial) {
  return placed.filter((i) => HOUSE_SLOTS[i]!.material === material).length
}

export function countOf(material: HouseMaterial) {
  return HOUSE_SLOTS.filter((s) => s.material === material).length
}
