import { describe, expect, it } from 'vitest'
import { isSpecial, type Card, type PlayerId, type Rank, type Suit } from '../constants'
import { createPiocheGame, FORGOT_ANNOUNCE_PENALTY, type PiocheAnimator } from '../engine'
import { handLayout } from '../flight'

const card = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank })
const filler = (n: number) => Array.from({ length: n }, (_, i) => card('diamonds', (2 + (i % 5)) as Rank))

async function newGame(players: PlayerId[] = ['me', 'o1'], animator?: PiocheAnimator) {
  const game = createPiocheGame(players, { botDelay: 0, dealStagger: 0, announceDelay: 0, animator })
  await game.start()
  // Les tests pilotent eux-memes chaque tour : l'ordinateur ne joue pas tout seul.
  game.stop()
  return game
}

type Game = Awaited<ReturnType<typeof newGame>>

function setTable(game: Game, table: Card, hand: Card[], pile: Card[] = filler(10)) {
  game.state.tableCard = table
  game.state.activeSuit = table.suit
  game.state.hands.me = hand
  game.state.drawPile = pile
  game.state.discardPile = []
}

describe('distribution', () => {
  it('8 cartes chacun et jamais une carte speciale en premier sur le talon', async () => {
    const duo = await newGame(['me', 'o1'])
    expect(duo.state.hands.me).toHaveLength(8)
    expect(duo.state.hands.o1).toHaveLength(8)
    expect(duo.state.drawPile).toHaveLength(52 - 16 - 1)
    expect(isSpecial(duo.state.tableCard!)).toBe(false)
    expect(duo.current.value).toBe('me')
  })
})

describe('cartes jouables', () => {
  it('meme couleur, meme valeur ou un 8 ; le reste est refuse', async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), filler(3))
    expect(game.isPlayable(card('hearts', 12))).toBe(true)
    expect(game.isPlayable(card('clubs', 5))).toBe(true)
    expect(game.isPlayable(card('spades', 8))).toBe(true)
    expect(game.isPlayable(card('clubs', 9))).toBe(false)
  })

  it('une carte refusee reste dans la main et le tour ne change pas', async () => {
    const game = await newGame()
    const wrong = card('clubs', 9)
    setTable(game, card('hearts', 5), [wrong, card('spades', 2)])
    await game.playCard(wrong)
    expect(game.state.hands.me).toContainEqual(wrong)
    expect(game.current.value).toBe('me')
  })

  it("on ne peut pas finir en posant un 8", async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), [card('spades', 8)])
    expect(game.canPlayCard(card('spades', 8))).toBe(false)
  })
})

describe('le 8', () => {
  it('laisse commander librement n importe quelle couleur', async () => {
    let offered: Suit[] = []
    const animator: PiocheAnimator = {
      draw: async () => {},
      play: async (_p, _c, detach) => detach(),
      reveal: async () => {},
      reshuffle: async () => {},
      chooseSuit: async (allowed) => {
        offered = allowed
        return 'clubs'
      },
    }
    const game = await newGame(['me', 'o1'], animator)
    setTable(game, card('hearts', 5), [card('diamonds', 8), card('clubs', 2), card('clubs', 4)])
    await game.playCard(card('diamonds', 8))
    expect(offered).toEqual(['spades', 'hearts', 'diamonds', 'clubs'])
    expect(game.state.activeSuit).toBe('clubs')
  })
})

describe("l'As chauffe", () => {
  it('poser un As chauffe le joueur suivant', async () => {
    const game = await newGame(['me', 'o1', 'o2'])
    setTable(game, card('hearts', 5), [card('hearts', 14), ...filler(3)])
    await game.playCard(card('hearts', 14))
    expect(game.state.chauffe).toBe(true)
    expect(game.current.value).toBe('o1')
  })

  it('chauffe, seul un As refroidit, et la chauffe s arrete la (pas de cumul)', async () => {
    const game = await newGame(['me', 'o1'])
    setTable(game, card('clubs', 14), [card('spades', 14), card('clubs', 3), ...filler(2)])
    game.state.chauffe = true
    expect(game.canPlayCard(card('clubs', 3))).toBe(false)
    await game.playCard(card('spades', 14))
    expect(game.state.chauffe).toBe(false)
    expect(game.state.pendingDraw).toBe(0)
    expect(game.current.value).toBe('o1')
  })

  it('sans As, on pioche une seule carte et le suivant joue normalement', async () => {
    const game = await newGame(['me', 'o1'])
    setTable(game, card('clubs', 14), [card('clubs', 3)])
    game.state.chauffe = true
    await game.drawCard()
    expect(game.state.hands.me).toHaveLength(2)
    expect(game.state.chauffe).toBe(false)
    expect(game.current.value).toBe('o1')
  })
})

describe('le 2 fait piocher', () => {
  it('le suivant doit piocher 2', async () => {
    const game = await newGame(['me', 'o1'])
    setTable(game, card('hearts', 5), [card('hearts', 2), ...filler(3)])
    await game.playCard(card('hearts', 2))
    expect(game.state.pendingDraw).toBe(2)
    expect(game.current.value).toBe('o1')
  })

  it('les 2 se cumulent', async () => {
    const game = await newGame(['me', 'o1'])
    setTable(game, card('clubs', 2), [card('spades', 2), card('clubs', 3), ...filler(2)])
    game.state.pendingDraw = 2
    expect(game.canPlayCard(card('clubs', 3))).toBe(false)
    await game.playCard(card('spades', 2))
    expect(game.state.pendingDraw).toBe(4)
  })

  it('sans 2, on pioche tout le cumul et on passe son tour', async () => {
    const game = await newGame(['me', 'o1'])
    setTable(game, card('clubs', 2), [card('clubs', 3)])
    game.state.pendingDraw = 4
    await game.drawCard()
    expect(game.state.hands.me).toHaveLength(5)
    expect(game.state.pendingDraw).toBe(0)
    expect(game.current.value).toBe('o1')
  })
})

describe('Valet, 10 et 7', () => {
  it('Valet : le suivant passe son tour', async () => {
    const game = await newGame(['me', 'o1', 'o2'])
    setTable(game, card('hearts', 5), [card('hearts', 11), ...filler(3)])
    await game.playCard(card('hearts', 11))
    expect(game.current.value).toBe('o2')
  })

  it('Valet a deux joueurs : on rejoue puisque l autre passe', async () => {
    const game = await newGame(['me', 'o1'])
    setTable(game, card('hearts', 5), [card('hearts', 11), ...filler(3)])
    await game.playCard(card('hearts', 11))
    expect(game.current.value).toBe('me')
  })

  it('10 : le sens du jeu s inverse', async () => {
    const game = await newGame(['me', 'o1', 'o2'])
    setTable(game, card('hearts', 5), [card('hearts', 10), ...filler(3)])
    await game.playCard(card('hearts', 10))
    expect(game.state.direction).toBe(-1)
    expect(game.current.value).toBe('o2')
  })

  it('7 : carte normale', async () => {
    const game = await newGame(['me', 'o1', 'o2'])
    setTable(game, card('hearts', 5), [card('hearts', 7), ...filler(3)])
    await game.playCard(card('hearts', 7))
    expect(game.current.value).toBe('o1')
  })
})

describe('pioche', () => {
  it('une carte piochee non jouable passe le tour', async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), [card('clubs', 9)], [card('spades', 3)])
    await game.drawCard()
    expect(game.state.hands.me).toHaveLength(2)
    expect(game.current.value).toBe('o1')
  })

  it('une carte piochee jouable peut etre posee ou on peut passer', async () => {
    const game = await newGame()
    const drawn = card('hearts', 9)
    setTable(game, card('hearts', 5), [card('clubs', 9), card('hearts', 2)], [drawn])
    await game.drawCard()
    expect(game.canPass.value).toBe(true)
    expect(game.canPlayCard(card('hearts', 2))).toBe(false)
    expect(game.canPlayCard(drawn)).toBe(true)
    game.pass()
    expect(game.current.value).toBe('o1')
  })
})

describe('pioche vide', () => {
  it('le talon est rebattu automatiquement des que la pioche tombe a 0, sauf la carte du dessus', async () => {
    const game = await newGame()
    const top = card('hearts', 5)
    setTable(game, top, [card('clubs', 9)], [card('spades', 3)])
    game.state.discardPile = [card('diamonds', 4), card('clubs', 6), card('spades', 12)]
    await game.drawCard()
    expect(game.state.drawPile).toHaveLength(3)
    expect(game.state.discardPile).toHaveLength(0)
    expect(game.state.tableCard).toEqual(top)
  })

  it('un cumul de 2 plus grand que la pioche continue apres le rebattage', async () => {
    const game = await newGame()
    setTable(game, card('clubs', 2), [card('clubs', 3)], [card('spades', 3)])
    game.state.discardPile = [card('diamonds', 4), card('clubs', 6), card('spades', 12)]
    game.state.pendingDraw = 4
    await game.drawCard()
    expect(game.state.hands.me).toHaveLength(5)
  })
})

describe('annonce "Carte !"', () => {
  it('oublier d annoncer sa derniere carte fait piocher 2', async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), [card('hearts', 9), card('clubs', 3)])
    await game.playCard(card('hearts', 9))
    expect(game.state.hands.me).toHaveLength(1 + FORGOT_ANNOUNCE_PENALTY)
  })

  it('annoncer a temps evite la penalite', async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), [card('hearts', 9), card('clubs', 3)])
    game.announce()
    await game.playCard(card('hearts', 9))
    expect(game.state.hands.me).toHaveLength(1)
  })

  it('on ne peut pas annoncer avec plus de 2 cartes', async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), filler(4))
    game.announce()
    expect(game.state.announced.me).toBe(false)
  })
})

describe('fin de partie', () => {
  it('poser sa derniere carte fait gagner', async () => {
    const game = await newGame()
    setTable(game, card('hearts', 5), [card('hearts', 13)])
    await game.playCard(card('hearts', 13))
    expect(game.state.phase).toBe('over')
    expect(game.state.winner).toBe('me')
    expect(game.ranking.value[0]).toBe('me')
  })
})

describe('eventail de la main', () => {
  it("reste dans la largeur de l'ecran", () => {
    const width = 390
    const cardW = 97
    for (const count of [1, 5, 9, 14]) {
      const first = handLayout(0, count, cardW, width)
      const last = handLayout(count - 1, count, cardW, width)
      expect(last.x - first.x + cardW).toBeLessThanOrEqual(width)
      expect(first.x).toBeCloseTo(-last.x)
    }
  })
})
