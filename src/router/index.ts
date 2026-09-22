import { createRouter, createWebHistory } from 'vue-router'
import GamesListView from '../views/GamesListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: GamesListView,
    },
    {
      path: '/jeux/ludo',
      name: 'ludo',
      component: () => import('../views/games/LudoView.vue'),
    },
    {
      path: '/jeux/pioche',
      name: 'pioche',
      component: () => import('../views/games/PiocheView.vue'),
    },
    {
      path: '/jeux/refuge',
      name: 'refuge',
      component: () => import('../views/games/RefugeView.vue'),
    },
  ],
})

export default router
