import type { ComputedRef } from 'vue'
import type { PlayerColor } from './constants'
import type { Token } from './engine'

/**
 * Ce dont le plateau et l'ecran de jeu ont besoin, quel que soit le mode :
 * - partie locale contre l'ordinateur (engine.ts, site web ouvert directement) ;
 * - partie en ligne entre vraies personnes (online.ts, ouverte depuis l'app VIDO LOVE).
 */
export interface LudoGameView {
  state: {
    players: PlayerColor[]
    tokens: Token[]
    dice: number | null
    rolling: boolean
    moving: boolean
    awaitingChoice: boolean
    message: string
    ranking: PlayerColor[]
  }
  current: ComputedRef<PlayerColor>
  gameOver: ComputedRef<boolean>
  canRoll: ComputedRef<boolean>
  homeCount: (color: PlayerColor) => number
  isMovable: (t: Token) => boolean
  isBot: (color: PlayerColor) => boolean
  rollDice: () => unknown
  playToken: (t: Token) => unknown
}
