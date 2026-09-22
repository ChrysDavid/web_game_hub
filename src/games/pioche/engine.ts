import { reactive, computed } from 'vue'
import type { Card, PlayerId } from './constants'
import { buildDeck, shuffle, HAND_SIZE } from './constants'

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function createPiocheGame(players: PlayerId[], bots: PlayerId[]) {
  const botSet = new Set(bots)

  const state = reactive({
    players,
    hands: Object.fromEntries(players.map((p) => [p, [] as Card[]])) as Record<
      PlayerId,
      Card[]
    >,
    drawPile: [] as Card[],
    discardPile: [] as Card[],
    tableCard: null as Card | null,
    turnIndex: 0,
    message: '',
    winner: null as PlayerId | null,
    busy: false,
  })

  // Distribution
  const deck = shuffle(buildDeck())
  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of players) {
      state.hands[p].push(deck.shift()!)
    }
  }
  state.tableCard = deck.shift() ?? null
  state.drawPile = deck

  const current = computed(() => state.players[state.turnIndex])
  const isBotTurn = computed(() => botSet.has(current.value))
  const gameOver = computed(() => state.winner !== null)

  function matches(card: Card) {
    return state.tableCard != null && card.suit === state.tableCard.suit
  }

  function hasPlayable(p: PlayerId) {
    return state.hands[p].some(matches)
  }

  const needsDraw = computed(
    () => !gameOver.value && !state.busy && !isBotTurn.value && !hasPlayable(current.value),
  )

  const canPlay = computed(
    () => !gameOver.value && !state.busy && !isBotTurn.value && hasPlayable(current.value),
  )

  function isSelectable(p: PlayerId, card: Card) {
    return canPlay.value && p === current.value && matches(card)
  }

  function reshuffleIfNeeded() {
    if (state.drawPile.length > 0) return
    if (state.discardPile.length === 0) return
    state.drawPile = shuffle(state.discardPile.splice(0))
  }

  function nextTurn() {
    state.turnIndex = (state.turnIndex + 1) % state.players.length
  }

  function setTurnMessage() {
    state.message = isBotTurn.value ? "L'ordinateur réfléchit" : 'À toi de jouer'
  }

  async function playCard(p: PlayerId, card: Card) {
    if (gameOver.value || state.busy) return
    if (p !== current.value || !matches(card)) return

    state.busy = true
    const hand = state.hands[p]
    const idx = hand.indexOf(card)
    hand.splice(idx, 1)
    if (state.tableCard) state.discardPile.push(state.tableCard)
    state.tableCard = card
    state.message = ''
    await wait(280)

    if (hand.length === 0) {
      state.winner = p
      state.message = `${p} a gagné !`
      state.busy = false
      return
    }

    nextTurn()
    setTurnMessage()
    state.busy = false
    scheduleBot()
  }

  async function drawCard() {
    if (gameOver.value || state.busy) return
    if (isBotTurn.value) return
    if (hasPlayable(current.value)) return

    state.busy = true
    reshuffleIfNeeded()
    const p = current.value
    if (state.drawPile.length > 0) {
      state.hands[p].push(state.drawPile.shift()!)
    }
    await wait(260)
    nextTurn()
    setTurnMessage()
    state.busy = false
    scheduleBot()
  }

  function botPick(p: PlayerId): Card | null {
    const options = state.hands[p].filter(matches)
    if (options.length === 0) return null
    return options[Math.floor(Math.random() * options.length)]
  }

  async function scheduleBot() {
    if (gameOver.value || !isBotTurn.value) return
    await wait(650)
    if (gameOver.value || !isBotTurn.value) return

    const p = current.value
    const pick = botPick(p)
    if (pick) {
      await playCard(p, pick)
      return
    }

    state.busy = true
    reshuffleIfNeeded()
    if (state.drawPile.length > 0) {
      state.hands[p].push(state.drawPile.shift()!)
    }
    await wait(300)
    nextTurn()
    setTurnMessage()
    state.busy = false
    scheduleBot()
  }

  const ranking = computed<PlayerId[]>(() => {
    if (!state.winner) return []
    const others = state.players
      .filter((p) => p !== state.winner)
      .slice()
      .sort((a, b) => state.hands[a].length - state.hands[b].length)
    return [state.winner, ...others]
  })

  function start() {
    setTurnMessage()
    scheduleBot()
  }

  return {
    state,
    current,
    isBotTurn,
    gameOver,
    needsDraw,
    canPlay,
    ranking,
    isSelectable,
    isBot: (p: PlayerId) => botSet.has(p),
    playCard,
    drawCard,
    start,
  }
}

export type PiocheGame = ReturnType<typeof createPiocheGame>
