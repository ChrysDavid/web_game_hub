/** Les 7 jeux de la phase 1 (JEUX_PHASE1.md) : un jeu = un critere du score de compatibilite. */

export type Phase1GameId =
  | 'pas-de-reponse'
  | 'tu-preferes'
  | 'sous-pression'
  | 'le-partage'
  | 'association-express'
  | 'et-toi'
  | 'escalier'

export interface Phase1Game {
  id: Phase1GameId
  title: string
  intention: 'amour' | 'amitie'
  criterion: string
  /** Poids du critere dans le score de l'intention (en %). */
  weight: number
  emoji: string
  color: string
  /** Consigne montree avant de jouer : ce qu'il faut faire, jamais ce qui est mesure. */
  instruction: string
  /** Explication montree seulement a la fin (pour comprendre le jeu). */
  measures: string
}

export const PHASE1_GAMES: Phase1Game[] = [
  {
    id: 'pas-de-reponse',
    title: 'Pas de réponse…',
    intention: 'amour',
    criterion: 'Attachement',
    weight: 35,
    emoji: '💬',
    color: '#c2185b',
    instruction: 'Des conversations où ton message reste sans réponse. Choisis ce que tu ferais vraiment.',
    measures:
      "Le style d'attachement : serein, anxieux ou distant. Deux sereins, c'est le mieux ; un anxieux avec un distant, c'est le pire.",
  },
  {
    id: 'tu-preferes',
    title: 'Tu préfères ?',
    intention: 'amour',
    criterion: 'Valeurs de vie',
    weight: 25,
    emoji: '⚖️',
    color: '#ff7a59',
    instruction: 'Deux choix, quelques secondes. Réponds vite, sans trop réfléchir.',
    measures:
      'Tes valeurs de vie (enfants, argent, religion, où vivre…). Plus tes réponses ressemblent à celles de quelqu’un, plus votre paire marque de points.',
  },
  {
    id: 'sous-pression',
    title: 'Sous pression',
    intention: 'amour',
    criterion: 'Stabilité émotionnelle',
    weight: 20,
    emoji: '⏱️',
    color: '#1f2a44',
    instruction: 'Attrape 10 cœurs avant la fin du temps. Touche-les dès qu’ils apparaissent.',
    measures:
      "Ta réaction face à un échec injuste (le panier se renverse exprès) : tapes rageuses, abandon ou nouvel essai calme. On observe au lieu de demander « es-tu calme ? ».",
  },
  {
    id: 'le-partage',
    title: 'Le partage',
    intention: 'amour',
    criterion: 'Résolution de conflit',
    weight: 10,
    emoji: '🥭',
    color: '#8faf9a',
    instruction: 'Toi et ton partenaire devez vous partager des mangues. Trouvez un accord.',
    measures:
      "Ta façon de chercher un accord : coopérer, céder ou imposer. En phase 1, le partenaire est toujours simulé, jamais une vraie personne.",
  },
  {
    id: 'association-express',
    title: 'Association express',
    intention: 'amitie',
    criterion: "Centres d'intérêt",
    weight: 45,
    emoji: '⚡',
    color: '#ff7a59',
    instruction: 'Des activités défilent. Garde celles que tu aimes, jette les autres. 2 secondes chacune !',
    measures:
      "Ce que deux personnes aiment vraiment en commun, sans avoir le temps de « bien paraître » comme dans une liste écrite sur le profil.",
  },
  {
    id: 'et-toi',
    title: 'Et toi, tu fais quoi ?',
    intention: 'amitie',
    criterion: 'Valeurs et personnalité',
    weight: 30,
    emoji: '🤔',
    color: '#c2185b',
    instruction: 'Des situations de la vie de tous les jours. Choisis ta réaction.',
    measures:
      "Des réactions proches face aux mêmes situations sont un bon signe d'amitié durable.",
  },
  {
    id: 'escalier',
    title: "L'escalier",
    intention: 'amitie',
    criterion: 'Confiance mutuelle',
    weight: 25,
    emoji: '🪜',
    color: '#8faf9a',
    instruction: 'Chaque marche est une question un peu plus personnelle. Monte, ou arrête-toi quand tu veux.',
    measures:
      "Jusqu'où tu oses aller dans le partage. Ce qui compte, c'est que deux personnes aillent aussi loin l'une que l'autre.",
  },
]

export function phase1Game(id: string) {
  return PHASE1_GAMES.find((g) => g.id === id) ?? null
}
