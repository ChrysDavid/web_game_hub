import { reactive, computed } from 'vue'
import type { PlayerColor } from './constants'
import { COLOR_LABEL, LAST_TRACK_STEP, MAX_STEP, SAFE_INDICES, trackIndex } from './constants'

export interface Token {
  color: PlayerColor
  id: number
  step: number // -1 = garage, 0..50 = circuit, 51..55 = couloir, 56 = rentre
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function createLudoGame(players: PlayerColor[], bots: PlayerColor[]) {
  const botSet = new Set(bots)

  const state = reactive({
    players,
    tokens: players.flatMap((color) =>
      [0, 1, 2, 3].map((id) => ({ color, id, step: -1 }) as Token),
    ),
    turnIndex: 0,
    dice: null as number | null,
    rolling: false,
    moving: false,
    awaitingChoice: false,
    sixStreak: 0,
    message: 'Lancez le dé pour commencer',
    ranking: [] as PlayerColor[],
  })

  const current = computed(() => state.players[state.turnIndex]!)
  const isBotTurn = computed(() => botSet.has(current.value))
  const gameOver = computed(() => state.ranking.length >= state.players.length - 1)
  const canRoll = computed(
    () =>
      !state.rolling &&
      !state.moving &&
      !state.awaitingChoice &&
      !gameOver.value &&
      !isBotTurn.value,
  )

  function tokensOf(color: PlayerColor) {
    return state.tokens.filter((t) => t.color === color)
  }

  function homeCount(color: PlayerColor) {
    return tokensOf(color).filter((t) => t.step === MAX_STEP).length
  }

  function hasFinished(color: PlayerColor) {
    return homeCount(color) === 4
  }

  function movableTokens(): Token[] {
    const d = state.dice
    if (d == null) return []
    return tokensOf(current.value).filter((t) => {
      if (t.step === MAX_STEP) return false
      if (t.step < 0) return d === 6
      return t.step + d <= MAX_STEP
    })
  }

  function isMovable(t: Token) {
    return state.awaitingChoice && movableTokens().includes(t)
  }

  function resolveCapture(t: Token): boolean {
    if (t.step < 0 || t.step > LAST_TRACK_STEP) return false
    const cell = trackIndex(t.color, t.step)
    if (SAFE_INDICES.has(cell)) return false

    let captured = false
    for (const other of state.tokens) {
      if (other.color === t.color) continue
      if (other.step < 0 || other.step > LAST_TRACK_STEP) continue
      if (trackIndex(other.color, other.step) === cell) {
        other.step = -1
        captured = true
      }
    }
    if (captured) state.message = `Capture ! ${COLOR_LABEL[current.value]} rejoue`
    return captured
  }

  function botPick(moves: Token[]): Token {
    const d = state.dice!
    let best = moves[0]!
    let bestScore = -Infinity

    for (const t of moves) {
      const target = t.step < 0 ? 0 : t.step + d
      let score = Math.floor(target / 4)

      if (target === MAX_STEP) score += 120
      if (t.step < 0) score += 55
      if (target > LAST_TRACK_STEP) score += 35

      if (target <= LAST_TRACK_STEP) {
        const cell = trackIndex(t.color, target)
        if (SAFE_INDICES.has(cell)) {
          score += 18
        } else {
          for (const o of state.tokens) {
            if (
              o.color !== t.color &&
              o.step >= 0 &&
              o.step <= LAST_TRACK_STEP &&
              trackIndex(o.color, o.step) === cell
            ) {
              score += 90
            }
          }
        }
      }

      if (score > bestScore) {
        bestScore = score
        best = t
      }
    }
    return best
  }

  function nextTurn() {
    state.dice = null
    state.awaitingChoice = false
    state.sixStreak = 0
    for (let i = 1; i <= state.players.length; i++) {
      const idx = (state.turnIndex + i) % state.players.length
      if (!hasFinished(state.players[idx]!)) {
        state.turnIndex = idx
        break
      }
    }
    state.message = ''
    scheduleBot()
  }

  function sameTurn() {
    state.dice = null
    state.awaitingChoice = false
    if (!state.message) state.message = `${COLOR_LABEL[current.value]} rejoue`
    scheduleBot()
  }

  function scheduleBot() {
    if (gameOver.value || !isBotTurn.value) return
    setTimeout(() => {
      if (isBotTurn.value) rollDice()
    }, 650)
  }

  async function playToken(t: Token) {
    if (state.moving || state.dice == null) return
    if (!movableTokens().includes(t)) return

    const d = state.dice
    state.awaitingChoice = false
    state.moving = true
    state.message = ''

    if (t.step < 0) {
      t.step = 0
      await wait(280)
    } else {
      for (let i = 0; i < d; i++) {
        t.step++
        await wait(155)
      }
    }

    const captured = resolveCapture(t)
    if (captured) await wait(420)

    const reachedHome = t.step === MAX_STEP
    if (reachedHome) state.message = `${COLOR_LABEL[t.color]} rentre un pion`

    if (hasFinished(t.color) && !state.ranking.includes(t.color)) {
      state.ranking.push(t.color)
      state.message = `${COLOR_LABEL[t.color]} a rentré ses 4 pions`
    }

    state.moving = false

    if (gameOver.value) {
      for (const c of state.players) {
        if (!state.ranking.includes(c)) state.ranking.push(c)
      }
      state.message = 'Partie terminée'
      return
    }

    const replay = d === 6 || captured || reachedHome
    if (replay && !hasFinished(current.value)) {
      sameTurn()
    } else {
      nextTurn()
    }
  }

  async function rollDice() {
    if (state.rolling || state.moving || state.awaitingChoice || gameOver.value) return

    state.rolling = true
    state.message = ''
    for (let i = 0; i < 9; i++) {
      state.dice = Math.floor(Math.random() * 6) + 1
      await wait(55)
    }
    state.dice = Math.floor(Math.random() * 6) + 1
    state.rolling = false

    state.sixStreak = state.dice === 6 ? state.sixStreak + 1 : 0

    if (state.sixStreak === 3) {
      state.message = "Trois 6 d'affilée : le tour passe"
      await wait(950)
      nextTurn()
      return
    }

    const moves = movableTokens()
    if (moves.length === 0) {
      state.message = `Aucun déplacement possible avec un ${state.dice}`
      await wait(900)
      nextTurn()
      return
    }

    if (moves.length === 1) {
      await wait(280)
      await playToken(moves[0]!)
      return
    }

    state.awaitingChoice = true
    state.message = isBotTurn.value ? "L'ordinateur réfléchit" : 'Choisis un pion'

    if (isBotTurn.value) {
      await wait(550)
      await playToken(botPick(moves))
    }
  }

  function start() {
    scheduleBot()
  }

  return {
    state,
    current,
    isBotTurn,
    gameOver,
    canRoll,
    tokensOf,
    homeCount,
    isMovable,
    movableTokens,
    rollDice,
    playToken,
    start,
    isBot: (c: PlayerColor) => botSet.has(c),
  }
}

export type LudoGame = ReturnType<typeof createLudoGame>
