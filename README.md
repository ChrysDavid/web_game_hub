# Games Hub — hub de mini-jeux multi-applications

Site web (Vue 3 + Vite + TypeScript) qui héberge une collection de mini-jeux
consommés par plusieurs applications mobiles via une WebView intégrée. Chaque
jeu vit comme une route indépendante et est catégorisé par application
d'origine (couple, orientation scolaire, futures apps...).

## Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vue Router** — chaque jeu est une route dédiée
- **Pinia** — état partagé entre jeux si besoin (score, session en cours...)
- **TypeScript**
- **Vite** — dev server + build

## Lancer le projet

```bash
npm install
npm run dev
```

Le site est servi sur `http://localhost:5173/`.

Build de production :

```bash
npm run build
```

## Structure

```
src/
  assets/
    main.css              variables CSS (couleurs, reset) — base du design
  components/
    GameCard.vue           carte cliquable d'un jeu (miniature + titre)
  games/
    gamesList.ts            source de données : liste des jeux + catégories
  router/
    index.ts                déclaration des routes
  views/
    HomeView.vue             page d'accueil
    GamesListView.vue        galerie de tous les jeux, filtrable par catégorie
  App.vue                    coquille de l'app (uniquement <RouterView />)
  main.ts                    point d'entrée
```

## Ajouter un nouveau jeu

1. Ajouter une entrée dans `src/games/gamesList.ts` :

   ```ts
   {
     id: 'mon-jeu',
     title: 'Mon jeu',
     thumbnail: '/thumbnails/mon-jeu.jpg',
     type: '2D', // ou '3D'
     category: 'couple', // ou 'orientation', etc.
     route: '/jeux/mon-jeu',
   }
   ```

2. Créer la vue du jeu, par exemple `src/views/games/MonJeuView.vue`.

3. Déclarer la route dans `src/router/index.ts` :

   ```ts
   {
     path: '/jeux/mon-jeu',
     name: 'mon-jeu',
     component: () => import('../views/games/MonJeuView.vue'),
   },
   ```

4. Déposer la vignette dans `public/thumbnails/mon-jeu.jpg`.

Le jeu apparaît alors automatiquement dans la galerie `/jeux`, filtrable par
sa catégorie.

## Catégories

Les catégories (`GameCategory` dans `gamesList.ts`) permettent à chaque
application consommatrice de n'afficher que ses propres jeux. Actuellement :

- `couple` — jeux pour l'app de rencontre
- `orientation` — jeux pour l'app d'orientation scolaire

Pour une nouvelle application, ajouter une valeur au type `GameCategory` et
au dictionnaire `categoryLabels`.

## Intégration dans les apps mobiles (Flutter)

Chaque jeu est pensé pour être ouvert dans une WebView native, pas dans un
navigateur externe :

- L'app mobile ouvre l'URL du jeu (`https://.../jeux/mon-jeu`) dans une
  WebView (`webview_flutter` ou `flutter_inappwebview`).
- Le jeu communique sa fin de partie (score, résultat) à l'app native via
  `window.postMessage` — l'app écoute cet événement et reprend la main,
  ferme la WebView.
- L'app garde le contrôle total : pas de navigation libre dans la WebView,
  bouton de fermeture natif toujours visible, timeout de session côté app.
- Un même jeu web fonctionne identiquement sur iOS et Android, sans code
  spécifique à la plateforme.

## Design

Les variables de couleur (`--color-primary`, `--color-accent`, etc.) sont
centralisées dans `src/assets/main.css`. Modifier ces variables suffit à
changer l'identité visuelle de l'ensemble du hub sans toucher aux
composants.

## À faire ensuite

- [ ] Vignettes réelles dans `public/thumbnails/`
- [ ] Premier jeu fonctionnel de bout en bout (ex. quiz de compatibilité)
- [ ] Pont JS jeu ↔ app native (envoi du score de fin de partie)
- [ ] Filtrage de la galerie par app consommatrice via paramètre d'URL
      (`?app=couple`) plutôt que codé en dur
