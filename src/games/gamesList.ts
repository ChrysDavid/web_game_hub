export type GameCategory = 'couple' | 'orientation' | 'compatibilite'

export interface GameMeta {
  id: string
  title: string
  thumbnail: string
  type: '2D' | '3D'
  category: GameCategory
  route: string
}

export const gamesList: GameMeta[] = [
  {
    id: 'phase1',
    title: 'Jeux de compatibilité (phase 1)',
    thumbnail: '/thumbnails/phase1.jpg',
    type: '2D',
    category: 'compatibilite',
    route: '/jeux/phase1',
  },
  {
    id: 'ludo',
    title: 'Ludo',
    thumbnail: '/thumbnails/ludo.jpg',
    type: '2D',
    category: 'couple', // ou 'orientation' selon comment tu veux le classer
    route: '/jeux/ludo',
  },
  {
    id: 'pioche',
    title: 'Pioche',
    thumbnail: '/thumbnails/pioche.jpg',
    type: '2D',
    category: 'couple',
    route: '/jeux/pioche',
  },
  {
    id: 'action-verite',
    title: 'Action ou Vérité (phase 2)',
    thumbnail: '/thumbnails/action-verite.jpg',
    type: '2D',
    category: 'couple',
    route: '/jeux/action-verite',
  },
  {
    id: 'refuge',
    title: 'Notre Refuge',
    thumbnail: '/thumbnails/refuge.jpg',
    type: '2D',
    category: 'couple',
    route: '/jeux/refuge',
  },
]

export const categoryLabels: Record<GameCategory, string> = {
  couple: 'Couple',
  orientation: 'Orientation',
  compatibilite: 'Compatibilité',
}
