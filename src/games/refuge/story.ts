/**
 * Histoire de "Notre Refuge" : deux personnes qui se sont trouvees heritent du terrain de
 * Mama Adjoua. Chaque chapitre s'ouvre sur une de ses lettres ; le partenaire reagit en chemin.
 */

export interface Chapter {
  title: string
  letter: { title: string; text: string }
  /** Ce que dit le partenaire au debut du chapitre, puis a certains moments. */
  partnerStart: string
}

export const CHAPTERS: Chapter[] = [
  {
    title: 'La lettre',
    letter: {
      title: 'Première lettre de Mama Adjoua',
      text:
        'Mes enfants,\n\nsi vous lisez cette lettre, c’est que vous êtes arrivés sur ma terre. ' +
        'J’y ai planté mes premiers manguiers le jour où j’ai rencontré votre grand-père. ' +
        'Nous n’avions rien, sauf l’envie de construire quelque chose à deux.\n\n' +
        'Une maison, ça commence par des fondations solides. Allez chercher les pierres de la ' +
        'carrière, à l’est. Posez-les ensemble.\n\nAvec tout mon amour, Mama.',
    },
    partnerStart: 'Tu te rends compte ? Un terrain rien qu’à nous… On commence par les pierres ?',
  },
  {
    title: 'Deux cœurs, quatre murs',
    letter: {
      title: 'Deuxième lettre',
      text:
        'Les fondations tiennent ? Bien. Maintenant, les murs.\n\n' +
        'Le bois de la forêt, à l’ouest, est vieux et fort. Votre grand-père disait qu’un mur ' +
        'protège de la pluie, mais que c’est la personne à côté de toi qui protège du froid.\n\n' +
        'Ne portez pas tout seul ce qui se porte à deux.',
    },
    partnerStart: 'Les pierres ont tenu. On va chercher le bois ? Je te suis.',
  },
  {
    title: 'Notre petit maquis',
    letter: {
      title: 'Troisième lettre',
      text:
        'Un toit, une porte, des fenêtres… tout cela coûte de l’argent. Nous aussi, nous n’en avions pas.\n\n' +
        'Alors j’ai pressé les mangues du verger, au sud, et j’ai vendu mon jus aux gens du village. ' +
        'Le premier jour, j’ai gagné 50 francs. J’ai pleuré de joie.\n\n' +
        'Construisez votre stand près de la maison. Faites-vous confiance : un petit commerce, ' +
        'c’est beaucoup de patience et beaucoup de sourires.',
    },
    partnerStart: 'Un maquis de jus de mangue… Et si c’était le début de notre histoire à nous ?',
  },
  {
    title: 'Faire grandir notre monde',
    letter: {
      title: 'Quatrième lettre',
      text:
        'Votre maison a un toit. Je souris en l’imaginant.\n\n' +
        'Au-delà de la rivière, au sud, il y a une prairie où je m’asseyais pour regarder le ciel. ' +
        'Construisez un pont pour y aller. Et faites de ce coin un endroit où les autres aussi ' +
        'aiment venir : de la lumière, de l’eau, des fleurs.\n\n' +
        'Un foyer, c’est un endroit qui rend le monde autour de lui un peu plus beau.',
    },
    partnerStart: 'Regarde tout ce qu’on a fait… On continue ? Il paraît que la prairie est magnifique.',
  },
  {
    title: 'La première soirée',
    letter: {
      title: 'Dernière lettre',
      text:
        'Mes enfants,\n\nce soir, allumez le feu devant votre maison et asseyez-vous l’un contre l’autre. ' +
        'Vous verrez : le plus beau, ce n’est pas la maison. C’est d’avoir construit ensemble.\n\n' +
        'Cette terre est à vous maintenant. Prenez-en soin, et prenez soin l’un de l’autre.\n\n' +
        'Je vous aime. Mama Adjoua.',
    },
    partnerStart: 'La nuit tombe… Viens, allons allumer le feu ensemble.',
  },
]

/** Petites phrases du partenaire, pour que le monde soit vivant. */
export const PARTNER_LINES = {
  stone: ['Encore une pierre, et on y est presque !', 'Mama avait raison, ça tient bien.', 'Regarde, le mur de pierre prend forme !'],
  wood: ['Ce bois sent bon…', 'On dirait déjà une vraie maison !', 'Je nous imagine déjà dedans.'],
  sale: ['Un client content ! 😄', 'On est des commerçants maintenant !', 'Mama serait fière de nous.'],
  noJuice: ['Oups, plus de jus… Il faut des mangues !'],
  upgrade: ['Waouh, le monde change grâce à nous.', 'C’est de plus en plus beau ici.'],
}
