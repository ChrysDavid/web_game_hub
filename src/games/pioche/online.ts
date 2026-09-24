import { computed, reactive } from 'vue'
import type { AppSession } from '@/services/appLink'
import {
  OPPONENTS,
  PLAYER_LABEL,
  RANK_CHAUFFE,
  RANK_DRAW_TWO,
  SUITS,
  SUIT_NAME,
  WILD_RANK,
  sortHand,
  type Card,
  type PlayerId,
  type Rank,
  type Suit,
} from './constants'
import type { PiocheAnimator } from './engine'
import { playSound } from '@/services/sound'
import type { PiocheTable, PiocheTableState } from './types'

/**
 * Partie de 8 americain en ligne entre 2 et 4 vraies personnes (ouverte depuis l'app uniquement).
 *
 * Le serveur (vidolove_backend, apps/games/pioche) distribue et valide chaque coup ; ici on envoie
 * les actions du joueur et on rejoue les evenements recus avec les memes animations que la partie
 * contre l'ordinateur. Le serveur n'envoie jamais les cartes des autres : leurs mains et la pioche
 * sont representees par des cartes "cachees" (jamais retournees a l'ecran).
 */

type ServerSeat = string

interface ServerGame {
  players: ServerSeat[]
  me: ServerSeat
  names: Record<ServerSeat, string>
  hand: string[]
  counts: Record<ServerSeat, number>
  draw_count: number
  discard_top: string[]
  table_card: string
  active_suit: Suit
  turn: number
  direction: 1 | -1
  pending_draw: number
  chauffe: boolean
  drawn_card: string | null
  announced: Record<ServerSeat, boolean>
  ranking: ServerSeat[]
  abandoned: ServerSeat[]
}

interface ServerEvent {
  type: string
  seat?: ServerSeat
  card?: string
  suit?: Suit
  cards?: string[] | null
  count?: number
  reason?: string
  winner?: ServerSeat
}

interface ServerUpdate {
  type: 'update'
  status: 'waiting' | 'playing' | 'finished'
  players: number
  min_players: number
  max_players: number
  starts_in: number | null
  turn_seconds: number
  game: ServerGame | null
  events: ServerEvent[]
}

type ServerMessage = ServerUpdate | { type: 'welcome'; seat: ServerSeat } | { type: 'error'; detail: string }

export type OnlinePhase = 'connecting' | 'lobby' | 'playing' | 'finished' | 'error'

const TICKET_REFUSED = 4401
const MAX_RECONNECTS = 3
const DEAL_STAGGER = 90

export function parseCard(id: string): Card {
  const [suit, rank] = id.split('-')
  return { id, suit: suit as Suit, rank: Number(rank) as Rank }
}

let hiddenId = 0
function hiddenCard(): Card {
  return { id: `hidden-${hiddenId++}`, suit: 'spades', rank: 2 }
}

function hiddenCards(count: number) {
  return Array.from({ length: Math.max(0, count) }, hiddenCard)
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function createOnlinePiocheGame(session: AppSession, animator: PiocheAnimator) {
  const state = reactive<PiocheTableState & { turnIndex: number }>({
    players: ['me'],
    names: { me: PLAYER_LABEL.me },
    hands: { me: [], o1: [], o2: [], o3: [] },
    drawPile: [],
    discardPile: [],
    tableCard: null,
    activeSuit: null,
    direction: 1,
    pendingDraw: 0,
    chauffe: false,
    drawnCard: null,
    announced: { me: false, o1: false, o2: false, o3: false },
    phase: 'dealing',
    message: '',
    winner: null,
    turnIndex: 0,
  })

  /** Etat de la connexion et du salon (en plus de la table). */
  const online = reactive({
    phase: 'connecting' as OnlinePhase,
    lobbyPlayers: 0,
    minPlayers: 2,
    maxPlayers: 4,
    startsIn: null as number | null,
    secondsLeft: null as number | null,
    turnSeconds: 30,
    error: '',
    /** Evenements du serveur en train d'etre animes, ou coup envoye sans reponse encore. */
    animating: false,
    waitingServer: false,
    ranking: [] as PlayerId[],
  })

  // Correspondance place serveur ("p0".."p3") <-> joueur a l'ecran ("me", "o1"...).
  let seatToLocal: Record<ServerSeat, PlayerId> = {}
  let initialized = false
  let socket: WebSocket | null = null
  let reconnects = 0
  let closedByUs = false
  let queue: Promise<void> = Promise.resolve()
  let timer: ReturnType<typeof setInterval> | null = null

  const current = computed<PlayerId>(() => state.players[state.turnIndex] ?? 'me')
  const isMyTurn = computed(
    () => state.phase === 'playing' && current.value === 'me' && !online.animating && !online.waitingServer,
  )
  const canDraw = computed(() => isMyTurn.value && !state.drawnCard)
  const canPass = computed(() => isMyTurn.value && state.drawnCard !== null)
  const ranking = computed<PlayerId[]>(() => online.ranking)

  function local(seat: ServerSeat | undefined): PlayerId {
    return (seat && seatToLocal[seat]) || 'me'
  }

  function nameOf(p: PlayerId) {
    return state.names[p] ?? PLAYER_LABEL[p]
  }

  // --- Regles cote client : seulement pour renvoyer tout de suite une carte refusee -------------

  function isPlayable(card: Card) {
    const table = state.tableCard
    if (!table) return false
    if (card.rank === WILD_RANK && state.hands.me.length === 1) return false
    if (state.chauffe) return card.rank === RANK_CHAUFFE
    if (state.pendingDraw > 0) return card.rank === RANK_DRAW_TWO
    if (state.drawnCard && state.drawnCard.id !== card.id) return false
    return card.rank === WILD_RANK || card.suit === state.activeSuit || card.rank === table.rank
  }

  function canPlayCard(card: Card) {
    return isMyTurn.value && state.hands.me.some((c) => c.id === card.id) && isPlayable(card)
  }

  // --- Actions du joueur -------------------------------------------------------------------------

  function send(payload: object) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
  }

  async function playCard(card: Card) {
    if (!canPlayCard(card)) return
    online.waitingServer = true
    let suit: Suit | undefined
    if (card.rank === WILD_RANK) suit = await animator.chooseSuit(SUITS.slice())
    send({ action: 'play', card: card.id, suit })
  }

  async function drawCard() {
    if (!canDraw.value) return
    online.waitingServer = true
    send({ action: 'draw' })
  }

  function pass() {
    if (!canPass.value) return
    online.waitingServer = true
    send({ action: 'pass' })
  }

  function announce() {
    const n = state.hands.me.length
    if (state.phase !== 'playing' || state.announced.me || n === 0 || n > 2) return
    state.announced.me = true
    send({ action: 'announce' })
  }

  // --- Evenements recus : rejoues un par un avec les animations -----------------------------------

  function setupSeats(game: ServerGame) {
    const start = game.players.indexOf(game.me)
    const ordered = [...game.players.slice(start), ...game.players.slice(0, start)]
    seatToLocal = {}
    ordered.forEach((seat, i) => {
      seatToLocal[seat] = i === 0 ? 'me' : OPPONENTS[i - 1]!
    })
    // Ordre de jeu du serveur, vu depuis ma place : les index de tour restent les memes.
    state.players = game.players.map((seat) => seatToLocal[seat]!)
    state.names = {}
    for (const seat of game.players) {
      const p = seatToLocal[seat]!
      state.names[p] = p === 'me' ? PLAYER_LABEL.me : (game.names[seat] ?? PLAYER_LABEL[p])
    }
  }

  function resize(cards: Card[], count: number) {
    if (cards.length > count) return cards.slice(0, count)
    return [...cards, ...hiddenCards(count - cards.length)]
  }

  function turnMessage() {
    const who = current.value
    if (state.chauffe) return who === 'me' ? 'Tu es chauffé' : `${nameOf(who)} est chauffé`
    if (state.pendingDraw > 0) {
      return who === 'me' ? `+${state.pendingDraw} pour toi` : `+${state.pendingDraw} pour ${nameOf(who)}`
    }
    return who === 'me' ? 'À toi de jouer' : `${nameOf(who)} réfléchit…`
  }

  function sync(game: ServerGame, status: ServerUpdate['status']) {
    state.hands.me = sortHand(game.hand.map(parseCard))
    for (const seat of game.players) {
      const p = local(seat)
      if (p !== 'me') state.hands[p] = resize(state.hands[p], game.counts[seat] ?? 0)
    }
    state.drawPile = resize(state.drawPile, game.draw_count)
    state.discardPile = game.discard_top.map(parseCard)
    state.tableCard = parseCard(game.table_card)
    state.activeSuit = game.active_suit
    state.turnIndex = game.turn
    state.direction = game.direction
    state.pendingDraw = game.pending_draw
    state.chauffe = game.chauffe
    state.drawnCard = game.drawn_card ? parseCard(game.drawn_card) : null
    for (const seat of game.players) state.announced[local(seat)] = !!game.announced[seat]
    online.ranking = game.ranking.map(local)
    if (status === 'finished' || game.ranking.length > 0) {
      state.phase = 'over'
      state.winner = online.ranking[0] ?? null
      state.message = state.winner === 'me' ? 'Tu as gagné !' : `${nameOf(state.winner!)} a gagné`
    } else {
      state.phase = 'playing'
    }
  }

  async function animateDeal(game: ServerGame) {
    playSound('cardShuffle')
    const total = game.players.reduce((sum, seat) => sum + (game.counts[seat] ?? 0), 0)
    state.drawPile = hiddenCards(game.draw_count + total + 1)
    state.tableCard = null
    for (const p of state.players) state.hands[p] = []
    const landings: Promise<void>[] = []
    const rounds = Math.max(...game.players.map((seat) => game.counts[seat] ?? 0))
    for (let round = 0; round < rounds; round++) {
      for (const seat of game.players) {
        const p = local(seat)
        if (round >= (game.counts[seat] ?? 0)) continue
        state.drawPile.pop()
        const card = p === 'me' ? parseCard(game.hand[round]!) : hiddenCard()
        landings.push(
          animator.draw(p, card, true).then(() => {
            state.hands[p] = p === 'me' ? sortHand([...state.hands.me, card]) : [...state.hands[p], card]
          }),
        )
        await wait(DEAL_STAGGER)
      }
    }
    await Promise.all(landings)
    state.drawPile.pop()
    await animator.reveal(parseCard(game.table_card))
  }

  async function animateEvent(event: ServerEvent) {
    const p = local(event.seat)
    const who = nameOf(p)
    switch (event.type) {
      case 'played': {
        const card = parseCard(event.card!)
        await animator.play(p, card, () => {
          const hand = state.hands[p]
          state.hands[p] = p === 'me' ? hand.filter((c) => c.id !== card.id) : hand.slice(0, -1)
        })
        if (state.tableCard) state.discardPile = [...state.discardPile, state.tableCard]
        state.tableCard = card
        state.activeSuit = event.suit ?? card.suit
        if (card.rank === WILD_RANK) {
          const suit = SUIT_NAME[state.activeSuit]
          state.message = p === 'me' ? `Tu demandes du ${suit}` : `${who} demande du ${suit}`
          await wait(p === 'me' ? 0 : 500)
        }
        break
      }
      case 'drew': {
        const cards = event.cards ?? null
        const count = cards ? cards.length : (event.count ?? 0)
        if (event.reason === 'forgot') {
          state.message = p === 'me' ? "Tu n'as pas annoncé « Carte ! » : +2" : `${who} n'a pas annoncé : +2`
        }
        for (let i = 0; i < count; i++) {
          state.drawPile = state.drawPile.slice(0, -1)
          const card = p === 'me' && cards ? parseCard(cards[i]!) : hiddenCard()
          await animator.draw(p, card, count > 1)
          state.hands[p] = p === 'me' ? sortHand([...state.hands.me, card]) : [...state.hands[p], card]
        }
        break
      }
      case 'reshuffled': {
        const previous = state.message
        state.message = 'On rebat les cartes'
        await animator.reshuffle(state.discardPile.slice())
        state.discardPile = []
        state.drawPile = hiddenCards(event.count ?? 0)
        state.message = previous
        break
      }
      case 'chauffe':
      case 'refroidit':
        state.message = p === 'me' ? `Tu ${event.type}s` : `${who} ${event.type}`
        await wait(400)
        break
      case 'skipped':
        state.message = p === 'me' ? 'Tu passes ton tour' : `${who} passe son tour`
        await wait(500)
        break
      case 'reversed':
        state.message = 'Le sens du jeu change'
        await wait(400)
        break
      case 'announced':
        state.announced[p] = true
        break
      case 'timeout':
        state.message = p === 'me' ? 'Temps écoulé' : `Temps écoulé pour ${who}`
        await wait(400)
        break
      case 'abandoned':
        state.message = `${who} a quitté la partie`
        state.hands[p] = []
        await wait(500)
        break
      case 'empty':
        state.message = 'Plus aucune carte à piocher'
        await wait(500)
        break
    }
  }

  async function applyUpdate(update: ServerUpdate) {
    online.lobbyPlayers = update.players
    online.minPlayers = update.min_players
    online.maxPlayers = update.max_players
    online.startsIn = update.starts_in
    online.turnSeconds = update.turn_seconds

    const game = update.game
    if (!game) {
      online.phase = 'lobby'
      return
    }

    online.animating = true
    online.phase = update.status === 'finished' ? 'finished' : 'playing'
    if (!initialized) {
      setupSeats(game)
      initialized = true
      if (update.events.some((e) => e.type === 'started')) {
        state.phase = 'dealing'
        await animateDeal(game)
      }
    } else {
      for (const event of update.events) await animateEvent(event)
    }
    sync(game, update.status)
    online.animating = false
    online.waitingServer = false
    if (state.phase === 'playing') {
      const eventMessage = update.events.some((e) =>
        ['skipped', 'reversed', 'chauffe', 'refroidit', 'timeout', 'abandoned', 'empty'].includes(e.type),
      )
      if (!eventMessage) state.message = turnMessage()
      online.secondsLeft = update.turn_seconds
    } else {
      online.secondsLeft = null
      online.phase = 'finished'
      stopTimer()
    }
  }

  function onMessage(raw: string) {
    const message = JSON.parse(raw) as ServerMessage
    if (message.type === 'error') {
      online.waitingServer = false
      state.message = message.detail
    } else if (message.type === 'update') {
      // Les mises a jour sont jouees dans l'ordre, chacune apres la fin de l'animation precedente.
      queue = queue.then(() => applyUpdate(message)).catch(() => undefined)
    }
  }

  // --- Connexion ---------------------------------------------------------------------------------

  function startTimer() {
    stopTimer()
    timer = setInterval(() => {
      if (online.startsIn != null && online.startsIn > 0) online.startsIn--
      if (online.secondsLeft != null && online.secondsLeft > 0) online.secondsLeft--
    }, 1000)
  }

  function stopTimer() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function connect() {
    const url = `${session.wsBase}/ws/games/pioche/?ticket=${encodeURIComponent(session.ticket)}`
    socket = new WebSocket(url)
    socket.onopen = () => {
      reconnects = 0
      startTimer()
    }
    socket.onmessage = (e) => onMessage(e.data as string)
    socket.onclose = (e) => {
      if (closedByUs || online.phase === 'finished') return
      if (e.code === TICKET_REFUSED) {
        online.phase = 'error'
        online.error = 'Lien de jeu expiré. Reviens dans l’app pour relancer une partie.'
        return
      }
      if (reconnects < MAX_RECONNECTS) {
        reconnects++
        setTimeout(connect, 1500)
        return
      }
      online.phase = 'error'
      online.error = 'Connexion perdue. Reviens dans l’app pour relancer une partie.'
    }
  }

  function stop() {
    if (closedByUs) return
    closedByUs = true
    send({ action: 'leave' })
    socket?.close()
    stopTimer()
  }

  const table: PiocheTable = {
    state,
    current,
    isMyTurn,
    canDraw,
    canPass,
    ranking,
    canPlayCard,
    playCard,
    drawCard,
    pass,
    announce,
    start: connect,
    stop,
  }
  return { ...table, online }
}

export type OnlinePiocheGame = ReturnType<typeof createOnlinePiocheGame>
