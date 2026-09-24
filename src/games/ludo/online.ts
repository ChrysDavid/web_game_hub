import { computed, reactive } from 'vue'
import type { AppSession } from '@/services/appLink'
import type { PlayerColor } from './constants'
import { MAX_STEP } from './constants'
import type { Token } from './engine'
import type { LudoGameView } from './types'

/**
 * Partie de Ludo en ligne entre 2 et 4 vraies personnes (ouverte depuis l'app uniquement).
 *
 * Le serveur (vidolove_backend, apps/games) lance le de et valide chaque coup : ici on ne fait
 * qu'envoyer les actions du joueur et animer ce que le serveur renvoie. Jamais d'ordinateur.
 */

interface ServerGame {
  players: PlayerColor[]
  tokens: Record<PlayerColor, number[]>
  turn: number
  dice: number | null
  awaiting_choice: boolean
  ranking: PlayerColor[]
  abandoned: PlayerColor[]
  message: string
}

interface ServerEvent {
  type: 'rolled' | 'moved' | 'timeout' | 'abandoned'
  color: PlayerColor
  value?: number
  token?: number
  from?: number
  to?: number
  captured?: { color: PlayerColor; token: number }[]
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

type ServerMessage =
  | ServerUpdate
  | { type: 'welcome'; color: PlayerColor | '' }
  | { type: 'error'; detail: string }

export type OnlinePhase = 'connecting' | 'lobby' | 'playing' | 'finished' | 'error'

const TICKET_REFUSED = 4401
const MAX_RECONNECTS = 3

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function createOnlineLudoGame(session: AppSession) {
  const state = reactive({
    phase: 'connecting' as OnlinePhase,
    myColor: null as PlayerColor | null,
    lobbyPlayers: 0,
    minPlayers: 2,
    maxPlayers: 4,
    startsIn: null as number | null,
    secondsLeft: null as number | null,
    error: '',
    players: [] as PlayerColor[],
    tokens: [] as Token[],
    turn: 0,
    dice: null as number | null,
    rolling: false,
    moving: false,
    awaitingChoice: false,
    pending: false,
    message: '',
    ranking: [] as PlayerColor[],
    abandoned: [] as PlayerColor[],
  })

  const current = computed<PlayerColor>(() => state.players[state.turn] ?? 'red')
  const gameOver = computed(() => state.phase === 'finished')
  const isMyTurn = computed(() => state.phase === 'playing' && current.value === state.myColor)
  const canRoll = computed(
    () =>
      isMyTurn.value &&
      state.dice == null &&
      !state.rolling &&
      !state.moving &&
      !state.awaitingChoice &&
      !state.pending,
  )

  let socket: WebSocket | null = null
  let reconnects = 0
  let closedByUs = false
  let queue: Promise<void> = Promise.resolve()
  let timer: ReturnType<typeof setInterval> | null = null

  function tokensOf(color: PlayerColor) {
    return state.tokens.filter((t) => t.color === color)
  }

  function homeCount(color: PlayerColor) {
    return tokensOf(color).filter((t) => t.step === MAX_STEP).length
  }

  function movableTokens(): Token[] {
    const d = state.dice
    if (d == null || !isMyTurn.value) return []
    return tokensOf(current.value).filter((t) => {
      if (t.step === MAX_STEP) return false
      if (t.step < 0) return d === 6
      return t.step + d <= MAX_STEP
    })
  }

  function isMovable(t: Token) {
    return state.awaitingChoice && !state.pending && movableTokens().includes(t)
  }

  function send(payload: object) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
  }

  function rollDice() {
    if (!canRoll.value) return
    state.pending = true
    send({ action: 'roll' })
  }

  function playToken(t: Token) {
    if (!isMovable(t)) return
    state.pending = true
    send({ action: 'move', token: t.id })
  }

  function leave() {
    closedByUs = true
    send({ action: 'leave' })
    socket?.close()
    stopTimer()
  }

  // --- Synchronisation avec le serveur -----------------------------------------------------------

  function startTimer() {
    stopTimer()
    timer = setInterval(() => {
      if (state.startsIn != null && state.startsIn > 0) state.startsIn--
      if (state.secondsLeft != null && state.secondsLeft > 0) state.secondsLeft--
    }, 1000)
  }

  function stopTimer() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function findToken(color: PlayerColor, id: number) {
    return state.tokens.find((t) => t.color === color && t.id === id)
  }

  function syncGame(game: ServerGame) {
    if (state.players.join() !== game.players.join()) {
      state.players = game.players
      state.tokens = game.players.flatMap((color) =>
        game.tokens[color].map((step, id) => ({ color, id, step })),
      )
    } else {
      for (const color of game.players) {
        game.tokens[color].forEach((step, id) => {
          const t = findToken(color, id)
          if (t) t.step = step
        })
      }
    }
    state.turn = game.turn
    state.dice = game.dice
    state.awaitingChoice = game.awaiting_choice
    state.ranking = game.ranking
    state.abandoned = game.abandoned
    state.message = game.message
  }

  async function animateRoll(value: number) {
    state.rolling = true
    for (let i = 0; i < 9; i++) {
      state.dice = Math.floor(Math.random() * 6) + 1
      await wait(55)
    }
    state.dice = value
    state.rolling = false
    await wait(450)
  }

  async function animateMove(event: ServerEvent) {
    const t = findToken(event.color, event.token!)
    if (!t) return
    state.moving = true
    if (event.from! < 0) {
      t.step = 0
      await wait(280)
    } else {
      while (t.step < event.to!) {
        t.step++
        await wait(155)
      }
    }
    for (const c of event.captured ?? []) {
      const captured = findToken(c.color, c.token)
      if (captured) captured.step = -1
    }
    if (event.captured?.length) await wait(420)
    state.moving = false
  }

  async function applyUpdate(update: ServerUpdate) {
    state.lobbyPlayers = update.players
    state.minPlayers = update.min_players
    state.maxPlayers = update.max_players
    state.startsIn = update.starts_in

    if (update.game && state.players.length === 0) syncGame(update.game)
    for (const event of update.events) {
      if (event.type === 'rolled') await animateRoll(event.value!)
      if (event.type === 'moved') await animateMove(event)
    }
    if (update.game) syncGame(update.game)

    state.pending = false
    state.phase =
      update.status === 'waiting' ? 'lobby' : update.status === 'playing' ? 'playing' : 'finished'
    state.secondsLeft = update.status === 'playing' ? update.turn_seconds : null
    if (state.phase === 'finished') stopTimer()
  }

  function onMessage(raw: string) {
    const message = JSON.parse(raw) as ServerMessage
    if (message.type === 'welcome') {
      if (message.color) state.myColor = message.color
    } else if (message.type === 'error') {
      state.pending = false
      state.message = message.detail
    } else if (message.type === 'update') {
      // Les mises a jour sont jouees dans l'ordre, chacune apres la fin de l'animation precedente.
      queue = queue.then(() => applyUpdate(message))
    }
  }

  function connect() {
    const url = `${session.wsBase}/ws/games/ludo/?ticket=${encodeURIComponent(session.ticket)}`
    socket = new WebSocket(url)
    socket.onopen = () => {
      reconnects = 0
      startTimer()
    }
    socket.onmessage = (e) => onMessage(e.data as string)
    socket.onclose = (e) => {
      if (closedByUs || state.phase === 'finished') return
      if (e.code === TICKET_REFUSED) {
        state.phase = 'error'
        state.error = 'Lien de jeu expiré. Reviens dans l’app pour relancer une partie.'
        return
      }
      if (reconnects < MAX_RECONNECTS) {
        reconnects++
        setTimeout(connect, 1500)
        return
      }
      state.phase = 'error'
      state.error = 'Connexion perdue. Reviens dans l’app pour relancer une partie.'
    }
  }

  function start() {
    connect()
  }

  const view: LudoGameView = {
    state,
    current,
    gameOver,
    canRoll,
    homeCount,
    isMovable,
    isBot: () => false,
    rollDice,
    playToken,
  }

  return { ...view, state, isMyTurn, start, leave }
}

export type OnlineLudoGame = ReturnType<typeof createOnlineLudoGame>
