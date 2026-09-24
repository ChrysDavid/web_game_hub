export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
// 11 = Valet, 12 = Dame, 13 = Roi, 14 = As
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  id: string
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

export const SUIT_NAME: Record<Suit, string> = {
  spades: 'Pique',
  hearts: 'Cœur',
  diamonds: 'Carreau',
  clubs: 'Trèfle',
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

/** Le 8 se pose sur n'importe quelle carte et fait choisir la couleur suivante. */
export const WILD_RANK: Rank = 8
/**
 * L'As "chauffe" : le suivant doit "refroidir" en posant un As, sinon il pioche une seule carte.
 * Dans les deux cas la chauffe s'arrete la (pas de cumul) et le jeu reprend normalement.
 */
export const RANK_CHAUFFE: Rank = 14
/** Le 2 fait piocher 2 cartes au suivant, sauf s'il pose lui aussi un 2 (les 2 se cumulent). */
export const RANK_DRAW_TWO: Rank = 2
export const DRAW_TWO_COUNT = 2
/** Le Valet (J) fait passer son tour au joueur suivant. */
export const RANK_SKIP: Rank = 11
/** Le 10 inverse le sens du jeu. */
export const RANK_REVERSE: Rank = 10
/** Carte a piocher quand on ne peut pas refroidir un As. */
export const CHAUFFE_DRAW = 1

const SPECIAL_RANKS: Rank[] = [WILD_RANK, RANK_CHAUFFE, RANK_DRAW_TWO, RANK_SKIP, RANK_REVERSE]

export function isSpecial(card: Card) {
  return SPECIAL_RANKS.includes(card.rank)
}

// Joueur 'me' = la personne devant l'ecran ; les autres sont pilotes par l'ordinateur sur le site.
export type PlayerId = 'me' | 'o1' | 'o2' | 'o3'

export const OPPONENTS: PlayerId[] = ['o1', 'o2', 'o3']

export const PLAYER_LABEL: Record<PlayerId, string> = {
  me: 'Toi',
  o1: 'Awa',
  o2: 'Koffi',
  o3: 'Mariam',
}

export const PLAYER_COLOR: Record<PlayerId, string> = {
  me: '#e2447b',
  o1: '#2f6bd1',
  o2: '#2e9e57',
  o3: '#e9a12c',
}

/** 8 cartes par joueur (regle du 8 americain). */
export const HAND_SIZE = 8

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ id: `${suit}-${rank}`, suit, rank: rank as Rank })
    }
  }
  return deck
}

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Tri de la main : par couleur puis par valeur, comme on range ses cartes en vrai. */
export function sortHand(cards: Card[]): Card[] {
  return cards.slice().sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.rank - b.rank)
}
