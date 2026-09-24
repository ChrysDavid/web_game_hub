import { describe, expect, it } from 'vitest'
import { conflictFromOffer, DILEMMAS, HOBBIES, SILENCE_SCENES, SITUATIONS } from '../content'
import { robotDilemmas, robotHobbies, robotSilence, robotSituations } from '../robotAnswers'
import { ROBOTS } from '../robots'
import {
  attachmentPair,
  commonInterests,
  conflictPair,
  dominantStyle,
  opennessPair,
  sameAnswers,
  stabilityPair,
  stabilityScore,
} from '../scoring'

describe('reponses identiques (Tu preferes, Et toi)', () => {
  it('compte la part de reponses identiques', () => {
    expect(sameAnswers(['a', 'b', 'a', 'b'], ['a', 'b', 'b', 'a'])).toBe(50)
    expect(sameAnswers(['a', 'a'], ['a', 'a'])).toBe(100)
  })

  it("une question sans reponse ne compte jamais comme un point commun", () => {
    expect(sameAnswers(['-', 'a'], ['a', 'a'])).toBe(50)
  })
})

describe('centres d interet (Association express)', () => {
  it('commun divise par tout ce qui a ete garde par l un ou l autre', () => {
    expect(commonInterests(['foot', 'danse'], ['foot', 'cuisine'])).toBe(33)
    expect(commonInterests([], [])).toBe(0)
  })
})

describe('attachement (Pas de reponse)', () => {
  it('le style dominant l emporte', () => {
    expect(dominantStyle(['anxieux', 'serein', 'anxieux'], ['serein', 'anxieux', 'distant'])).toBe('anxieux')
  })

  it('deux sereins au mieux, anxieux + distant au pire, dans les deux sens', () => {
    expect(attachmentPair('serein', 'serein')).toBe(100)
    expect(attachmentPair('anxieux', 'distant')).toBe(attachmentPair('distant', 'anxieux'))
    expect(attachmentPair('anxieux', 'distant')).toBeLessThan(attachmentPair('anxieux', 'anxieux'))
  })
})

describe('conflit (Le partage)', () => {
  it('classe la premiere proposition sur 12 mangues', () => {
    expect(conflictFromOffer(3)).toBe('ceder')
    expect(conflictFromOffer(6)).toBe('cooperer')
    expect(conflictFromOffer(9)).toBe('imposer')
  })

  it('deux qui cooperent s entendent le mieux, deux qui imposent le moins', () => {
    expect(conflictPair('cooperer', 'cooperer')).toBe(100)
    expect(conflictPair('imposer', 'imposer')).toBeLessThan(conflictPair('ceder', 'imposer'))
  })
})

describe('stabilite (Sous pression)', () => {
  it('calme et nouvel essai = haut ; rage et abandon = bas', () => {
    const calm = stabilityScore({ rageTaps: 0, quit: false, retried: true })
    const upset = stabilityScore({ rageTaps: 8, quit: true, retried: false })
    expect(calm).toBe(100)
    expect(upset).toBeLessThan(20)
  })

  it('deux personnes fragiles sont un peu penalisees', () => {
    expect(stabilityPair(40, 40)).toBeLessThan(40)
    expect(stabilityPair(80, 60)).toBe(70)
  })
})

describe('confiance (L escalier)', () => {
  it('aller aussi loin l un que l autre compte le plus', () => {
    expect(opennessPair(6, 6, 6)).toBe(100)
    expect(opennessPair(6, 0, 6)).toBeLessThan(opennessPair(3, 3, 6))
  })
})

describe('robots', () => {
  it('repondent a chaque question, toujours pareil', () => {
    for (const robot of ROBOTS) {
      expect(robotDilemmas(robot)).toHaveLength(DILEMMAS.length)
      expect(robotSilence(robot)).toHaveLength(SILENCE_SCENES.length)
      expect(robotSituations(robot)).toHaveLength(SITUATIONS.length)
      expect(robotHobbies(robot).every((id) => HOBBIES.some((h) => h.id === id))).toBe(true)
      expect(robotDilemmas(robot)).toEqual(robotDilemmas(robot))
    }
  })

  it('gardent surtout leur style d attachement', () => {
    for (const robot of ROBOTS) {
      expect(dominantStyle(robotSilence(robot), ['serein', 'anxieux', 'distant'])).toBe(robot.attachment)
    }
  })
})
