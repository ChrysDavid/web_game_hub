import { onBeforeUnmount, reactive } from 'vue'
import { ROBOTS } from './robots'

/**
 * Fait "jouer" les robots en meme temps que la personne : chacun repond a chaque etape avec un
 * petit delai variable. On ne montre jamais leurs reponses pendant le jeu (anonymat), seulement
 * qu'ils ont repondu.
 */
export function useGroup() {
  const progress = reactive<Record<string, number>>(Object.fromEntries(ROBOTS.map((r) => [r.id, 0])))
  const timers: ReturnType<typeof setTimeout>[] = []

  function robotsReach(step: number, minMs = 500, maxMs = 2600) {
    for (const robot of ROBOTS) {
      const delay = minMs + Math.random() * (maxMs - minMs)
      timers.push(
        setTimeout(() => {
          progress[robot.id] = Math.max(progress[robot.id] ?? 0, step)
        }, delay),
      )
    }
  }

  function reset() {
    timers.splice(0).forEach(clearTimeout)
    for (const robot of ROBOTS) progress[robot.id] = 0
  }

  onBeforeUnmount(reset)

  return { progress, robotsReach, reset }
}
