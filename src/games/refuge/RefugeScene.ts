import Phaser from 'phaser'
import { playSound } from '@/services/sound'
import {
  BAG_SIZE,
  FOOD_ENERGY,
  MANGO_ENERGY,
  MAX_ENERGY,
  PROVISIONS,
  STAND_COST_WOOD,
  WORK_ENERGY,
  WORLD_ITEMS,
  canBuy,
  customerInterval,
  juicePrice,
  pressTime,
  shopItem,
  type ProvisionId,
  type ShopId,
} from './economy'
import { HOUSE_SLOTS, NEEDED, countOf, countPlaced, nextSlot, type HouseMaterial } from './house'
import { CHAPTERS, PARTNER_LINES } from './story'
import { MISSION_ENERGY, partnerMissionResult, type Role } from './missions'

/**
 * "Notre Refuge" : un monde a construire a deux (phase 2). On mange, on ramasse, on commerce,
 * et l'argent fait grandir la maison puis le monde autour. Graphismes Kenney (CC0).
 * Sur le site, le partenaire est une IA ; dans l'app, ce sera la vraie personne du duo.
 */

export type ItemKind = 'wood' | 'stone' | 'mango'

export interface RefugeObjective {
  icon: string
  label: string
  done: number
  total: number
}

export interface RefugeHud {
  state: 'title' | 'letter' | 'play' | 'finished'
  chapter: number
  chapterTitle: string
  letter: { title: string; text: string } | null
  objectives: RefugeObjective[]
  hint: string
  toast: string
  coins: number
  earned: number
  energy: number
  bag: { kind: ItemKind; count: number } | null
  stand: { built: boolean; mangoes: number; juice: number }
  owned: ShopId[]
  shopOpen: boolean
}

type PlaceId = 'home' | 'stand' | 'market' | 'fire' | 'letter'

interface Resource {
  kind: ItemKind
  sprite: Phaser.GameObjects.Image
  ready: boolean
}

type Task = { type: 'resource'; res: Resource } | { type: 'place'; id: PlaceId } | null

interface Walker {
  body: Phaser.GameObjects.Container
  sprite: Phaser.GameObjects.Image
  bagIcon: Phaser.GameObjects.Image
  bagText: Phaser.GameObjects.Text
  bubble: Phaser.GameObjects.Text
  target: Phaser.Math.Vector2 | null
  task: Task
  busy: boolean
  bag: { kind: ItemKind; count: number } | null
}

// --- Monde ---------------------------------------------------------------------------------------

const TILE = 16
const SCALE = 3
const CELL = TILE * SCALE
const WORLD_W = CELL * 40
const WORLD_H = CELL * 28
const SPEED = 210
const RIVER_Y = CELL * 23.5
const MEADOW_Y = CELL * 25

const HOME = new Phaser.Math.Vector2(WORLD_W / 2, CELL * 12)
const STAND = new Phaser.Math.Vector2(WORLD_W / 2 + CELL * 5, CELL * 13.5)
const MARKET = new Phaser.Math.Vector2(WORLD_W / 2, CELL * 3.6)
const FIRE = new Phaser.Math.Vector2(WORLD_W / 2, CELL * 15.2)
const LETTER = new Phaser.Math.Vector2(WORLD_W / 2 + CELL * 4, CELL * 26.5)
const PLACE_POS: Record<PlaceId, Phaser.Math.Vector2> = {
  home: new Phaser.Math.Vector2(HOME.x, HOME.y + CELL * 2.3),
  stand: new Phaser.Math.Vector2(STAND.x - CELL * 1.2, STAND.y + CELL * 0.8),
  market: new Phaser.Math.Vector2(MARKET.x, MARKET.y + CELL * 1.6),
  fire: new Phaser.Math.Vector2(FIRE.x - CELL, FIRE.y + CELL * 0.6),
  letter: new Phaser.Math.Vector2(LETTER.x, LETTER.y + CELL * 0.5),
}

const T = {
  grass: [0, 0, 0, 0, 1, 1, 0, 2],
  dirt: 25,
  tree: [16, 28],
  pine: 4,
  mango: 27,
  stone: 43,
  log: 106,
  bush: 5,
  mushroom: 29,
  flower: 2,
  fence: 81,
  sign: 83,
  barrel: 130,
  crate: 57,
  well: 104,
  roofTop: [52, 53, 54],
  roofBottom: [64, 65, 66],
  wallWood: [72, 85, 75],
}
const PEOPLE = { player: 98, partner: 99, merchant: 84, villagers: [85, 86, 87, 88, 97, 100], torch: 29 }

export class RefugeScene extends Phaser.Scene {
  private hud!: RefugeHud
  private player!: Walker
  private partner!: Walker
  private resources: Resource[] = []
  private placed: number[] = []
  private houseSprites: Phaser.GameObjects.Image[] = []
  private standGroup: Phaser.GameObjects.GameObject[] = []
  private light!: Phaser.GameObjects.Rectangle
  private guide!: Phaser.GameObjects.Text
  private ring!: Phaser.GameObjects.Ellipse
  private toastTimer?: Phaser.Time.TimerEvent
  private customerTimer?: Phaser.Time.TimerEvent
  private pressTimer?: Phaser.Time.TimerEvent
  private ateMango = false
  private letterFound = false
  private coop = 0
  private fireLit = false
  private lamps: Phaser.GameObjects.GameObject[] = []
  private partnerTalk = 0

  constructor() {
    super('refuge')
  }

  init(data: { hud: RefugeHud }) {
    this.hud = data.hud
    this.resources = []
    this.placed = []
    this.houseSprites = []
    this.standGroup = []
    this.lamps = []
    this.ateMango = false
    this.letterFound = false
    this.coop = 0
    this.fireLit = false
    this.standWood = 0
    this.completing = false
  }

  preload() {
    this.load.spritesheet('town', '/games/refuge/town.png', { frameWidth: TILE, frameHeight: TILE })
    this.load.spritesheet('people', '/games/refuge/people.png', { frameWidth: TILE, frameHeight: TILE })
  }

  create() {
    this.drawWorld()
    this.drawHouseBlueprint()
    this.spawnResources()

    this.player = this.makeWalker(HOME.x - CELL, HOME.y + CELL * 3.5, PEOPLE.player)
    this.partner = this.makeWalker(HOME.x + CELL, HOME.y + CELL * 3.5, PEOPLE.partner)

    this.ring = this.add.ellipse(0, 0, 74, 30).setStrokeStyle(4, 0xffe08a).setDepth(3).setVisible(false)
    this.tweens.add({ targets: this.ring, scale: 1.18, alpha: 0.45, yoyo: true, repeat: -1, duration: 650 })
    this.guide = this.add
      .text(0, 0, '▼', { fontFamily: 'Arial', fontSize: '34px', color: '#ffe08a' })
      .setOrigin(0.5)
      .setStroke('#3a2414', 7)
      .setDepth(9400)
      .setVisible(false)

    // Lumiere du jour : claire, puis doree, puis nuit selon le chapitre.
    this.light = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x0b1030, 0).setOrigin(0).setDepth(9300)

    const cam = this.cameras.main
    cam.setBounds(0, 0, WORLD_W, WORLD_H)
    cam.startFollow(this.player.body, true, 0.12, 0.12)
    this.fitCamera()
    this.scale.on('resize', () => this.fitCamera())

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY))
    this.bindUi()

    Object.assign(this.hud, {
      state: 'title',
      chapter: 0,
      chapterTitle: '',
      letter: null,
      objectives: [],
      hint: '',
      toast: '',
      coins: 20,
      earned: 0,
      energy: 55,
      bag: null,
      stand: { built: false, mangoes: 0, juice: 0 },
      owned: [],
      shopOpen: false,
    } satisfies RefugeHud)

    // La faim monte doucement : on mange pour garder des forces.
    this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => {
        if (this.hud.state === 'play') this.hud.energy = Math.max(0, this.hud.energy - 1)
      },
    })
  }

  /** Zoom adapte a l'ecran : on voit ~11 cases sur un telephone, plus sur un grand ecran. */
  private fitCamera() {
    const { width, height } = this.scale.gameSize
    const zoom = Phaser.Math.Clamp(Math.min(width, height) / 560, 0.62, 1.25)
    this.cameras.main.setZoom(zoom)
  }

  private bindUi() {
    const on = (name: string, fn: (...args: never[]) => void) => {
      this.game.events.on(name, fn)
      this.events.once('shutdown', () => this.game.events.off(name, fn))
    }
    on('refuge:start', () => this.showLetter(1))
    on('refuge:letter-closed', () => this.startChapter())
    on('refuge:replay', () => this.scene.restart({ hud: this.hud }))
    on('refuge:goto', (id: PlaceId) => this.goTo(this.player, id))
    on('refuge:eat', () => this.eatMango())
    on('refuge:buy', (id: ShopId) => this.buy(id))
    on('refuge:provision', (id: ProvisionId) => this.provision(id))
    on('refuge:mission', (r: { role: Role; coins: number }) => this.missionReward(r))
  }

  // --- Dessin du monde ---------------------------------------------------------------------------

  private tile(x: number, y: number, frame: number, depth = y, sheet = 'town') {
    return this.add.image(x, y, sheet, frame).setScale(SCALE).setDepth(depth)
  }

  private drawWorld() {
    for (let y = CELL / 2; y < WORLD_H; y += CELL) {
      for (let x = CELL / 2; x < WORLD_W; x += CELL) {
        this.tile(x, y, y > MEADOW_Y ? T.flower : Phaser.Utils.Array.GetRandom(T.grass), -1000)
      }
    }
    // Chemins de terre : marche -> maison -> riviere, et vers la foret et la carriere.
    for (let y = MARKET.y + CELL; y < RIVER_Y; y += CELL) this.tile(HOME.x, y, T.dirt, -999)
    for (let x = CELL * 6; x < WORLD_W - CELL * 6; x += CELL) this.tile(x, HOME.y + CELL * 3, T.dirt, -999)
    // Riviere (eau animee) et berges.
    const river = this.add.rectangle(0, RIVER_Y, WORLD_W, CELL * 1.4, 0x3b8fd1).setOrigin(0, 0).setDepth(-998)
    this.tweens.add({ targets: river, fillColor: { from: 0x3b8fd1, to: 0x4aa3e0 }, yoyo: true, repeat: -1, duration: 1400 })
    for (let x = 0; x < WORLD_W; x += CELL * 2) {
      const wave = this.add.text(x + Phaser.Math.Between(0, 40), RIVER_Y + 18, '〰', { fontSize: '22px', color: '#d6f0ff' }).setDepth(-997)
      this.tweens.add({ targets: wave, x: wave.x + 30, yoyo: true, repeat: -1, duration: 1800 + Math.random() * 800 })
    }
    // Lisiere d'arbres au nord et village autour du marche.
    for (let x = CELL / 2; x < WORLD_W; x += CELL) this.tile(x, CELL * 0.6, Phaser.Utils.Array.GetRandom([T.pine, ...T.tree]))
    this.drawCottage(MARKET.x - CELL * 6, CELL * 3)
    this.drawCottage(MARKET.x + CELL * 6, CELL * 3)
    // Marche : etals, tonneaux, marchand.
    for (const dx of [-1, 0, 1]) this.tile(MARKET.x + dx * CELL, MARKET.y, T.crate)
    this.tile(MARKET.x - CELL * 2, MARKET.y, T.barrel)
    this.tile(MARKET.x + CELL * 2, MARKET.y, T.barrel)
    this.tile(MARKET.x, MARKET.y - CELL * 0.9, PEOPLE.merchant, MARKET.y - 1, 'people')
    this.label(MARKET.x, MARKET.y - CELL * 1.9, 'Marché 🛒')
    this.label(CELL * 5, CELL * 5.2, 'Forêt 🌳')
    this.label(WORLD_W - CELL * 5, CELL * 5.2, 'Carrière 🪨')
    this.label(CELL * 14, CELL * 18.6, 'Verger 🥭')
    // Decor.
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(CELL, WORLD_W - CELL)
      const y = Phaser.Math.Between(CELL * 2, RIVER_Y - CELL)
      if (Math.abs(x - HOME.x) < CELL * 7 && Math.abs(y - HOME.y) < CELL * 6) continue
      this.tile(x, y, Phaser.Utils.Array.GetRandom([T.bush, T.mushroom]))
    }
  }

  private drawCottage(x: number, y: number) {
    T.roofTop.forEach((f, i) => this.tile(x + (i - 1) * CELL, y - CELL, f, y + CELL))
    T.roofBottom.forEach((f, i) => this.tile(x + (i - 1) * CELL, y, f, y + CELL))
    T.wallWood.forEach((f, i) => this.tile(x + (i - 1) * CELL, y + CELL, f, y + CELL))
  }

  private label(x: number, y: number, text: string) {
    return this.add
      .text(x, y, text, { fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', color: '#fffdf5' })
      .setOrigin(0.5)
      .setStroke('#3a2414', 5)
      .setDepth(9200)
  }

  /** Plan de la maison en transparence : on voit ou ira chaque materiau. */
  private drawHouseBlueprint() {
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) this.tile(HOME.x + dx * CELL, HOME.y + dy * CELL, T.dirt, -999)
    this.houseSprites = HOUSE_SLOTS.map((slot) =>
      this.tile(HOME.x + slot.dx * CELL, HOME.y + slot.dy * CELL, slot.frame, HOME.y + CELL * 2 + (slot.material === 'door' || slot.material === 'windows' ? 1 : 0))
        .setAlpha(slot.material === 'door' || slot.material === 'windows' ? 0 : 0.2)
        .setTint(0xbfd8ff),
    )
    this.label(HOME.x, HOME.y - CELL * 3, 'Notre maison 🏠')
  }

  private spawnResources() {
    const rnd = new Phaser.Math.RandomDataGenerator(['refuge'])
    const add = (kind: ItemKind, x: number, y: number) => {
      const frame = kind === 'wood' ? rnd.pick(T.tree) : kind === 'stone' ? T.stone : T.mango
      const sprite = this.tile(x, y, frame)
      if (kind === 'stone') sprite.setScale(SCALE * 1.15)
      this.resources.push({ kind, sprite, ready: true })
    }
    for (let i = 0; i < 14; i++) add('wood', rnd.between(CELL, CELL * 11), rnd.between(CELL * 6, CELL * 20))
    for (let i = 0; i < 11; i++) add('stone', rnd.between(WORLD_W - CELL * 11, WORLD_W - CELL), rnd.between(CELL * 6, CELL * 20))
    for (let i = 0; i < 9; i++) add('mango', rnd.between(CELL * 11, CELL * 17), rnd.between(CELL * 19, CELL * 22.5))
  }

  // --- Personnages -------------------------------------------------------------------------------

  private makeWalker(x: number, y: number, frame: number): Walker {
    const shadow = this.add.ellipse(0, 22, 34, 12, 0x000000, 0.25)
    const sprite = this.add.image(0, 0, 'people', frame).setScale(SCALE)
    const bagIcon = this.add.image(-6, -40, 'town', T.log).setScale(2).setVisible(false)
    const bagText = this.add
      .text(12, -44, '', { fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#fff' })
      .setStroke('#3a2414', 4)
    const bubble = this.add
      .text(0, -78, '', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#1e1a1d',
        backgroundColor: '#fbf7f2',
        padding: { x: 8, y: 5 },
        wordWrap: { width: 200 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setVisible(false)
    const body = this.add.container(x, y, [shadow, sprite, bagIcon, bagText, bubble]).setDepth(y)
    return { body, sprite, bagIcon, bagText, bubble, target: null, task: null, busy: false, bag: null }
  }

  private say(w: Walker, text: string, ms = 3200) {
    w.bubble.setText(text).setVisible(true)
    this.time.delayedCall(ms, () => {
      if (w.bubble.text === text) w.bubble.setVisible(false)
    })
  }

  private partnerSays(lines: string[]) {
    if (this.time.now - this.partnerTalk < 6000) return
    this.partnerTalk = this.time.now
    this.say(this.partner, Phaser.Utils.Array.GetRandom(lines))
  }

  private setBag(w: Walker, bag: Walker['bag']) {
    w.bag = bag && bag.count > 0 ? bag : null
    w.bagIcon.setVisible(!!w.bag)
    w.bagText.setText(w.bag && w.bag.count > 1 ? `×${w.bag.count}` : '')
    if (w.bag) w.bagIcon.setFrame(w.bag.kind === 'wood' ? T.log : w.bag.kind === 'stone' ? T.stone : T.mango)
    if (w === this.player) this.hud.bag = w.bag ? { ...w.bag } : null
  }

  private goTo(w: Walker, id: PlaceId) {
    if (this.hud.state !== 'play' || w.busy) return
    w.task = { type: 'place', id }
    w.target = PLACE_POS[id].clone()
  }

  // --- Entrees -----------------------------------------------------------------------------------

  private onTap(x: number, y: number) {
    if (this.hud.state !== 'play' || this.hud.shopOpen || this.player.busy) return
    const res = this.resources.find((r) => r.ready && Phaser.Math.Distance.Between(x, y, r.sprite.x, r.sprite.y) < 42)
    if (res) {
      this.player.task = { type: 'resource', res }
      this.player.target = new Phaser.Math.Vector2(res.sprite.x, res.sprite.y + 30)
      return
    }
    const place = (Object.keys(PLACE_POS) as PlaceId[]).find((id) => {
      const center = id === 'home' ? HOME : id === 'stand' ? STAND : id === 'market' ? MARKET : id === 'fire' ? FIRE : LETTER
      return Math.abs(x - center.x) < CELL * 2.6 && Math.abs(y - center.y) < CELL * 2.4
    })
    if (place) return this.goTo(this.player, place)
    this.player.task = null
    this.player.target = new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 20, WORLD_W - 20), this.clampY(y))
  }

  /** La prairie n'est accessible qu'une fois le pont construit. */
  private clampY(y: number) {
    const max = this.hud.owned.includes('bridge') ? WORLD_H - 30 : RIVER_Y - 20
    return Phaser.Math.Clamp(y, CELL * 1.6, max)
  }

  // --- Actions -----------------------------------------------------------------------------------

  private gather(w: Walker, res: Resource) {
    if (!res.ready) return
    if (w.bag && (w.bag.kind !== res.kind || w.bag.count >= BAG_SIZE)) {
      if (w === this.player) this.toast(w.bag.kind !== res.kind ? 'Dépose d’abord ce que tu portes.' : 'Ton sac est plein !')
      return
    }
    if (w === this.player && this.hud.energy < WORK_ENERGY) {
      this.toast('Tu es épuisé… Mange quelque chose 🍛')
      return
    }
    w.busy = true
    playSound('pawnStep')
    this.tweens.add({ targets: res.sprite, angle: { from: -8, to: 8 }, yoyo: true, repeat: 2, duration: 100 })
    this.time.delayedCall(520, () => {
      w.busy = false
      if (!res.ready) return
      res.ready = false
      res.sprite.setAlpha(0.3)
      this.time.delayedCall(res.kind === 'mango' ? 14000 : 22000, () => {
        res.ready = true
        this.tweens.add({ targets: res.sprite, alpha: 1, duration: 600 })
      })
      if (w === this.player) this.hud.energy = Math.max(0, this.hud.energy - WORK_ENERGY)
      this.setBag(w, { kind: res.kind, count: (w.bag?.count ?? 0) + 1 })
      this.float(res.sprite.x, res.sprite.y, res.kind === 'wood' ? '+1 🪵' : res.kind === 'stone' ? '+1 🪨' : '+1 🥭')
      this.refreshQuest()
    })
  }

  private eatMango() {
    const w = this.player
    if (w.bag?.kind !== 'mango') return
    this.setBag(w, { kind: 'mango', count: w.bag.count - 1 })
    this.hud.energy = Math.min(MAX_ENERGY, this.hud.energy + MANGO_ENERGY)
    this.ateMango = true
    playSound('cardSlide')
    this.float(w.body.x, w.body.y - 20, '😋 +20')
    this.refreshQuest()
  }

  private arriveAt(w: Walker, id: PlaceId) {
    if (id === 'home') this.depositHome(w)
    if (id === 'stand') this.useStand(w)
    if (id === 'market' && w === this.player) this.hud.shopOpen = true
    if (id === 'letter' && w === this.player && this.hud.chapter === 4 && this.hud.owned.includes('bridge')) {
      this.letterFound = true
      this.toast('Tu as trouvé le banc de Mama… et un mot : « Soyez heureux ». 💌')
      this.refreshQuest()
    }
  }

  private depositHome(w: Walker) {
    const bag = w.bag
    if (!bag || bag.kind === 'mango') {
      if (w === this.player && this.hud.chapter <= 2) this.toast('Apporte des pierres 🪨 ou du bois 🪵 pour construire.')
      return
    }
    const material: HouseMaterial = bag.kind
    let left = bag.count
    let delay = 0
    while (left > 0 && nextSlot(this.placed, material) >= 0) {
      const index = nextSlot(this.placed, material)
      this.placed.push(index)
      left--
      this.time.delayedCall(delay, () => this.revealSlot(index))
      delay += 280
    }
    if (left === bag.count) {
      if (w === this.player) this.toast(material === 'stone' ? 'Le mur de pierre est complet.' : 'L’étage en bois est complet.')
      return
    }
    this.setBag(w, { kind: bag.kind, count: left })
    this.partnerSays(PARTNER_LINES[material])
    this.time.delayedCall(delay, () => this.refreshQuest())
  }

  /** Une case du plan devient reelle : on voit a quoi a servi le materiau. */
  private revealSlot(index: number) {
    const sprite = this.houseSprites[index]!
    sprite.clearTint().setAlpha(1)
    this.tweens.add({ targets: sprite, scale: { from: SCALE * 1.4, to: SCALE }, duration: 260, ease: 'Back.out' })
    playSound('cardPlace', 0.7)
    for (let i = 0; i < 5; i++) {
      const dust = this.add.circle(sprite.x + Phaser.Math.Between(-20, 20), sprite.y + 20, 5, 0xe8d8b8, 0.8).setDepth(9000)
      this.tweens.add({ targets: dust, y: dust.y - 20, alpha: 0, scale: 2, duration: 500, onComplete: () => dust.destroy() })
    }
  }

  private placeAll(material: HouseMaterial) {
    let delay = 0
    let index = nextSlot(this.placed, material)
    while (index >= 0) {
      const i = index
      this.placed.push(i)
      this.time.delayedCall(delay, () => this.revealSlot(i))
      delay += 220
      index = nextSlot(this.placed, material)
    }
  }

  private useStand(w: Walker) {
    if (this.hud.chapter < 3) return
    const stand = this.hud.stand
    if (!stand.built) {
      if (w.bag?.kind !== 'wood') {
        if (w === this.player) this.toast(`Il faut ${STAND_COST_WOOD} bois 🪵 pour monter le stand.`)
        return
      }
      const give = Math.min(w.bag.count, STAND_COST_WOOD - this.standWood)
      this.standWood += give
      this.setBag(w, { kind: 'wood', count: w.bag.count - give })
      this.float(STAND.x, STAND.y, `🪵 ${this.standWood}/${STAND_COST_WOOD}`)
      if (this.standWood >= STAND_COST_WOOD) this.buildStand()
      this.refreshQuest()
      return
    }
    if (w.bag?.kind === 'mango') {
      stand.mangoes += w.bag.count
      this.float(STAND.x, STAND.y, `+${w.bag.count} 🥭`)
      this.setBag(w, null)
      playSound('cardSlide')
    } else if (w === this.player) {
      this.toast(`Stand : ${stand.mangoes} 🥭 en attente, ${stand.juice} 🧃 prêts. Apporte des mangues !`)
    }
  }

  private standWood = 0

  private buildStand() {
    this.hud.stand.built = true
    this.standGroup.forEach((o) => o.destroy())
    this.standGroup = [
      this.tile(STAND.x - CELL * 0.5, STAND.y, T.crate),
      this.tile(STAND.x + CELL * 0.5, STAND.y, T.crate),
      this.tile(STAND.x + CELL * 1.4, STAND.y, T.barrel),
      this.label(STAND.x, STAND.y - CELL * 1.1, 'Maquis 🧃'),
    ]
    playSound('pawnHome')
    this.toast('Votre maquis est ouvert ! Apportez des mangues 🥭, les clients arrivent.')
    this.say(this.partner, 'Notre premier commerce… Je m’occupe des mangues avec toi !')
    this.scheduleCustomers()
    this.schedulePress()
  }

  private schedulePress() {
    this.pressTimer?.remove()
    this.pressTimer = this.time.addEvent({
      delay: pressTime(this.hud.owned),
      loop: true,
      callback: () => {
        const stand = this.hud.stand
        if (stand.mangoes > 0 && stand.juice < 12) {
          stand.mangoes--
          stand.juice++
        }
      },
    })
  }

  private scheduleCustomers() {
    this.customerTimer?.remove()
    this.customerTimer = this.time.addEvent({
      delay: customerInterval(this.hud.owned),
      loop: true,
      callback: () => this.spawnCustomer(),
    })
  }

  /** Un villageois vient du marche, achete un jus s'il y en a, et repart content (ou pas). */
  private spawnCustomer() {
    if (this.hud.state !== 'play') return
    const npc = this.add
      .image(MARKET.x + Phaser.Math.Between(-40, 40), MARKET.y + CELL * 2, 'people', Phaser.Utils.Array.GetRandom(PEOPLE.villagers))
      .setScale(SCALE)
    const spot = { x: STAND.x + Phaser.Math.Between(-10, 30), y: STAND.y + CELL * 1.1 }
    const walk = (x: number, y: number, done: () => void) => {
      const d = Phaser.Math.Distance.Between(npc.x, npc.y, x, y)
      this.tweens.add({
        targets: npc,
        x,
        y,
        duration: (d / 110) * 1000,
        onUpdate: () => npc.setDepth(npc.y).setAngle(Math.sin(this.time.now / 80) * 5),
        onComplete: done,
      })
    }
    walk(HOME.x + CELL * 2.6, HOME.y + CELL * 3, () =>
      walk(spot.x, spot.y, () => {
        npc.setAngle(0)
        const stand = this.hud.stand
        if (stand.juice > 0) {
          stand.juice--
          const price = juicePrice(this.hud.owned)
          this.hud.coins += price
          this.hud.earned += price
          playSound('pawnCapture', 0.5)
          this.float(npc.x, npc.y - 30, `+${price} F 😊`)
          if (Math.random() < 0.3) this.partnerSays(PARTNER_LINES.sale)
        } else {
          this.float(npc.x, npc.y - 30, '😕')
          this.partnerSays(PARTNER_LINES.noJuice)
        }
        this.refreshQuest()
        this.time.delayedCall(700, () => walk(MARKET.x, MARKET.y + CELL * 2, () => npc.destroy()))
      }),
    )
  }

  // --- Boutique ----------------------------------------------------------------------------------

  private buy(id: ShopId) {
    if (!canBuy(id, this.hud.coins, this.hud.owned, this.hud.chapter)) return
    this.hud.coins -= shopItem(id).price
    this.hud.owned.push(id)
    playSound('pawnHome', 0.8)
    this.hud.shopOpen = false
    if (id === 'roof' || id === 'door' || id === 'windows') {
      this.cameras.main.pan(HOME.x, HOME.y, 600)
      this.time.delayedCall(700, () => this.placeAll(id))
      this.time.delayedCall(2000, () => this.cameras.main.startFollow(this.player.body, true, 0.12, 0.12))
    }
    if (id === 'press') this.schedulePress()
    if (id === 'sign') {
      this.scheduleCustomers()
      this.standGroup.push(this.tile(STAND.x - CELL * 1.5, STAND.y, T.sign))
    }
    if (WORLD_ITEMS.includes(id)) this.buildWorld(id)
    this.refreshQuest()
  }

  private buildWorld(id: ShopId) {
    this.partnerSays(PARTNER_LINES.upgrade)
    if (id === 'bridge') {
      const bridge = this.add.rectangle(HOME.x, RIVER_Y + CELL * 0.7, CELL * 2, CELL * 1.8, 0x9c6b3e).setDepth(-996)
      bridge.setStrokeStyle(4, 0x5c3a1e)
      for (const dy of [-0.9, 0.9]) this.tile(HOME.x, RIVER_Y + CELL * (0.7 + dy), T.fence, RIVER_Y + CELL * 2)
      for (let y = MEADOW_Y; y < WORLD_H; y += CELL) this.tile(HOME.x, y, T.dirt, -999)
      this.tile(LETTER.x, LETTER.y, T.crate)
      this.label(LETTER.x, LETTER.y - CELL, 'Le banc de Mama 💌')
      this.toast('Le pont est construit ! Va voir la prairie de Mama, au sud.')
    }
    if (id === 'lamps') {
      for (let y = MARKET.y + CELL * 3; y < RIVER_Y; y += CELL * 3) {
        for (const dx of [-1, 1]) {
          this.tile(HOME.x + dx * CELL, y, PEOPLE.torch, y, 'people')
          const glow = this.add.circle(HOME.x + dx * CELL, y, 70, 0xffc76b, 0).setDepth(9350).setBlendMode(Phaser.BlendModes.ADD)
          this.lamps.push(glow)
        }
      }
      this.updateLight()
    }
    if (id === 'well') this.tile(HOME.x - CELL * 4, HOME.y + CELL, T.well)
    if (id === 'garden') {
      for (const [dx, dy] of [[-3, 2], [-3, 1], [3, 1], [3, 2], [-2, 3], [2, 3]]) this.tile(HOME.x + dx! * CELL, HOME.y + dy! * CELL, T.flower, -998)
    }
  }

  private provision(id: ProvisionId) {
    const item = PROVISIONS.find((p) => p.id === id)!
    const w = this.player
    if (id === 'sell-mangoes') {
      if (w.bag?.kind !== 'mango') return this.toast('Tu n’as pas de mangues à vendre.')
      const gain = w.bag.count * item.price
      this.hud.coins += gain
      this.hud.earned += gain
      this.setBag(w, null)
      playSound('pawnCapture', 0.6)
      return this.toast(`+${gain} F. Le marchand te remercie !`)
    }
    if (this.hud.coins < item.price) return this.toast('Pas assez d’argent…')
    if (id === 'food') {
      this.hud.coins -= item.price
      this.hud.energy = Math.min(MAX_ENERGY, this.hud.energy + FOOD_ENERGY)
      return this.toast('Miam, un bon garba ! 😋 +40 d’énergie')
    }
    if (w.bag && (w.bag.kind !== id || w.bag.count >= BAG_SIZE)) return this.toast('Ton sac est déjà occupé ou plein.')
    this.hud.coins -= item.price
    this.setBag(w, { kind: id as ItemKind, count: (w.bag?.count ?? 0) + 1 })
    this.refreshQuest()
  }

  /** Fin d'une mission a risque : ton gain, plus celui du partenaire (l'autre role, en meme temps). */
  private missionReward(r: { role: Role; coins: number }) {
    const other: Role = r.role === 'chasse' ? 'commerce' : 'chasse'
    const partner = partnerMissionResult(other, Math.random)
    const total = r.coins + Math.max(0, partner.coins)
    this.hud.energy = Math.max(0, this.hud.energy - MISSION_ENERGY)
    this.hud.coins += total
    this.hud.earned += total
    playSound('pawnHome', 0.8)
    this.toast(`Toi : +${r.coins} F. Ton partenaire ${partner.text} (+${Math.max(0, partner.coins)} F).`)
    this.say(this.partner, total > 250 ? 'Quelle équipe on fait ! 💪' : 'On fera mieux la prochaine fois, ensemble.')
    this.refreshQuest()
  }

  // --- Chapitres ---------------------------------------------------------------------------------

  private showLetter(chapter: number) {
    const c = CHAPTERS[chapter - 1]!
    this.hud.chapter = chapter
    this.hud.chapterTitle = c.title
    this.hud.letter = c.letter
    this.hud.state = 'letter'
  }

  private startChapter() {
    this.hud.letter = null
    this.hud.state = 'play'
    const c = CHAPTERS[this.hud.chapter - 1]!
    this.say(this.partner, c.partnerStart, 4500)
    this.coop = 0
    this.updateLight()
    this.refreshQuest()
  }

  /** Lumiere selon le chapitre : jour, fin d'apres-midi doree, puis nuit. */
  private updateLight() {
    const ch = this.hud.chapter
    const [color, alpha] = ch >= 5 ? [0x0b1030, 0.55] : ch === 4 ? [0x7a3a10, 0.14] : [0x000000, 0]
    this.light.fillColor = color
    this.tweens.add({ targets: this.light, fillAlpha: alpha, duration: 2500 })
    for (const lamp of this.lamps) this.tweens.add({ targets: lamp, fillAlpha: ch >= 5 ? 0.3 : 0.08, duration: 2500 })
  }

  private refreshQuest() {
    const ch = this.hud.chapter
    const owned = this.hud.owned
    let objectives: RefugeObjective[] = []
    if (ch === 1) {
      objectives = [
        { icon: '🥭', label: 'Manger une mangue (verger au sud)', done: this.ateMango ? 1 : 0, total: 1 },
        { icon: '🪨', label: 'Poser le mur de pierre', done: countPlaced(this.placed, 'stone'), total: NEEDED.stone },
      ]
    } else if (ch === 2) {
      objectives = [{ icon: '🪵', label: 'Construire l’étage en bois', done: countPlaced(this.placed, 'wood'), total: NEEDED.wood }]
    } else if (ch === 3) {
      objectives = [
        { icon: '🧃', label: `Monter le maquis (${STAND_COST_WOOD} bois)`, done: this.hud.stand.built ? 1 : 0, total: 1 },
        { icon: '🏠', label: 'Acheter toit, porte, fenêtres', done: ['roof', 'door', 'windows'].filter((i) => owned.includes(i as ShopId)).length, total: 3 },
      ]
    } else if (ch === 4) {
      objectives = [
        { icon: '🌉', label: 'Construire le pont', done: owned.includes('bridge') ? 1 : 0, total: 1 },
        { icon: '✨', label: 'Embellir le monde (lampadaires, puits, jardin)', done: Math.min(2, ['lamps', 'well', 'garden'].filter((i) => owned.includes(i as ShopId)).length), total: 2 },
        { icon: '💌', label: 'Trouver le banc de Mama', done: this.letterFound ? 1 : 0, total: 1 },
      ]
    } else if (ch === 5) {
      objectives = [{ icon: '🔥', label: 'Allumer le feu à deux', done: Math.floor(this.coop * 100), total: 100 }]
    }
    this.hud.objectives = objectives
    const complete = objectives.length > 0 && objectives.every((o) => o.done >= o.total)
    if (complete && this.hud.state === 'play') this.chapterComplete()
  }

  private completing = false

  private chapterComplete() {
    if (this.completing) return
    this.completing = true
    playSound('pawnHome')
    this.hearts(this.player.body.x, this.player.body.y)
    this.toast(this.hud.chapter >= CHAPTERS.length ? 'Votre refuge est complet ❤️' : 'Chapitre terminé ! 🎉')
    this.time.delayedCall(2600, () => {
      this.completing = false
      if (this.hud.chapter >= CHAPTERS.length) {
        this.hud.state = 'finished'
        return
      }
      this.showLetter(this.hud.chapter + 1)
    })
  }

  // --- Effets ------------------------------------------------------------------------------------

  private toast(text: string) {
    this.hud.toast = text
    this.toastTimer?.remove()
    this.toastTimer = this.time.delayedCall(3000, () => (this.hud.toast = ''))
  }

  private float(x: number, y: number, text: string) {
    const t = this.add
      .text(x, y - 20, text, { fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5)
      .setStroke('#3a2414', 5)
      .setDepth(9800)
    this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 1100, onComplete: () => t.destroy() })
  }

  private hearts(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const h = this.add.text(x + Phaser.Math.Between(-70, 70), y, '❤️', { fontSize: '24px' }).setOrigin(0.5).setDepth(9900)
      this.tweens.add({
        targets: h,
        y: y - Phaser.Math.Between(80, 180),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1500),
        delay: i * 50,
        onComplete: () => h.destroy(),
      })
    }
  }

  // --- IA du partenaire --------------------------------------------------------------------------

  private partnerThink() {
    const w = this.partner
    if (w.busy || w.task || w.target) return
    const ch = this.hud.chapter
    if (ch === 5) {
      if (Phaser.Math.Distance.Between(w.body.x, w.body.y, FIRE.x + CELL, FIRE.y) > 40) {
        w.target = new Phaser.Math.Vector2(FIRE.x + CELL, FIRE.y + CELL * 0.6)
      }
      return
    }
    // Ce qu'il faut apporter, et ou.
    let want: ItemKind | null = null
    let dropAt: PlaceId = 'home'
    if (ch === 1 && nextSlot(this.placed, 'stone') >= 0) want = 'stone'
    else if (ch === 2 && nextSlot(this.placed, 'wood') >= 0) want = 'wood'
    else if (ch >= 3 && !this.hud.stand.built) {
      want = 'wood'
      dropAt = 'stand'
    } else if (ch >= 3) {
      want = 'mango'
      dropAt = 'stand'
    }
    if (!want) return
    if (w.bag && (w.bag.kind !== want || w.bag.count >= (want === 'mango' ? 3 : 2))) {
      this.goTo(w, dropAt)
      return
    }
    const res = this.resources
      .filter((r) => r.ready && r.kind === want)
      .sort(
        (a, b) =>
          Phaser.Math.Distance.Between(w.body.x, w.body.y, a.sprite.x, a.sprite.y) -
          Phaser.Math.Distance.Between(w.body.x, w.body.y, b.sprite.x, b.sprite.y),
      )[0]
    if (res) {
      w.task = { type: 'resource', res }
      w.target = new Phaser.Math.Vector2(res.sprite.x + 26, res.sprite.y + 30)
    } else if (w.bag) {
      this.goTo(w, dropAt)
    }
  }

  // --- Boucle ------------------------------------------------------------------------------------

  private step(w: Walker, delta: number) {
    if (!w.target || w.busy) return false
    const pos = new Phaser.Math.Vector2(w.body.x, w.body.y)
    const d = pos.distance(w.target)
    if (d < 6) {
      w.target = null
      w.sprite.setAngle(0)
      return true
    }
    // Epuise : on avance a petits pas.
    const speed = w === this.player && this.hud.energy < 15 ? SPEED * 0.5 : SPEED
    const move = Math.min(d, (speed * delta) / 1000)
    const dir = w.target.clone().subtract(pos).normalize()
    w.body.x += dir.x * move
    w.body.y = Phaser.Math.Clamp(w.body.y + dir.y * move, CELL * 1.6, this.clampY(WORLD_H))
    w.body.setDepth(w.body.y)
    if (Math.abs(dir.x) > 0.1) w.sprite.setFlipX(dir.x < 0)
    w.sprite.setAngle(Math.sin(this.time.now / 70) * 6)
    return false
  }

  update(_t: number, delta: number) {
    if (this.hud.state !== 'play') return
    for (const w of [this.player, this.partner]) {
      if (this.step(w, delta) && w.task) {
        const task = w.task
        w.task = null
        if (task.type === 'resource') this.gather(w, task.res)
        else this.arriveAt(w, task.id)
      }
    }
    this.partnerThink()
    this.updateFire(delta)
    this.updateGuide()
  }

  private updateFire(delta: number) {
    if (this.hud.chapter !== 5 || this.fireLit) return
    const near = (w: Walker) => Phaser.Math.Distance.Between(w.body.x, w.body.y, FIRE.x, FIRE.y) < CELL * 2.2
    if (!near(this.player) || !near(this.partner)) return
    const before = Math.floor(this.coop * 100)
    this.coop = Math.min(1, this.coop + delta / 4000)
    if (Math.floor(this.coop * 100) !== before) this.refreshQuest()
    if (this.coop >= 1) {
      this.fireLit = true
      this.tile(FIRE.x - 8, FIRE.y, T.log).setAngle(-25)
      this.tile(FIRE.x + 8, FIRE.y, T.log).setAngle(25)
      const flame = this.add.text(FIRE.x, FIRE.y - 26, '🔥', { fontSize: '42px' }).setOrigin(0.5).setDepth(FIRE.y + 1)
      this.tweens.add({ targets: flame, scaleY: 1.15, yoyo: true, repeat: -1, duration: 260 })
      const glow = this.add.circle(FIRE.x, FIRE.y, 170, 0xffb45a, 0.35).setDepth(9350).setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({ targets: glow, scale: 1.1, yoyo: true, repeat: -1, duration: 700 })
      this.say(this.partner, 'Merci d’avoir construit tout ça avec moi… ❤️', 6000)
      this.refreshQuest()
    }
  }

  /** Ou aller maintenant : fleche au-dessus de la cible, ou au bord de l'ecran si elle est loin. */
  private updateGuide() {
    const target = this.currentTarget()
    if (!target) {
      this.guide.setVisible(false)
      this.ring.setVisible(false)
      return
    }
    const view = this.cameras.main.worldView
    const margin = 40 / this.cameras.main.zoom
    const inView = view.contains(target.x, target.y)
    this.ring.setPosition(target.x, target.y + 24).setVisible(inView)
    if (inView) {
      this.guide.setText('▼').setAngle(0).setPosition(target.x, target.y - 56 + Math.sin(this.time.now / 160) * 6)
    } else {
      const x = Phaser.Math.Clamp(target.x, view.x + margin, view.right - margin)
      const y = Phaser.Math.Clamp(target.y, view.y + margin, view.bottom - margin)
      const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x, y, target.x, target.y)) - 90
      this.guide.setText('▼').setPosition(x, y).setAngle(angle)
    }
    this.guide.setVisible(true)
  }

  private nearest(kind: ItemKind) {
    const p = this.player.body
    return this.resources
      .filter((r) => r.ready && r.kind === kind)
      .sort((a, b) => Phaser.Math.Distance.Between(p.x, p.y, a.sprite.x, a.sprite.y) - Phaser.Math.Distance.Between(p.x, p.y, b.sprite.x, b.sprite.y))[0]
      ?.sprite ?? null
  }

  private currentTarget(): { x: number; y: number } | null {
    const ch = this.hud.chapter
    const bag = this.player.bag
    const hint = (text: string) => (this.hud.hint = text)
    if (this.hud.energy < 20) {
      hint('Tu as faim : mange une mangue 🥭 ou achète un garba au marché.')
      if (bag?.kind === 'mango') return null
      return this.nearest('mango')
    }
    if (ch === 1 && !this.ateMango) {
      hint(bag?.kind === 'mango' ? 'Touche « Manger » en bas de l’écran.' : 'Cueille une mangue au verger, au sud.')
      return bag?.kind === 'mango' ? null : this.nearest('mango')
    }
    if (ch === 1 || ch === 2) {
      const kind = ch === 1 ? 'stone' : 'wood'
      if (bag?.kind === kind) {
        hint(bag.count >= BAG_SIZE ? 'Sac plein : apporte tout à la maison.' : 'Ramasses-en encore, ou apporte-les à la maison.')
        return bag.count >= BAG_SIZE ? PLACE_POS.home : this.nearest(kind)
      }
      hint(ch === 1 ? 'Va à la carrière (est) chercher des pierres 🪨.' : 'Va à la forêt (ouest) couper du bois 🪵.')
      return this.nearest(kind)
    }
    if (ch === 3) {
      if (!this.hud.stand.built) {
        hint(`Apporte ${STAND_COST_WOOD} bois 🪵 au stand, à droite de la maison.`)
        return bag?.kind === 'wood' ? PLACE_POS.stand : this.nearest('wood')
      }
      const missing = (['roof', 'door', 'windows'] as ShopId[]).find((i) => !this.hud.owned.includes(i))
      if (missing && this.hud.coins >= shopItem(missing).price) {
        hint(`Tu as assez pour : ${shopItem(missing).label}. Va au marché 🛒 !`)
        return PLACE_POS.market
      }
      hint('Cueille des mangues 🥭 et apporte-les au maquis : les clients paient le jus.')
      return bag?.kind === 'mango' && bag.count >= 2 ? PLACE_POS.stand : this.nearest('mango')
    }
    if (ch === 4) {
      if (!this.hud.owned.includes('bridge')) {
        hint(this.hud.coins >= shopItem('bridge').price ? 'Achète le pont au marché 🛒.' : 'Continue ton commerce pour payer le pont (250 F).')
        return this.hud.coins >= shopItem('bridge').price ? PLACE_POS.market : bag?.kind === 'mango' ? PLACE_POS.stand : this.nearest('mango')
      }
      if (!this.letterFound) {
        hint('Traverse le pont : le banc de Mama t’attend dans la prairie.')
        return PLACE_POS.letter
      }
      hint('Embellis le monde : lampadaires, puits ou jardin, au marché.')
      return this.hud.coins >= 100 ? PLACE_POS.market : this.nearest('mango')
    }
    if (ch === 5) {
      hint('Rejoins ton partenaire devant le feu.')
      return this.fireLit ? null : FIRE
    }
    return null
  }
}
