export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
// 11 = Valet, 12 = Dame, 13 = Roi, 14 = As
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  suit: Suit
  rank: Rank
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export const SUIT_COLOR: Record<Suit, 'black' | 'red'> = {
  spades: 'black',
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
}

export const RANK_LABEL: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'V',
  12: 'D',
  13: 'R',
  14: 'A',
}

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4'

export const ALL_PLAYERS: PlayerId[] = ['p1', 'p2', 'p3', 'p4']

export const PLAYER_LABEL: Record<PlayerId, string> = {
  p1: 'Joueur 1',
  p2: 'Joueur 2',
  p3: 'Joueur 3',
  p4: 'Joueur 4',
}

export const PLAYER_COLOR: Record<PlayerId, string> = {
  p1: '#d94141',
  p2: '#2f6bd1',
  p3: '#2e9e57',
  p4: '#e9b02c',
}

export const HAND_SIZE = 7

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank: rank as Rank })
    }
  }
  return deck
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
