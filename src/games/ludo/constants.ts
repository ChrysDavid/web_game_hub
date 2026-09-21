export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue'

export const GRID_SIZE = 15
export const LAST_TRACK_STEP = 50
export const MAX_STEP = 56

// Circuit commun (52 cases), dans le sens de la marche, depart du rouge.
export const TRACK: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
]

export const START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}

export const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47])
export const STAR_INDICES = new Set([8, 21, 34, 47])

// Couloir prive : 6 cases, seules les 5 premieres sont coloriees
// (la 6e touche le triangle central).
export const HOME_PATH: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
}

export const YARD_ORIGIN: Record<PlayerColor, [number, number]> = {
  red: [0, 0],
  green: [0, 9],
  yellow: [9, 9],
  blue: [9, 0],
}

export const YARD_SLOTS: Record<PlayerColor, [number, number][]> = {
  red: [[2, 2], [2, 4], [4, 2], [4, 4]],
  green: [[2, 11], [2, 13], [4, 11], [4, 13]],
  yellow: [[11, 11], [11, 13], [13, 11], [13, 13]],
  blue: [[11, 2], [11, 4], [13, 2], [13, 4]],
}

export const COLOR_HEX: Record<PlayerColor, string> = {
  red: '#d94141',
  green: '#2e9e57',
  yellow: '#e9b02c',
  blue: '#2f6bd1',
}

export const COLOR_LABEL: Record<PlayerColor, string> = {
  red: 'Rouge',
  green: 'Vert',
  yellow: 'Jaune',
  blue: 'Bleu',
}

export const ALL_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue']

export function trackIndex(color: PlayerColor, step: number): number {
  return (START_INDEX[color] + step) % 52
}

/** Centre du pion en unites de case : [col, row]. */
export function centerOf(color: PlayerColor, step: number, tokenId: number): [number, number] {
  if (step < 0) {
    const [r, c] = YARD_SLOTS[color][tokenId]
    return [c, r]
  }
  if (step <= LAST_TRACK_STEP) {
    const [r, c] = TRACK[trackIndex(color, step)]
    return [c + 0.5, r + 0.5]
  }
  const [r, c] = HOME_PATH[color][step - LAST_TRACK_STEP - 1]
  return [c + 0.5, r + 0.5]
}

// --- Classification des 72 cases du circuit + couloirs, pour l'affichage ---

export type CellKind = 'start' | 'star' | 'path' | 'home'

export interface CellInfo {
  row: number
  col: number
  kind: CellKind
  color?: PlayerColor
}

export const BOARD_CELLS: CellInfo[] = (() => {
  const cells: CellInfo[] = []

  TRACK.forEach(([row, col], i) => {
    const startColor = ALL_COLORS.find((c) => START_INDEX[c] === i)
    if (startColor) {
      cells.push({ row, col, kind: 'start', color: startColor })
    } else if (STAR_INDICES.has(i)) {
      cells.push({ row, col, kind: 'star' })
    } else {
      cells.push({ row, col, kind: 'path' })
    }
  })

  ALL_COLORS.forEach((color) => {
    HOME_PATH[color].slice(0, 5).forEach(([row, col]) => {
      cells.push({ row, col, kind: 'home', color })
    })
  })

  return cells
})()
