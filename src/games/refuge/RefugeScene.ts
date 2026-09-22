import Phaser from 'phaser'

export type ResourceType = 'wood' | 'stone'

interface ResourceNode {
  type: ResourceType
  sprite: Phaser.GameObjects.Image
}

/** Etat partage avec l'interface Vue (HUD), mute directement par la scene. */
export interface RefugeHud {
  wood: number
  stone: number
  buildProgress: number // 0..1
  buildRequired: { wood: number; stone: number }
  message: string
  phase: 'gather' | 'build' | 'done'
}

interface RefugeSceneData {
  hud: RefugeHud
}

const WORLD_W = 960
const WORLD_H = 640
const SPEED = 170
const BUILD_REQUIRED = { wood: 6, stone: 4 }

/**
 * Chapitre 1 : "L'Arrivee".
 * Le joueur controle son personnage au tap/clic. Le partenaire est pilote
 * par une petite IA locale (meme esprit que le bot du Ludo) : elle choisit
 * une ressource libre, va la chercher, la depose au chantier, puis rejoint
 * le joueur pour lever le mur ensemble.
 */
export class RefugeScene extends Phaser.Scene {
  private hud!: RefugeHud

  private player!: Phaser.GameObjects.Image
  private partner!: Phaser.GameObjects.Image

  private playerTarget: Phaser.Math.Vector2 | null = null
  private playerTargetNode: ResourceNode | null = null
  private partnerTarget: Phaser.Math.Vector2 | null = null

  private resources: ResourceNode[] = []
  private buildSite!: Phaser.GameObjects.Image
  private buildSitePos = new Phaser.Math.Vector2(WORLD_W / 2, WORLD_H / 2 - 30)

  private carrying: { player: ResourceType | null; partner: ResourceType | null } = {
    player: null,
    partner: null,
  }

  private aiState: 'idle' | 'toResource' | 'gathering' | 'toDropoff' = 'idle'
  private aiTargetNode: ResourceNode | null = null
  private aiTimer = 0

  constructor() {
    super('refuge')
  }

  init(data: RefugeSceneData) {
    this.hud = data.hud
    this.hud.wood = 0
    this.hud.stone = 0
    this.hud.buildProgress = 0
    this.hud.buildRequired = BUILD_REQUIRED
    this.hud.message = 'Ramassez du bois et de la pierre'
    this.hud.phase = 'gather'
  }

  preload() {
    this.generateTextures()
  }

  create() {
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x4a7d4c)

    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(10, WORLD_W - 10)
      const y = Phaser.Math.Between(10, WORLD_H - 10)
      this.add.circle(x, y, Phaser.Math.Between(2, 4), 0x5a8f57, 0.5)
    }

    const treeSpots: [number, number][] = [
      [120, 120],
      [180, 300],
      [90, 460],
      [260, 500],
      [140, 200],
    ]
    const rockSpots: [number, number][] = [
      [820, 140],
      [760, 340],
      [860, 480],
      [700, 220],
    ]
    treeSpots.forEach(([x, y]) => this.spawnResource('wood', x, y))
    rockSpots.forEach(([x, y]) => this.spawnResource('stone', x, y))

    this.buildSite = this.add.image(this.buildSitePos.x, this.buildSitePos.y, 'buildsite')

    this.player = this.add.image(WORLD_W / 2 - 60, WORLD_H / 2 + 140, 'player')
    this.partner = this.add.image(WORLD_W / 2 + 60, WORLD_H / 2 + 140, 'partner')

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.playerTarget = new Phaser.Math.Vector2(p.worldX, p.worldY)
      this.playerTargetNode = null
    })
  }

  update(_time: number, delta: number) {
    this.updatePlayer(delta)
    this.updateAI(delta)
    this.updateBuild()
  }

  // ---------------------------------------------------------------- visuels

  /** Genere toutes les textures en code, sans image externe (a remplacer
   *  plus tard par un pack libre, ex. Kenney.nl, en gardant les memes cles). */
  private generateTextures() {
    const g = this.add.graphics()

    g.clear()
    g.fillStyle(0xe2447b, 1)
    g.fillCircle(16, 16, 14)
    g.lineStyle(3, 0xffffff, 1)
    g.strokeCircle(16, 16, 14)
    g.generateTexture('player', 32, 32)

    g.clear()
    g.fillStyle(0x7a5cff, 1)
    g.fillCircle(16, 16, 14)
    g.lineStyle(3, 0xffffff, 1)
    g.strokeCircle(16, 16, 14)
    g.generateTexture('partner', 32, 32)

    g.clear()
    g.fillStyle(0x6b4327, 1)
    g.fillRect(14, 28, 8, 16)
    g.fillStyle(0x2f7a3e, 1)
    g.fillCircle(18, 20, 18)
    g.fillStyle(0x3d9450, 1)
    g.fillCircle(12, 14, 12)
    g.generateTexture('tree', 36, 44)

    g.clear()
    g.fillStyle(0x8a8a8a, 1)
    g.fillEllipse(16, 16, 28, 20)
    g.fillStyle(0xa8a8a8, 1)
    g.fillEllipse(12, 12, 14, 10)
    g.generateTexture('rock', 32, 28)

    g.clear()
    g.lineStyle(3, 0xffffff, 0.8)
    g.strokeRect(0, 0, 70, 50)
    g.fillStyle(0x8a6a45, 0.35)
    g.fillRect(0, 0, 70, 50)
    g.generateTexture('buildsite', 70, 50)

    g.clear()
    g.fillStyle(0x9c7448, 1)
    g.fillRect(0, 0, 70, 50)
    g.lineStyle(2, 0x5c4327, 1)
    for (let y = 0; y < 50; y += 12) g.lineBetween(0, y, 70, y)
    g.generateTexture('wall', 70, 50)

    g.destroy()
  }

  private spawnResource(type: ResourceType, x: number, y: number) {
    const sprite = this.add.image(x, y, type === 'wood' ? 'tree' : 'rock')
    sprite.setInteractive({ useHandCursor: true })
    const node: ResourceNode = { type, sprite }

    sprite.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      this.playerTarget = new Phaser.Math.Vector2(sprite.x, sprite.y)
      this.playerTargetNode = node
    })

    this.resources.push(node)
  }

  // ------------------------------------------------------------ deplacement

  private moveToward(
    obj: Phaser.GameObjects.Image,
    target: Phaser.Math.Vector2 | null,
    delta: number,
  ): boolean {
    if (!target) return false
    const dist = Phaser.Math.Distance.Between(obj.x, obj.y, target.x, target.y)
    if (dist < 4) return true
    const angle = Phaser.Math.Angle.Between(obj.x, obj.y, target.x, target.y)
    const step = (SPEED * delta) / 1000
    obj.x += Math.cos(angle) * step
    obj.y += Math.sin(angle) * step
    return false
  }

  // ----------------------------------------------------------------- joueur

  private updatePlayer(delta: number) {
    if (this.hud.phase === 'done') return

    const arrived = this.moveToward(this.player, this.playerTarget, delta)
    if (!arrived || !this.playerTarget) return

    if (this.playerTargetNode && !this.carrying.player) {
      this.carrying.player = this.playerTargetNode.type
      this.hud.message =
        this.playerTargetNode.type === 'wood'
          ? 'Bois récolté, direction le chantier'
          : 'Pierre récoltée, direction le chantier'
      this.playerTargetNode = null
      this.playerTarget = new Phaser.Math.Vector2(this.buildSitePos.x - 25, this.buildSitePos.y + 45)
      return
    }

    const nearSite =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.buildSitePos.x, this.buildSitePos.y) < 70

    if (nearSite && this.carrying.player) {
      this.depositResource('player')
    }
    this.playerTarget = null
  }

  private depositResource(who: 'player' | 'partner') {
    const type = this.carrying[who]
    if (!type) return
    if (type === 'wood') this.hud.wood++
    else this.hud.stone++
    this.carrying[who] = null
    this.checkBuildReady()
  }

  private checkBuildReady() {
    if (this.hud.phase !== 'gather') return
    if (this.hud.wood >= BUILD_REQUIRED.wood && this.hud.stone >= BUILD_REQUIRED.stone) {
      this.hud.phase = 'build'
      this.hud.message = 'Rejoignez-vous tous les deux au chantier pour lever le mur'
    }
  }

  private updateBuild() {
    if (this.hud.phase !== 'build') return

    const pNear =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, this.buildSitePos.x, this.buildSitePos.y) < 60
    const aNear =
      Phaser.Math.Distance.Between(this.partner.x, this.partner.y, this.buildSitePos.x, this.buildSitePos.y) < 60

    if (pNear && aNear) {
      this.hud.buildProgress = Math.min(1, this.hud.buildProgress + 0.008)
      this.hud.message = 'Vous levez le mur ensemble...'
      if (this.hud.buildProgress >= 1) {
        this.hud.phase = 'done'
        this.hud.message = 'Le premier mur de votre maison est debout !'
        this.buildSite.setTexture('wall')
      }
    } else {
      this.hud.message = 'Rejoignez-vous tous les deux au chantier pour lever le mur'
    }
  }

  // -------------------------------------------------------- IA du partenaire

  private updateAI(delta: number) {
    if (this.hud.phase === 'done') return

    if (this.hud.phase === 'build') {
      this.partnerTarget = new Phaser.Math.Vector2(this.buildSitePos.x + 25, this.buildSitePos.y)
      this.moveToward(this.partner, this.partnerTarget, delta)
      return
    }

    this.aiTimer -= delta

    if (this.aiState === 'idle' && this.aiTimer <= 0) {
      const free = this.resources.find((r) => !r.sprite.getData('taken'))
      if (free) {
        this.aiTargetNode = free
        free.sprite.setData('taken', true)
        this.partnerTarget = new Phaser.Math.Vector2(free.sprite.x, free.sprite.y)
        this.aiState = 'toResource'
      }
      this.aiTimer = 300
      return
    }

    if (this.aiState === 'toResource') {
      const arrived = this.moveToward(this.partner, this.partnerTarget, delta)
      if (arrived) {
        this.aiState = 'gathering'
        this.aiTimer = 500
      }
      return
    }

    if (this.aiState === 'gathering') {
      if (this.aiTimer <= 0) {
        if (this.aiTargetNode) {
          this.carrying.partner = this.aiTargetNode.type
          this.aiTargetNode.sprite.setData('taken', false)
          this.aiTargetNode = null
        }
        this.partnerTarget = new Phaser.Math.Vector2(this.buildSitePos.x + 25, this.buildSitePos.y + 45)
        this.aiState = 'toDropoff'
      }
      return
    }

    if (this.aiState === 'toDropoff') {
      const arrived = this.moveToward(this.partner, this.partnerTarget, delta)
      if (arrived) {
        this.depositResource('partner')
        this.aiState = 'idle'
        this.aiTimer = 200
      }
      return
    }

    this.moveToward(this.partner, this.partnerTarget, delta)
  }
}
