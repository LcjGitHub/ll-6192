import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: '冲煮历史' },
    },
    {
      path: '/new',
      name: 'new',
      component: () => import('@/views/NewBrewView.vue'),
      meta: { title: '新建记录' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { title: '数据统计' },
    },
  ],
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 手冲咖啡记录` : '手冲咖啡记录'
})

export default router
