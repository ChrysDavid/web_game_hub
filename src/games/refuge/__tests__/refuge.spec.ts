import { describe, expect, it } from 'vitest'
import { canBuy, customerInterval, juicePrice } from '../economy'
import { HOUSE_SLOTS, countPlaced, nextSlot } from '../house'
import { huntReward, makeOrder, pickAnimal, saleResult } from '../missions'

const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('maison', () => {
  it('chaque materiau remplit sa propre rangee, dans l ordre', () => {
    const placed: number[] = []
    for (let i = 0; i < 5; i++) placed.push(nextSlot(placed, 'stone'))
    expect(countPlaced(placed, 'stone')).toBe(5)
    expect(nextSlot(placed, 'stone')).toBe(-1)
    expect(placed.every((i) => HOUSE_SLOTS[i]!.dy === 1)).toBe(true)
  })
})

describe('economie', () => {
  it('ameliorations du maquis', () => {
    expect(juicePrice(['premium'])).toBe(35)
    expect(customerInterval(['sign'])).toBeLessThan(customerInterval([]))
  })

  it('on ne peut acheter ni trop tot, ni sans argent, ni deux fois', () => {
    expect(canBuy('bridge', 999, [], 3)).toBe(false)
    expect(canBuy('roof', 100, [], 3)).toBe(false)
    expect(canBuy('roof', 300, ['roof'], 3)).toBe(false)
    expect(canBuy('roof', 300, [], 3)).toBe(true)
  })
})

describe('chasse', () => {
  it('mourir fait perdre la moitie de la viande', () => {
    expect(huntReward(9, false).meat).toBe(9)
    expect(huntReward(9, true).meat).toBe(4)
  })

  it('les dangers apparaissent', () => {
    expect(pickAnimal(0, seq(0.01, 0.1))).toBe('serpent')
    expect(pickAnimal(0, seq(0.99, 0.1))).toBe('antilope')
  })
})

describe('commerce', () => {
  it('une commande a un billet suffisant et une seule bonne monnaie', () => {
    for (let k = 0; k < 50; k++) {
      const o = makeOrder(Math.random)
      expect(o.bill).toBeGreaterThanOrEqual(o.total)
      expect(o.changeOptions).toContain(o.bill - o.total)
      expect(o.totalOptions).toContain(o.total)
    }
  })

  it('verifier paie : faux billet refuse = ok, accepte = perte', () => {
    const o = { ...makeOrder(Math.random), fake: 'couleur' as const }
    expect(saleResult(o, false, o.total, 0).ok).toBe(true)
    expect(saleResult(o, true, o.total, o.bill - o.total).coins).toBe(-o.total)
  })

  it('bonne vente, trop de monnaie, mauvais total', () => {
    const o = { ...makeOrder(Math.random), fake: null }
    expect(saleResult(o, true, o.total, o.bill - o.total).coins).toBe(o.total)
    expect(saleResult(o, true, o.total, o.bill - o.total + 25).coins).toBe(o.total - 25)
    expect(saleResult(o, true, o.total + 25, o.bill - o.total).ok).toBe(false)
  })
})
