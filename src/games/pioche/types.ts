import type { ComputedRef } from 'vue'
import type { Card, PlayerId, Suit } from './constants'

/** Ce que la table affiche : identique pour une partie contre l'ordinateur ou en ligne. */
export interface PiocheTableState {
  players: PlayerId[]
  names: Partial<Record<PlayerId, string>>
  hands: Record<PlayerId, Card[]>
  drawPile: Card[]
  discardPile: Card[]
  tableCard: Card | null
  activeSuit: Suit | null
  direction: 1 | -1
  pendingDraw: number
  chauffe: boolean
  drawnCard: Card | null
  announced: Record<PlayerId, boolean>
  phase: 'dealing' | 'playing' | 'over'
  message: string
  winner: PlayerId | null
}

/**
 * Partie affichee par PiocheView : `createPiocheGame` (site, contre l'ordinateur) ou
 * `createOnlinePiocheGame` (app, vraies personnes via le serveur).
 */
export interface PiocheTable {
  state: PiocheTableState
  current: ComputedRef<PlayerId>
  isMyTurn: ComputedRef<boolean>
  canDraw: ComputedRef<boolean>
  canPass: ComputedRef<boolean>
  ranking: ComputedRef<PlayerId[]>
  canPlayCard(card: Card): boolean
  playCard(card: Card): Promise<void>
  drawCard(): Promise<void>
  pass(): void
  announce(): void
  start(): Promise<void> | void
  stop(): void
}
