import { reactive, computed } from 'vue'
import type { Card, PlayerId, Suit } from './constants'
import {
  buildDeck,
  HAND_SIZE,
  isSpecial,
  shuffle,
  sortHand,
  SUITS,
  SUIT_NAME,
  PLAYER_LABEL,
  RANK_CHAUFFE,
  CHAUFFE_DRAW,
  RANK_DRAW_TWO,
  DRAW_TWO_COUNT,
  RANK_REVERSE,
  RANK_SKIP,
  WILD_RANK,
} from './constants'

/**
 * Pont entre les regles et l'affichage : le moteur attend la fin de chaque animation avant de
 * poursuivre, pour que les cartes ne "sautent" jamais d'un endroit a l'autre a l'ecran.
 */
export interface PiocheAnimator {
  /** Une carte quitte la pioche vers la main de `p`. */
  draw(p: PlayerId, card: Card, fast?: boolean): Promise<void>
  /** Carte jouee : appeler `detach()` (retire la carte de la main) apres avoir mesure sa position. */
  play(p: PlayerId, card: Card, detach: () => void): Promise<void>
  /** Premiere carte retournee de la pioche vers le talon. */
  reveal(card: Card): Promise<void>
  /** Les cartes du talon repartent vers la pioche pour etre rebattues. */
  reshuffle(cards: Card[]): Promise<void>
  /** Couleur choisie par la personne apres avoir pose un 8, parmi `allowed`. */
  chooseSuit(allowed: Suit[]): Promise<Suit>
}

const instantAnimator: PiocheAnimator = {
  draw: async () => {},
  play: async (_p, _card, detach) => detach(),
  reveal: async () => {},
  reshuffle: async () => {},
  chooseSuit: async (allowed) => allowed[0] ?? 'hearts',
}

export interface PiocheOptions {
  animator?: PiocheAnimator
  random?: () => number
  /** Temps de "reflexion" de l'ordinateur avant de jouer (ms). */
  botDelay?: number
  /** Ecart entre deux cartes pendant la distribution (ms). */
  dealStagger?: number
  /** Temps laisse pour annoncer "Carte !" apres etre descendu a une carte (ms). */
  announceDelay?: number
}

/** Cartes a piocher si on oublie d'annoncer sa derniere carte. */
export const FORGOT_ANNOUNCE_PENALTY = 2

function wait(ms: number) {
  return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

/**
 * Regles retenues (8 americain tel que joue en Cote d'Ivoire, donnees par le proprietaire) :
 * - 8 cartes chacun ; poser une carte de meme couleur ou de meme valeur ;
 * - 8 : se pose sur tout, celui qui le pose "commande" la couleur a jouer ; on ne finit pas sur un 8 ;
 * - As : "chauffe", le suivant doit "refroidir" avec un As, sinon il pioche 1 carte et passe son
 *   tour ; dans les deux cas la chauffe s'arrete (pas de cumul) et le jeu reprend normalement ;
 * - 2 : le suivant pioche 2 cartes et passe son tour, sauf s'il pose un 2 (les 2 se cumulent) ;
 * - Valet (J) : le suivant passe son tour ;
 * - 10 : le sens du jeu s'inverse ;
 * - sans carte jouable on pioche une carte, qu'on peut poser si elle convient ;
 * - a une carte il faut annoncer "Carte !", sinon on pioche 2 cartes ;
 * - pioche vide : le talon (sauf sa carte du dessus) est melange pour refaire la pioche.
 */
export function createPiocheGame(players: PlayerId[], options: PiocheOptions = {}) {
  const animator = options.animator ?? instantAnimator
  const random = options.random ?? Math.random
  const botDelay = options.botDelay ?? 850
  const dealStagger = options.dealStagger ?? 90
  const announceDelay = options.announceDelay ?? 2500
  let stopped = false
  // Tours sans aucune carte posee alors que la pioche est vide : evite une partie sans fin.
  let stalledTurns = 0

  const state = reactive({
    players,
    names: Object.fromEntries(players.map((p) => [p, PLAYER_LABEL[p]])) as Partial<Record<PlayerId, string>>,
    hands: Object.fromEntries(players.map((p) => [p, [] as Card[]])) as Record<PlayerId, Card[]>,
    drawPile: [] as Card[],
    discardPile: [] as Card[],
    tableCard: null as Card | null,
    activeSuit: null as Suit | null,
    turnIndex: 0,
    /** 1 = sens des aiguilles d'une montre, -1 = sens inverse (apres un Valet). */
    direction: 1 as 1 | -1,
    /** Cartes que le prochain joueur devra piocher (2 cumules). */
    pendingDraw: 0,
    /** Un As vient d'etre pose : le joueur suivant doit refroidir (As) ou piocher 1 carte. */
    chauffe: false,
    phase: 'dealing' as 'dealing' | 'playing' | 'over',
    busy: false,
    /** Carte que la personne vient de piocher et qu'elle peut encore poser (sinon elle passe). */
    drawnCard: null as Card | null,
    /** Joueurs ayant annonce "Carte !" pour leur derniere carte. */
    announced: Object.fromEntries(players.map((p) => [p, false])) as Record<PlayerId, boolean>,
    message: '',
    winner: null as PlayerId | null,
  })

  const current = computed<PlayerId>(() => state.players[state.turnIndex]!)
  const isBot = (p: PlayerId) => p !== 'me'
  const isMyTurn = computed(() => state.phase === 'playing' && !state.busy && current.value === 'me')

  function isPlayable(card: Card, p: PlayerId = current.value) {
    if (!state.tableCard) return false
    // On ne termine jamais la partie en posant un 8.
    if (card.rank === WILD_RANK && state.hands[p].length === 1) return false
    // "Chauffe" par un As : seul un autre As peut "refroidir".
    if (state.chauffe) return card.rank === RANK_CHAUFFE
    // Sous une attaque de 2, seul un autre 2 peut etre pose.
    if (state.pendingDraw > 0) return card.rank === RANK_DRAW_TWO
    return card.rank === WILD_RANK || card.suit === state.activeSuit || card.rank === state.tableCard.rank
  }

  function canPlayCard(card: Card) {
    if (!isMyTurn.value || !isPlayable(card)) return false
    if (state.drawnCard) return state.drawnCard.id === card.id
    return state.hands.me.some((c) => c.id === card.id)
  }

  // La pioche est toujours accessible a son tour (piocher meme en ayant une carte jouable est permis).
  const canDraw = computed(() => isMyTurn.value && !state.drawnCard)
  const canPass = computed(() => isMyTurn.value && state.drawnCard !== null)
  /** "Carte !" peut etre annonce juste avant de poser l'avant-derniere carte, ou juste apres. */
  const canAnnounce = computed(
    () => state.phase === 'playing' && !state.announced.me && state.hands.me.length <= 2 && state.hands.me.length > 0,
  )

  /**
   * Des que la pioche est vide, les cartes du talon (sauf celle du dessus, qui reste en jeu) sont
   * ramassees, rebattues et forment une nouvelle pioche : on peut toujours continuer a piocher.
   */
  async function reshuffleIfNeeded() {
    if (state.drawPile.length > 0 || state.discardPile.length === 0) return
    const cards = state.discardPile.splice(0)
    const previous = state.message
    state.message = 'On rebat les cartes'
    await animator.reshuffle(cards)
    state.message = previous
    state.drawPile = shuffle(cards, random)
  }

  function addToHand(p: PlayerId, card: Card) {
    const hand = [...state.hands[p], card]
    state.hands[p] = p === 'me' ? sortHand(hand) : hand
    if (hand.length > 1) state.announced[p] = false
  }

  async function drawCards(p: PlayerId, count: number) {
    for (let i = 0; i < count; i++) {
      await reshuffleIfNeeded()
      const card = state.drawPile.pop()
      if (!card) return
      await animator.draw(p, card, count > 1)
      addToHand(p, card)
    }
    await reshuffleIfNeeded()
  }

  function turnMessage() {
    const who = current.value
    if (state.chauffe) return who === 'me' ? 'Tu es chauffé' : `${PLAYER_LABEL[who]} est chauffé`
    if (state.pendingDraw > 0) {
      return who === 'me' ? `+${state.pendingDraw} pour toi` : `+${state.pendingDraw} pour ${PLAYER_LABEL[who]}`
    }
    return who === 'me' ? 'À toi de jouer' : `${PLAYER_LABEL[who]} réfléchit…`
  }

  function finish(winner: PlayerId) {
    state.winner = winner
    state.phase = 'over'
    state.busy = false
    state.message = winner === 'me' ? 'Tu as gagné !' : `${PLAYER_LABEL[winner]} a gagné`
  }

  function indexAfter(steps: number) {
    const n = state.players.length
    return (((state.turnIndex + state.direction * steps) % n) + n) % n
  }

  /** `steps` : 0 = le meme joueur rejoue, 1 = joueur suivant, 2 = le suivant passe son tour. */
  function endTurn(played: boolean, steps = 1) {
    stalledTurns = played ? 0 : stalledTurns + 1
    if (stalledTurns >= state.players.length * 2) {
      // Plus personne ne peut jouer : celui qui a le moins de cartes gagne.
      const best = state.players.slice().sort((a, b) => state.hands[a].length - state.hands[b].length)[0]!
      finish(best)
      return
    }
    state.drawnCard = null
    state.turnIndex = indexAfter(steps)
    state.busy = false
    state.message = turnMessage()
    void scheduleBot()
  }

  function mostCommonSuit(p: PlayerId): Suit {
    const counts = new Map<Suit, number>()
    for (const c of state.hands[p]) {
      if (c.rank !== WILD_RANK) counts.set(c.suit, (counts.get(c.suit) ?? 0) + 1)
    }
    let best: Suit = state.activeSuit ?? SUITS[0]!
    let bestCount = 0
    for (const [suit, n] of counts) {
      if (n > bestCount) {
        best = suit
        bestCount = n
      }
    }
    return best
  }

  /** Sanction si la personne descend a une carte sans avoir annonce "Carte !" a temps. */
  async function checkAnnounce(p: PlayerId) {
    if (state.hands[p].length !== 1 || state.phase !== 'playing') return
    if (isBot(p)) {
      state.announced[p] = true
      return
    }
    if (!state.announced.me) await wait(announceDelay)
    if (state.phase !== 'playing' || state.hands.me.length !== 1 || state.announced.me) return
    state.message = `Tu n'as pas annoncé « Carte ! » : +${FORGOT_ANNOUNCE_PENALTY}`
    await drawCards('me', FORGOT_ANNOUNCE_PENALTY)
  }

  function announce() {
    if (canAnnounce.value) state.announced.me = true
  }

  async function playCard(p: PlayerId, card: Card) {
    if (state.phase !== 'playing' || state.busy || p !== current.value || !isPlayable(card)) return
    if (p === 'me' && !canPlayCard(card)) return

    state.busy = true
    state.message = ''
    await animator.play(p, card, () => {
      state.hands[p] = state.hands[p].filter((c) => c.id !== card.id)
    })
    if (state.tableCard) state.discardPile.push(state.tableCard)
    state.tableCard = card
    state.activeSuit = card.suit
    state.drawnCard = null

    if (state.hands[p].length === 0) {
      finish(p)
      return
    }

    let steps = 1
    if (card.rank === WILD_RANK) {
      const suit = p === 'me' ? await animator.chooseSuit(SUITS.slice()) : mostCommonSuit(p)
      state.activeSuit = suit
      state.message = p === 'me' ? `Tu demandes du ${SUIT_NAME[suit]}` : `${PLAYER_LABEL[p]} demande du ${SUIT_NAME[suit]}`
    } else if (card.rank === RANK_CHAUFFE) {
      // Premier As : on chauffe. As pose en reponse : on refroidit, et la chauffe s'arrete la.
      state.chauffe = !state.chauffe
      const verb = state.chauffe ? 'chauffe' : 'refroidit'
      state.message = p === 'me' ? `Tu ${verb}s` : `${PLAYER_LABEL[p]} ${verb}`
    } else if (card.rank === RANK_DRAW_TWO) {
      state.pendingDraw += DRAW_TWO_COUNT
      state.message = p === 'me' ? `Tu fais piocher ${state.pendingDraw}` : `${PLAYER_LABEL[p]} fait piocher ${state.pendingDraw}`
    } else if (card.rank === RANK_SKIP) {
      steps = 2
      const skipped = state.players[indexAfter(1)]!
      state.message = skipped === 'me' ? 'Tu passes ton tour' : `${PLAYER_LABEL[skipped]} passe son tour`
    } else if (card.rank === RANK_REVERSE) {
      state.direction = state.direction === 1 ? -1 : 1
      state.message = 'Le sens du jeu change'
    }

    await checkAnnounce(p)
    if (state.message && isBot(p)) await wait(600)
    endTurn(true, steps)
  }

  /**
   * Pioche : chauffe par un As, on pioche 1 carte et on passe ; sous une attaque de 2, on ramasse
   * tout le cumul et on passe ; sinon une carte, qu'on peut poser si elle est jouable.
   */
  async function drawCard(p: PlayerId = 'me') {
    if (state.phase !== 'playing' || state.busy || p !== current.value) return
    if (p === 'me' && !canDraw.value) return

    state.busy = true
    if (state.chauffe) {
      state.chauffe = false
      await drawCards(p, CHAUFFE_DRAW)
      endTurn(false)
      return
    }
    if (state.pendingDraw > 0) {
      const count = state.pendingDraw
      state.pendingDraw = 0
      await drawCards(p, count)
      endTurn(false)
      return
    }

    await reshuffleIfNeeded()
    const card = state.drawPile.pop()
    if (!card) {
      // Toutes les cartes sont dans les mains : rien a rebattre.
      state.message = 'Plus aucune carte à piocher'
      await wait(600)
      endTurn(false)
      return
    }
    await animator.draw(p, card)
    addToHand(p, card)
    await reshuffleIfNeeded()

    if (!isPlayable(card)) {
      endTurn(false)
      return
    }
    if (p === 'me') {
      state.drawnCard = card
      state.busy = false
      state.message = ''
      return
    }
    state.busy = false
    await wait(botDelay / 2)
    await playCard(p, card)
  }

  function pass() {
    if (!canPass.value) return
    endTurn(false)
  }

  function botPick(p: PlayerId): Card | null {
    const playable = state.hands[p].filter((c) => isPlayable(c, p))
    const normal = playable.filter((c) => c.rank !== WILD_RANK)
    if (normal.length > 0) {
      // Garde la couleur ou il a le plus de cartes, et garde ses 8 pour plus tard.
      const favorite = mostCommonSuit(p)
      return normal.find((c) => c.suit === favorite) ?? normal[Math.floor(random() * normal.length)] ?? null
    }
    return playable[0] ?? null
  }

  async function scheduleBot() {
    if (stopped || state.phase !== 'playing' || !isBot(current.value)) return
    await wait(botDelay)
    if (stopped || state.phase !== 'playing' || state.busy || !isBot(current.value)) return
    const p = current.value
    const pick = botPick(p)
    if (pick) await playCard(p, pick)
    else await drawCard(p)
  }

  async function start() {
    const deck = shuffle(buildDeck(), random)
    state.drawPile = deck
    state.phase = 'dealing'
    state.busy = true
    state.message = ''

    const landings: Promise<void>[] = []
    for (let round = 0; round < HAND_SIZE; round++) {
      for (const p of players) {
        const card = state.drawPile.pop()!
        landings.push(animator.draw(p, card, true).then(() => addToHand(p, card)))
        await wait(dealStagger)
      }
    }
    await Promise.all(landings)

    // La premiere carte du talon est une carte simple : une carte speciale retourne sous la pioche.
    let first = state.drawPile.pop()!
    while (isSpecial(first)) {
      state.drawPile.unshift(first)
      first = state.drawPile.pop()!
    }
    await animator.reveal(first)
    state.tableCard = first
    state.activeSuit = first.suit
    state.phase = 'playing'
    state.turnIndex = 0
    state.busy = false
    state.message = turnMessage()
    void scheduleBot()
  }

  const ranking = computed<PlayerId[]>(() => {
    if (!state.winner) return []
    const others = state.players
      .filter((p) => p !== state.winner)
      .sort((a, b) => state.hands[a].length - state.hands[b].length)
    return [state.winner, ...others]
  })

  return {
    state,
    current,
    isMyTurn,
    canDraw,
    canPass,
    canAnnounce,
    ranking,
    isBot,
    isPlayable,
    canPlayCard,
    playCard: (card: Card) => playCard('me', card),
    drawCard: () => drawCard('me'),
    pass,
    announce,
    start,
    stop: () => {
      stopped = true
    },
  }
}

export type PiocheGame = ReturnType<typeof createPiocheGame>
