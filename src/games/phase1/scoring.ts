import type { AttachmentStyle, ConflictStyle, Robot } from './robots'

/** Compatibilite avec un membre du groupe, affichee a la fin d'un jeu. */
export interface PairResult {
  robot: Robot
  score: number
  detail: string
}

/**
 * Calculs de compatibilite par paire (voir JEUX_PHASE1.md). Dans l'app, ces calculs sont faits
 * par le backend a partir des reponses de chacun ; ici ils servent a montrer le principe.
 * Tous les scores vont de 0 a 100.
 */

/** Part de reponses identiques entre deux personnes (meme liste de questions). */
export function sameAnswers(a: string[], b: string[]) {
  if (a.length === 0) return 0
  const same = a.filter((answer, i) => answer === b[i]).length
  return Math.round((same / a.length) * 100)
}

/** Ce que deux personnes aiment en commun (indice de Jaccard : commun / total). */
export function commonInterests(a: string[], b: string[]) {
  const setA = new Set(a)
  const setB = new Set(b)
  const union = new Set([...setA, ...setB])
  if (union.size === 0) return 0
  const common = [...setA].filter((x) => setB.has(x)).length
  return Math.round((common / union.size) * 100)
}

/** Style d'attachement dominant a partir des reactions choisies. */
export function dominantStyle<T extends string>(choices: T[], order: T[]): T {
  const counts = new Map<T, number>()
  for (const c of choices) counts.set(c, (counts.get(c) ?? 0) + 1)
  return order.reduce((best, style) => ((counts.get(style) ?? 0) > (counts.get(best) ?? 0) ? style : best), order[0]!)
}

const ATTACHMENT_PAIRS: Record<string, number> = {
  'serein-serein': 100,
  'serein-anxieux': 70,
  'serein-distant': 62,
  'anxieux-anxieux': 48,
  'distant-distant': 42,
  'anxieux-distant': 18,
}

/** Deux sereins, c'est le mieux ; un anxieux avec un distant, c'est le pire. */
export function attachmentPair(a: AttachmentStyle, b: AttachmentStyle) {
  return ATTACHMENT_PAIRS[`${a}-${b}`] ?? ATTACHMENT_PAIRS[`${b}-${a}`] ?? 50
}

const CONFLICT_PAIRS: Record<string, number> = {
  'cooperer-cooperer': 100,
  'cooperer-ceder': 72,
  'ceder-ceder': 55,
  'ceder-imposer': 40,
  'cooperer-imposer': 35,
  'imposer-imposer': 10,
}

/** Deux personnes qui cherchent un accord s'entendent le mieux ; deux qui imposent, le pire. */
export function conflictPair(a: ConflictStyle, b: ConflictStyle) {
  return CONFLICT_PAIRS[`${a}-${b}`] ?? CONFLICT_PAIRS[`${b}-${a}`] ?? 50
}

/** Stabilite de la paire : moyenne des deux, un peu penalisee si les deux sont fragiles. */
export function stabilityPair(a: number, b: number) {
  const mean = (a + b) / 2
  const bothFragile = a < 45 && b < 45 ? 15 : 0
  return Math.max(0, Math.round(mean - bothFragile))
}

/**
 * "Sous pression" : on ne demande jamais "es-tu calme ?", on observe. Tapes rageuses apres
 * l'echec injuste, abandon en cours de route, ou nouvel essai calme.
 */
export function stabilityScore(reaction: { rageTaps: number; quit: boolean; retried: boolean }) {
  let score = 85
  score -= Math.min(reaction.rageTaps * 6, 45)
  if (reaction.quit) score -= 35
  if (reaction.retried) score += 15
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** "L'escalier" : les deux osent-ils aller aussi loin l'un que l'autre ? */
export function opennessPair(a: number, b: number, maxSteps: number) {
  const gap = Math.abs(a - b) / maxSteps
  const depth = Math.min(a, b) / maxSteps
  return Math.round((1 - gap) * 75 + depth * 25)
}
