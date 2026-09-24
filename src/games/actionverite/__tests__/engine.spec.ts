import { describe, expect, it } from 'vitest'
import { PROMPTS } from '../content'
import {
  GAGE_REFUSED_PENALTY,
  TURNS,
  complete,
  drawPrompt,
  gageRefused,
  isOver,
  levelForTurn,
  newGame,
  nextTurn,
  refuse,
  winner,
} from '../engine'

describe('Action ou Verite', () => {
  it('la temperature monte sans depasser le niveau choisi', () => {
    expect(levelForTurn(0, 'audacieux')).toBe('doux')
    expect(levelForTurn(5, 'audacieux')).toBe('complice')
    expect(levelForTurn(9, 'audacieux')).toBe('audacieux')
    expect(levelForTurn(9, 'doux')).toBe('doux')
  })

  it('une question tiree vient du bon paquet et ne revient pas tout de suite', () => {
    const game = newGame('amitie', 'doux')
    const first = drawPrompt(game, 'verite')
    expect(PROMPTS.amitie.verite.doux).toContain(first.text)
    const seen = new Set([first.text])
    for (let i = 1; i < PROMPTS.amitie.verite.doux.length; i++) seen.add(drawPrompt(game, 'verite').text)
    expect(seen.size).toBe(PROMPTS.amitie.verite.doux.length)
  })

  it('verite = 1 point, action = 2, "a deux" = points pour les deux', () => {
    const game = newGame('amour', 'doux')
    drawPrompt(game, 'action')
    complete(game)
    expect(game.scores.me).toBe(2)
    drawPrompt(game, 'verite', true)
    complete(game)
    expect(game.scores).toEqual({ me: 3, duo: 1 })
  })

  it('le joker evite le gage une seule fois, puis les gages sont de plus en plus corses', () => {
    const game = newGame('amour', 'doux')
    expect(refuse(game, true)).toBe(true)
    expect(game.gage).toBeNull()
    expect(refuse(game, true)).toBe(false)
    expect(game.gage?.tier).toBe(1)
    refuse(game, false)
    refuse(game, false)
    refuse(game, false)
    expect(game.gage?.tier).toBe(3)
  })

  it('refuser son gage coute des points', () => {
    const game = newGame('amour', 'doux')
    refuse(game, false)
    gageRefused(game)
    expect(game.scores.me).toBe(-GAGE_REFUSED_PENALTY)
  })

  it('les tours alternent et la partie finit apres le dernier tour', () => {
    const game = newGame('amour', 'doux')
    nextTurn(game)
    expect(game.current).toBe('duo')
    for (let i = 1; i < TURNS; i++) nextTurn(game)
    expect(isOver(game)).toBe(true)
    expect(winner(game)).toBe('egalite')
  })
})
