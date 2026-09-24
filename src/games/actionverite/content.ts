/**
 * Contenu d'"Action ou Verite" (phase 2 : le duo joue pendant l'appel vocal). Tout doit pouvoir se
 * faire a distance, rester respectueux (jamais humiliant ni sexuel) et adapte a l'intention.
 */

export type Kind = 'verite' | 'action'
export type Level = 'doux' | 'complice' | 'audacieux'
export type Intention = 'amour' | 'amitie'

export const LEVELS: { id: Level; label: string; emoji: string }[] = [
  { id: 'doux', label: 'Doux', emoji: '🌸' },
  { id: 'complice', label: 'Complice', emoji: '🔥' },
  { id: 'audacieux', label: 'Audacieux', emoji: '🌶️' },
]

type Deck = Record<Intention, Record<Kind, Record<Level, string[]>>>

export const PROMPTS: Deck = {
  amour: {
    verite: {
      doux: [
        'Qu’est-ce qui t’a donné envie de continuer à me parler ?',
        'Quel est ton plus beau souvenir d’enfance ?',
        'Ton plat préféré, celui que tu mangerais tous les jours ?',
        'La chanson qui te met de bonne humeur à coup sûr ?',
        'Qu’est-ce qui te fait craquer chez quelqu’un, au premier regard ?',
        'Ton rendez-vous idéal, du début à la fin ?',
      ],
      complice: [
        'Qu’as-tu pensé de moi au tout début ?',
        'Ta plus grosse honte en public ?',
        'Ton défaut que tu caches le mieux ?',
        'La chose la plus romantique qu’on ait faite pour toi ?',
        'Tu es plutôt jaloux(se) ou pas du tout ?',
        'Qu’est-ce qui te ferait fuir dès le premier rendez-vous ?',
      ],
      audacieux: [
        'Qu’est-ce que tu n’as encore jamais dit à personne sur l’amour ?',
        'Ta plus grande peur dans une relation ?',
        'Qu’est-ce qu’un ex t’a appris sur toi ?',
        'Où te vois-tu dans 5 ans, vraiment ?',
        'Qu’est-ce qui te rend irremplaçable, selon toi ?',
        'Qu’est-ce que tu attends de moi si on continue ?',
      ],
    },
    action: {
      doux: [
        'Chante le refrain de ta chanson d’amour préférée.',
        'Fais-moi un compliment sincère sans hésiter.',
        'Imite la voix d’un présentateur radio pour annoncer notre rendez-vous.',
        'Décris ta chambre comme un agent immobilier très enthousiaste.',
        'Raconte une blague, même nulle, jusqu’au bout.',
        'Dis « je t’apprécie » dans 3 langues ou accents différents.',
      ],
      complice: [
        'Déclare-moi ta flamme façon film de Nollywood.',
        'Improvise un petit poème de 4 lignes sur moi.',
        'Envoie-moi la dernière photo drôle de ta galerie.',
        'Imite ma façon de parler pendant 20 secondes.',
        'Invente le nom de notre futur restaurant et décris le menu.',
        'Fais un vocal de 10 secondes comme si on était mariés depuis 20 ans.',
      ],
      audacieux: [
        'Dis-moi en face ce qui t’a le plus plu chez moi aujourd’hui.',
        'Chante 15 secondes d’une chanson de mariage.',
        'Propose-moi un vrai rendez-vous, avec lieu et heure, maintenant.',
        'Change ta photo de profil WhatsApp pour une photo choisie par moi pendant 1 heure.',
        'Raconte ton pire rendez-vous comme une histoire d’horreur.',
        'Envoie un message gentil à la dernière personne de ta famille avec qui tu as parlé.',
      ],
    },
  },
  amitie: {
    verite: {
      doux: [
        'Ton plat préféré, celui que tu mangerais tous les jours ?',
        'Le film ou la série que tu peux revoir 100 fois ?',
        'Ta passion la plus inattendue ?',
        'Le meilleur conseil qu’on t’ait donné ?',
        'La chanson qui te met de bonne humeur à coup sûr ?',
        'Ton talent caché ?',
      ],
      complice: [
        'Ta plus grosse honte en public ?',
        'Le mensonge le plus drôle que tu aies raconté ?',
        'Qu’est-ce qui t’énerve le plus chez un ami ?',
        'Ton pire fou rire, au pire moment ?',
        'Qu’as-tu pensé de moi au tout début ?',
        'Le rêve un peu fou que tu n’as jamais osé dire ?',
      ],
      audacieux: [
        'Une amitié perdue que tu regrettes ?',
        'Qu’est-ce qui te fait vraiment peur ?',
        'Quand t’es-tu senti(e) le plus seul(e) ?',
        'Qu’est-ce que tu attends d’un meilleur ami ?',
        'Une chose que tu n’as jamais osé dire à tes parents ?',
        'De quoi es-tu le plus fier (fière) dans ta vie ?',
      ],
    },
    action: {
      doux: [
        'Imite un célèbre commentateur de football pendant 20 secondes.',
        'Raconte une blague, même nulle, jusqu’au bout.',
        'Fais le cri de ton animal préféré.',
        'Chante le générique d’un dessin animé.',
        'Décris ta journée comme un reportage du journal télévisé.',
        'Parle comme un robot jusqu’à ton prochain tour.',
      ],
      complice: [
        'Envoie-moi la dernière photo drôle de ta galerie.',
        'Imite ma façon de parler pendant 20 secondes.',
        'Invente un surnom pour moi et justifie-le.',
        'Fais un discours de 20 secondes pour ma future élection de président.',
        'Chante une chanson en remplaçant les paroles par « attiéké ».',
        'Raconte ton dernier rêve en le rendant épique.',
      ],
      audacieux: [
        'Appelle un ami et dis-lui qu’il te manque, sans explication.',
        'Poste un statut WhatsApp choisi par moi pendant 1 heure.',
        'Raconte ta plus grande honte en détail.',
        'Fais un compliment sincère à 3 personnes de tes contacts.',
        'Chante 15 secondes en public (fenêtre ouverte !).',
        'Montre-moi (décris) l’objet le plus bizarre de ta chambre.',
      ],
    },
  },
}

/** Gages : pour un refus sans joker, ou une action/verite jugee "pas respectee". De plus en plus corses. */
export const GAGES: { tier: 1 | 2 | 3; label: string; emoji: string; items: string[] }[] = [
  {
    tier: 1,
    label: 'Gage léger',
    emoji: '🙂',
    items: [
      'Parle avec un accent de ton choix jusqu’à ton prochain tour.',
      'Commence chacune de tes phrases par « Votre Majesté » pendant 2 tours.',
      'Chante « Joyeux anniversaire » à ton partenaire, même si ce n’est pas son anniversaire.',
      'Fais 10 squats en comptant à voix haute.',
    ],
  },
  {
    tier: 2,
    label: 'Gage moyen',
    emoji: '😬',
    items: [
      'Ton partenaire choisit ta prochaine question, sans roue.',
      'Envoie un vocal de 10 secondes où tu te déclares « champion de la honte ».',
      'Imite un animal choisi par ton partenaire pendant 15 secondes.',
      'Fais une déclaration d’amour… à ton plat préféré, pendant 15 secondes.',
    ],
  },
  {
    tier: 3,
    label: 'Gage corsé',
    emoji: '🥵',
    items: [
      'Ton partenaire choisit ta photo de profil WhatsApp pendant 1 heure.',
      'Réponds à la prochaine vérité ET fais la prochaine action, au lieu d’une seule.',
      'Raconte un moment gênant que tu n’as encore jamais raconté.',
      'Écris un compliment sincère à ton partenaire, lu à voix haute.',
    ],
  },
]

/** Reponses possibles du robot pour une verite (sur le site uniquement). */
export const ROBOT_TRUTHS = [
  'Hmm… bon, je vais être honnête : je n’en ai jamais parlé à personne 😅',
  'Facile ! C’est clairement l’alloco du quartier.',
  'Tu vas rire, mais c’était pendant un mariage…',
  'Je dirais la sincérité. Le reste, ça s’apprend.',
  'Ahah, question piège ! Je dirais… toi 😄',
  'Honnêtement ? J’ai eu peur de ne pas être à la hauteur.',
]

export const ROBOT_ACTIONS = [
  'fait l’action avec beaucoup de sérieux… 😂',
  'se lance, un peu gêné, mais le fait jusqu’au bout !',
  'le fait avec une énergie incroyable 🎤',
]
