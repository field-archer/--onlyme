import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../views/MainView.vue'
import MapView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      component: MainView
    },
    {
      path: '/map',
      name: 'map',
      component: MapView
    }
  ]
})

export default router