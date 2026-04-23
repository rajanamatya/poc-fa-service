import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('@/pages/ContactsPage.vue'),
    },
    {
      path: '/contacts/add',
      name: 'add-contact',
      component: () => import('@/pages/AddContactPage.vue'),
    },
  ],
})

export default router
