import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../App.vue')  // 直接使用 App.vue
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/UserProfileView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router