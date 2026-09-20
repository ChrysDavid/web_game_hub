export type GameCategory = 'couple' | 'orientation'

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
    id: 'devine-la-photo',
    title: 'Devine la photo',
    thumbnail: '/thumbnails/devine-la-photo.jpg',
    type: '2D',
    category: 'couple',
    route: '/jeux/devine-la-photo',
  },
  {
    id: 'quiz-compatibilite',
    title: 'Quiz de compatibilité',
    thumbnail: '/thumbnails/quiz-compatibilite.jpg',
    type: '2D',
    category: 'couple',
    route: '/jeux/quiz-compatibilite',
  },
  {
    id: 'aventure-explore',
    title: 'Aventure à deux',
    thumbnail: '/thumbnails/aventure-explore.jpg',
    type: '3D',
    category: 'couple',
    route: '/jeux/aventure-explore',
  },
  {
    id: 'metiers-explorer',
    title: 'Explore les métiers',
    thumbnail: '/thumbnails/metiers-explorer.jpg',
    type: '3D',
    category: 'orientation',
    route: '/jeux/metiers-explorer',
  },
  {
    id: 'quiz-orientation',
    title: 'Quel métier pour toi ?',
    thumbnail: '/thumbnails/quiz-orientation.jpg',
    type: '2D',
    category: 'orientation',
    route: '/jeux/quiz-orientation',
  },
]

export const categoryLabels: Record<GameCategory, string> = {
  couple: 'Couple',
  orientation: 'Orientation',
}
