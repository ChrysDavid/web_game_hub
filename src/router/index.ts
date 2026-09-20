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
  ],
})

export default router
