import { reactive } from 'vue'

/**
 * Bruitages des jeux (des, pions, cartes). Sons du pack "Casino Audio" de Kenney (licence CC0,
 * usage commercial libre, voir public/sounds/LICENSE-kenney-casino-audio.txt), convertis en WAV
 * pour etre lus partout, y compris dans la WebView iOS.
 *
 * Web Audio plutot que <audio> : latence quasi nulle et plusieurs sons en meme temps (distribution).
 * Les navigateurs n'autorisent le son qu'apres un geste de la personne : `unlockSounds` est appele
 * au premier toucher (main.ts), et l'app Flutter autorise aussi la lecture sans geste dans sa WebView.
 */

export type SoundName =
  | 'diceShake'
  | 'diceThrow'
  | 'pawnStep'
  | 'pawnCapture'
  | 'pawnHome'
  | 'cardSlide'
  | 'cardPlace'
  | 'cardShuffle'
  | 'cardFan'
  | 'cardShove'
  | 'cardsTakeOut'

// Plusieurs variantes par son : on en tire une au hasard pour eviter l'effet "repetitif".
const FILES: Record<SoundName, string[]> = {
  diceShake: ['dice-shake-1'],
  diceThrow: ['dice-throw-1', 'dice-throw-2', 'dice-throw-3'],
  pawnStep: ['chip-lay-1', 'chip-lay-2', 'chip-lay-3'],
  pawnCapture: ['chips-collide-1'],
  pawnHome: ['chips-stack-1'],
  cardSlide: ['card-slide-1', 'card-slide-2', 'card-slide-3', 'card-slide-4'],
  cardPlace: ['card-place-1', 'card-place-2', 'card-place-3'],
  cardShuffle: ['card-shuffle'],
  cardFan: ['card-fan-1'],
  cardShove: ['card-shove-1'],
  cardsTakeOut: ['cards-pack-take-out-1'],
}

const MUTE_KEY = 'vidolove-games-muted'

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export const soundSettings = reactive({ muted: readMuted() })

let context: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
let loading: Promise<void> | null = null

function audioContext() {
  if (context) return context
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context = new Ctor()
  return context
}

function loadAll(ctx: AudioContext) {
  if (loading) return loading
  const names = [...new Set(Object.values(FILES).flat())]
  loading = Promise.all(
    names.map(async (name) => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}sounds/${name}.wav`)
        const data = await response.arrayBuffer()
        buffers.set(name, await ctx.decodeAudioData(data))
      } catch {
        // Un son manquant ne doit jamais empecher de jouer.
      }
    }),
  ).then(() => undefined)
  return loading
}

/** A appeler sur un geste de la personne : active l'audio et precharge tous les sons. */
export function unlockSounds() {
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  void loadAll(ctx)
}

export function playSound(name: SoundName, volume = 1) {
  if (soundSettings.muted) return
  const ctx = audioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  void loadAll(ctx)
  const variants = FILES[name]
  const buffer = buffers.get(variants[Math.floor(Math.random() * variants.length)]!)
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  // Hauteur legerement variable : deux cartes posees de suite ne sonnent pas pareil.
  source.playbackRate.value = 0.94 + Math.random() * 0.12
  const gain = ctx.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(ctx.destination)
  source.start()
}

export function toggleMute() {
  soundSettings.muted = !soundSettings.muted
  try {
    localStorage.setItem(MUTE_KEY, soundSettings.muted ? '1' : '0')
  } catch {
    // Stockage indisponible (navigation privee) : le choix vaut pour cette page seulement.
  }
  if (!soundSettings.muted) unlockSounds()
}
