import { GAGES, LEVELS, PROMPTS, type Intention, type Kind, type Level } from './content'

/**
 * Regles d'"Action ou Verite" (phase 2, le duo joue ensemble pendant l'appel vocal) :
 * - chacun son tour, la roue decide : Verite, Action, Au choix, ou "A deux" (les deux repondent) ;
 * - la temperature monte : Doux au debut, puis Complice, puis Audacieux (jamais au-dela du niveau choisi) ;
 * - Verite faite = 1 point, Action faite = 2 points ;
 * - refuser : on peut utiliser son unique joker (0 point, pas de gage) ; sinon, roue des gages,
 *   de plus en plus corses a chaque refus ; le partenaire peut aussi juger qu'une reponse ou une
 *   action "n'est pas respectee" (trop vague, bâclee) : gage, et le joker ne marche pas ;
 * - refuser son gage coute 3 points.
 */

export type Player = 'me' | 'duo'
export type SegmentId = 'verite' | 'action' | 'choix' | 'deux'

export interface Segment {
  id: SegmentId
  label: string
  emoji: string
  color: string
}

export const WHEEL: Segment[] = [
  { id: 'verite', label: 'Vérité', emoji: '💬', color: '#1f2a44' },
  { id: 'action', label: 'Action', emoji: '⚡', color: '#c2185b' },
  { id: 'verite', label: 'Vérité', emoji: '💬', color: '#2d3b5c' },
  { id: 'action', label: 'Action', emoji: '⚡', color: '#ff7a59' },
  { id: 'choix', label: 'Au choix', emoji: '🎁', color: '#8faf9a' },
  { id: 'verite', label: 'Vérité', emoji: '💬', color: '#1f2a44' },
  { id: 'action', label: 'Action', emoji: '⚡', color: '#c2185b' },
  { id: 'deux', label: 'À deux', emoji: '💞', color: '#e9a12c' },
]

export const TURNS = 10
export const POINTS: Record<Kind, number> = { verite: 1, action: 2 }
export const GAGE_REFUSED_PENALTY = 3
export const JOKERS = 1

export interface Prompt {
  kind: Kind
  level: Level
  text: string
  /** Segment "A deux" : les deux joueurs repondent a la meme verite. */
  both: boolean
}

export interface AvState {
  intention: Intention
  maxLevel: Level
  turn: number
  current: Player
  scores: Record<Player, number>
  jokers: Record<Player, number>
  refusals: Record<Player, number>
  used: string[]
  prompt: Prompt | null
  gage: { tier: 1 | 2 | 3; label: string; text: string } | null
}

export function newGame(intention: Intention, maxLevel: Level): AvState {
  return {
    intention,
    maxLevel,
    turn: 0,
    current: 'me',
    scores: { me: 0, duo: 0 },
    jokers: { me: JOKERS, duo: JOKERS },
    refusals: { me: 0, duo: 0 },
    used: [],
    prompt: null,
    gage: null,
  }
}

export function other(p: Player): Player {
  return p === 'me' ? 'duo' : 'me'
}

export function isOver(state: AvState) {
  return state.turn >= TURNS
}

/** La temperature monte au fil de la partie, sans depasser le niveau choisi. */
export function levelForTurn(turn: number, maxLevel: Level): Level {
  const order = LEVELS.map((l) => l.id)
  const wanted: Level = turn < 4 ? 'doux' : turn < 7 ? 'complice' : 'audacieux'
  return order.indexOf(wanted) <= order.indexOf(maxLevel) ? wanted : maxLevel
}

export function drawPrompt(state: AvState, kind: Kind, both = false, random = Math.random): Prompt {
  const level = levelForTurn(state.turn, state.maxLevel)
  const pool = PROMPTS[state.intention][kind][level]
  let fresh = pool.filter((t) => !state.used.includes(t))
  if (fresh.length === 0) fresh = pool
  const text = fresh[Math.floor(random() * fresh.length)]!
  state.used.push(text)
  state.prompt = { kind, level, text, both }
  return state.prompt
}

/** Action ou verite faite (et validee par le partenaire). */
export function complete(state: AvState) {
  const prompt = state.prompt
  if (!prompt) return
  state.scores[state.current] += POINTS[prompt.kind]
  if (prompt.both) state.scores[other(state.current)] += POINTS[prompt.kind]
}

/**
 * Refus ou reponse "pas respectee" : renvoie `true` si le joker a absorbe le refus, sinon prepare
 * le gage (de plus en plus corse a chaque fois). Le joker ne couvre jamais une triche.
 */
export function refuse(state: AvState, useJoker: boolean, random = Math.random): boolean {
  const p = state.current
  if (useJoker && state.jokers[p] > 0) {
    state.jokers[p]--
    return true
  }
  state.refusals[p]++
  const tier = Math.min(state.refusals[p], 3) as 1 | 2 | 3
  const deck = GAGES.find((g) => g.tier === tier)!
  state.gage = { tier, label: deck.label, text: deck.items[Math.floor(random() * deck.items.length)]! }
  return false
}

export function gageDone(state: AvState) {
  state.gage = null
}

export function gageRefused(state: AvState) {
  state.scores[state.current] -= GAGE_REFUSED_PENALTY
  state.gage = null
}

export function nextTurn(state: AvState) {
  state.turn++
  state.current = other(state.current)
  state.prompt = null
  state.gage = null
}

export function winner(state: AvState): Player | 'egalite' {
  if (state.scores.me === state.scores.duo) return 'egalite'
  return state.scores.me > state.scores.duo ? 'me' : 'duo'
}
