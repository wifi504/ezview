import type { RouteRecordOption } from '@ezview/gen-vue-routes'

export default [
  {
    path: '/ai-revise',
    redirect: '/ai-revise/home',
  },
  {
    path: '/ai-simulation',
    redirect: '/ai-simulation/home',
  },
  {
    path: '/login',
    name: 'login-page',
    meta: {
      title: '系统登录页',
    },
  },
  {
    path: '/ai-revise/suggest/:type',
  },
] as RouteRecordOption[]
