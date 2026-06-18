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
      path: '/templates',
      name: 'templates',
      component: () => import('@/views/TemplatesView.vue'),
      meta: { title: '冲煮方案' },
    },
    {
      path: '/beans',
      name: 'beans',
      component: () => import('@/views/BeansView.vue'),
      meta: { title: '咖啡豆档案' },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
      meta: { title: '数据统计' },
    },
    {
      path: '/timer',
      name: 'timer',
      component: () => import('@/views/TimerView.vue'),
      meta: { title: '冲煮倒计时' },
    },
  ],
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · 手冲咖啡记录` : '手冲咖啡记录'
})

export default router
