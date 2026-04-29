import { createRouter, createWebHistory } from 'vue-router';
import MainView from '../views/MainView.vue';
import MapView from '../views/HomeView.vue';
import UavCoopView from '../views/UavCoopView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';

const TOKEN_KEY = 'forestfire_token';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      component: MainView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true }
    },
    {
      path: '/map',
      name: 'map',
      component: MapView,
      meta: { requiresAuth: true }
    },
    {
      path: '/uav',
      name: 'uav',
      component: UavCoopView,
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (to.meta.requiresAuth && !t) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guestOnly && t) {
    const r = to.query.redirect;
    if (typeof r === 'string' && r.startsWith('/')) {
      return r;
    }
    return { path: '/map' };
  }
  return true;
});

export default router;
