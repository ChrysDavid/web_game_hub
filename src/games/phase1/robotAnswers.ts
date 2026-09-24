import { DILEMMAS, HOBBIES, SILENCE_SCENES, SITUATIONS } from './content'
import { pickIndex, seeded, type AttachmentStyle, type Robot } from './robots'

/** Reponses des robots, tirees de leur personnalite (toujours les memes pour une question donnee). */

export function robotDilemmas(robot: Robot): ('a' | 'b')[] {
  return DILEMMAS.map((_, i) => (seeded(robot.seed * 100 + i)() < 0.5 ? 'a' : 'b'))
}

export function robotSilence(robot: Robot): AttachmentStyle[] {
  return SILENCE_SCENES.map((scene, i) => {
    const rng = seeded(robot.seed * 200 + i)
    // Le plus souvent fidele a son style, parfois une reaction differente (comme une vraie personne).
    if (rng() < 0.75) return robot.attachment
    return scene.options[pickIndex(rng, scene.options.length)]!.style
  })
}

export function robotHobbies(robot: Robot): string[] {
  return HOBBIES.filter((_, i) => seeded(robot.seed * 300 + i)() < 0.45).map((h) => h.id)
}

export function robotSituations(robot: Robot): string[] {
  return SITUATIONS.map((s, i) => s.options[pickIndex(seeded(robot.seed * 400 + i), s.options.length)]!.id)
}
