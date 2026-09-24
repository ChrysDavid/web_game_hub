import type { AttachmentStyle, ConflictStyle } from './robots'

/** Contenu des jeux de phase 1 : questions, scenes et activites, identiques pour tout le groupe. */

// --- Tu preferes ? (valeurs de vie) ----------------------------------------------------------------

export interface Dilemma {
  id: string
  a: { emoji: string; label: string }
  b: { emoji: string; label: string }
}

export const DILEMMAS: Dilemma[] = [
  { id: 'enfants', a: { emoji: '👶', label: 'Des enfants tôt' }, b: { emoji: '✈️', label: 'Profiter à deux d’abord' } },
  { id: 'argent', a: { emoji: '🏦', label: 'Épargner pour demain' }, b: { emoji: '🎉', label: 'Profiter aujourd’hui' } },
  { id: 'ville', a: { emoji: '🏙️', label: 'Vivre en ville' }, b: { emoji: '🌳', label: 'Vivre au calme' } },
  { id: 'foi', a: { emoji: '🙏', label: 'Foi au centre du couple' }, b: { emoji: '🕊️', label: 'Chacun sa foi' } },
  { id: 'famille', a: { emoji: '🏠', label: 'Vivre près de la famille' }, b: { emoji: '🧭', label: 'Vivre là où on veut' } },
  { id: 'budget', a: { emoji: '🤝', label: 'Un budget commun' }, b: { emoji: '👛', label: 'Chacun son argent' } },
  { id: 'weekend', a: { emoji: '🛋️', label: 'Week-end à la maison' }, b: { emoji: '🎶', label: 'Week-end de sorties' } },
  { id: 'travail', a: { emoji: '💼', label: 'La carrière avant tout' }, b: { emoji: '⏳', label: 'Du temps pour la famille' } },
  { id: 'mariage', a: { emoji: '💍', label: 'Mariage traditionnel' }, b: { emoji: '📝', label: 'Union simple' } },
  { id: 'etranger', a: { emoji: '🌍', label: 'Tenter sa chance à l’étranger' }, b: { emoji: '🇨🇮', label: 'Construire au pays' } },
]

export const DILEMMA_SECONDS = 6

// --- Pas de reponse... (attachement) ---------------------------------------------------------------

export interface SilenceScene {
  id: string
  who: string
  messages: string[]
  seen: string
  later: string
  options: { text: string; style: AttachmentStyle }[]
}

export const SILENCE_SCENES: SilenceScene[] = [
  {
    id: 'soiree',
    who: 'La personne avec qui tu parles depuis 2 semaines',
    messages: ['Coucou 😊 Tu fais quoi ce soir ?'],
    seen: 'Vu à 19:42',
    later: '3 heures plus tard…',
    options: [
      { text: 'Je renvoie un message, puis un autre : « Tu es là ? »', style: 'anxieux' },
      { text: 'Je pense qu’elle est occupée, je verrai demain', style: 'serein' },
      { text: 'Tant pis, je ne lui écris plus', style: 'distant' },
    ],
  },
  {
    id: 'photo',
    who: 'Ton crush',
    messages: ['Regarde ce coucher de soleil 🌅', '[photo]'],
    seen: 'Vu à 18:10',
    later: 'Le lendemain matin…',
    options: [
      { text: 'Je me demande ce que j’ai fait de mal', style: 'anxieux' },
      { text: 'Je passe à autre chose, ça ne m’intéresse plus trop', style: 'distant' },
      { text: 'Je lui souhaite une bonne journée, simplement', style: 'serein' },
    ],
  },
  {
    id: 'rdv',
    who: 'La personne que tu dois voir samedi',
    messages: ['On se retrouve toujours samedi à 16h ?'],
    seen: 'Vu à 12:03',
    later: 'Le soir, toujours rien…',
    options: [
      { text: 'Je demande calmement si c’est toujours d’accord', style: 'serein' },
      { text: 'J’annule avant qu’elle ne le fasse', style: 'distant' },
      { text: 'Je vérifie sans arrêt si elle est en ligne', style: 'anxieux' },
    ],
  },
  {
    id: 'confidence',
    who: 'Quelqu’un de proche',
    messages: ['J’ai passé une journée difficile…', 'Je peux te parler ?'],
    seen: 'Vu à 22:31',
    later: '1 heure plus tard…',
    options: [
      { text: 'Je me dis que je l’ennuie avec mes problèmes', style: 'anxieux' },
      { text: 'Je garde ça pour moi, je gère seul', style: 'distant' },
      { text: 'J’attends, il ou elle doit être fatigué(e)', style: 'serein' },
    ],
  },
  {
    id: 'anniversaire',
    who: 'La personne qui te plaît',
    messages: ['Joyeux anniversaire 🎂 !'],
    seen: 'Vu à 09:15',
    later: 'Toute la journée passe…',
    options: [
      { text: 'Pas grave, les anniversaires sont chargés', style: 'serein' },
      { text: 'Je lui fais la tête la prochaine fois', style: 'distant' },
      { text: 'Je relis mon message dix fois pour voir ce qui cloche', style: 'anxieux' },
    ],
  },
]

export const ATTACHMENT_LABEL: Record<AttachmentStyle, string> = {
  serein: 'Serein',
  anxieux: 'Anxieux',
  distant: 'Distant',
}

// --- Le partage (resolution de conflit) --------------------------------------------------------------

export const MANGOES = 12

export const CONFLICT_LABEL: Record<ConflictStyle, string> = {
  cooperer: 'Coopère',
  ceder: 'Cède',
  imposer: 'Impose',
}

/** Premiere proposition : combien de mangues la personne garde pour elle sur 12. */
export function conflictFromOffer(kept: number): ConflictStyle {
  if (kept <= 4) return 'ceder'
  if (kept >= 8) return 'imposer'
  return 'cooperer'
}

// --- Association express (centres d'interet) --------------------------------------------------------

export interface Hobby {
  id: string
  emoji: string
  label: string
}

export const HOBBIES: Hobby[] = [
  { id: 'foot', emoji: '⚽', label: 'Football' },
  { id: 'danse', emoji: '💃', label: 'Danse' },
  { id: 'cuisine', emoji: '🍲', label: 'Cuisine' },
  { id: 'lecture', emoji: '📚', label: 'Lecture' },
  { id: 'jeux', emoji: '🎮', label: 'Jeux vidéo' },
  { id: 'plage', emoji: '🏖️', label: 'Plage' },
  { id: 'musique', emoji: '🎤', label: 'Karaoké' },
  { id: 'cinema', emoji: '🎬', label: 'Cinéma' },
  { id: 'eglise', emoji: '⛪', label: 'Activités religieuses' },
  { id: 'mode', emoji: '👗', label: 'Mode' },
  { id: 'voyage', emoji: '🧳', label: 'Voyages' },
  { id: 'sport', emoji: '🏋️', label: 'Salle de sport' },
  { id: 'series', emoji: '📺', label: 'Séries' },
  { id: 'nature', emoji: '🌿', label: 'Balades nature' },
  { id: 'business', emoji: '📈', label: 'Business' },
  { id: 'photo', emoji: '📷', label: 'Photo' },
  { id: 'maquis', emoji: '🍗', label: 'Sorties au maquis' },
  { id: 'benevolat', emoji: '🤲', label: 'Bénévolat' },
  { id: 'art', emoji: '🎨', label: 'Dessin, peinture' },
  { id: 'awale', emoji: '🎲', label: 'Jeux de société' },
]

export const HOBBY_SECONDS = 2

// --- Et toi, tu fais quoi ? (valeurs et personnalite) -------------------------------------------------

export interface Situation {
  id: string
  text: string
  options: { id: string; text: string }[]
}

export const SITUATIONS: Situation[] = [
  {
    id: 'retard',
    text: 'Ton ami arrive avec 1 heure de retard sans prévenir.',
    options: [
      { id: 'dire', text: 'Je lui dis franchement que ça m’a dérangé' },
      { id: 'rien', text: 'Je ne dis rien, ce n’est pas grave' },
      { id: 'partir', text: 'Je pars au bout de 30 minutes' },
    ],
  },
  {
    id: 'argent',
    text: 'Un ami te demande de lui prêter de l’argent.',
    options: [
      { id: 'oui', text: 'Je prête sans hésiter' },
      { id: 'date', text: 'Je prête avec une date de retour' },
      { id: 'non', text: 'Je refuse, l’argent gâche les amitiés' },
    ],
  },
  {
    id: 'secret',
    text: 'Tu apprends un secret gênant sur quelqu’un du groupe.',
    options: [
      { id: 'garder', text: 'Je le garde pour moi' },
      { id: 'parler', text: 'J’en parle à la personne concernée' },
      { id: 'partager', text: 'J’en parle à un ami de confiance' },
    ],
  },
  {
    id: 'fete',
    text: 'Samedi soir, pas de programme.',
    options: [
      { id: 'sortir', text: 'J’appelle tout le monde pour sortir' },
      { id: 'maison', text: 'Soirée tranquille à la maison' },
      { id: 'un', text: 'Je vois un seul ami proche' },
    ],
  },
  {
    id: 'dispute',
    text: 'Deux de tes amis se disputent.',
    options: [
      { id: 'mediateur', text: 'J’essaie de les réconcilier' },
      { id: 'neutre', text: 'Je reste en dehors' },
      { id: 'camp', text: 'Je prends le parti de celui qui a raison' },
    ],
  },
  {
    id: 'succes',
    text: 'Ton ami réussit là où tu as échoué.',
    options: [
      { id: 'fete', text: 'Je suis content et je le félicite' },
      { id: 'pique', text: 'Je le félicite, mais ça me pique un peu' },
      { id: 'motive', text: 'Ça me motive à réessayer' },
    ],
  },
  {
    id: 'aide',
    text: 'Un ami déménage un dimanche matin.',
    options: [
      { id: 'viens', text: 'Je viens aider, évidemment' },
      { id: 'argent', text: 'Je paie un taxi-camion à la place' },
      { id: 'excuse', text: 'Je trouve une excuse' },
    ],
  },
  {
    id: 'critique',
    text: 'Un ami critique ta tenue devant les autres.',
    options: [
      { id: 'rire', text: 'J’en rigole avec lui' },
      { id: 'apres', text: 'Je lui en parle après, en privé' },
      { id: 'repond', text: 'Je réponds sur le même ton' },
    ],
  },
]

// --- L'escalier (confiance mutuelle) ----------------------------------------------------------------

export const STAIRS: string[] = [
  'Quel est ton plat préféré ?',
  'Qu’est-ce qui te fait rire à coup sûr ?',
  'De quoi es-tu le plus fier ?',
  'Qu’est-ce qui te fait peur dans l’avenir ?',
  'Quel moment de ta vie t’a le plus blessé ?',
  'Qu’est-ce que tu n’as jamais osé dire à personne ?',
]
