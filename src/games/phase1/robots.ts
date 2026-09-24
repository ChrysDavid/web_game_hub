/**
 * Membres simules du groupe de phase 1, pour tester les jeux seul sur le site.
 * Dans l'app, ce sont de vraies personnes du groupe (anonymes) ; ici chaque robot a une
 * personnalite fixe pour que les resultats aient du sens d'une partie a l'autre.
 */

export type AttachmentStyle = 'serein' | 'anxieux' | 'distant'
export type ConflictStyle = 'cooperer' | 'ceder' | 'imposer'

export interface Robot {
  id: string
  name: string
  color: string
  seed: number
  attachment: AttachmentStyle
  /** Stabilite emotionnelle, 0 a 100. */
  stability: number
  conflict: ConflictStyle
  /** Nombre de marches montees dans "L'escalier" (0 a 6). */
  openness: number
}

export const ROBOTS: Robot[] = [
  { id: 'awa', name: 'Awa', color: '#2f6bd1', seed: 11, attachment: 'serein', stability: 82, conflict: 'cooperer', openness: 5 },
  { id: 'koffi', name: 'Koffi', color: '#2e9e57', seed: 23, attachment: 'distant', stability: 58, conflict: 'imposer', openness: 2 },
  { id: 'mariam', name: 'Mariam', color: '#e9a12c', seed: 37, attachment: 'anxieux', stability: 34, conflict: 'ceder', openness: 6 },
]

/** Hasard reproductible (mulberry32) : un robot repond toujours pareil a la meme question. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pickIndex(rng: () => number, count: number) {
  return Math.floor(rng() * count)
}

export function shuffled<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
