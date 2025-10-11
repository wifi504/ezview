import type { RouteRecordRaw } from 'vue-router'
/**
 * Vue Router 路由配置自动生成(v1.1)
 * @author WIFI连接超时
 * 请不要编辑此文件，因为在重新运行生成脚本后会覆盖，自定义配置请写在 options.ts 中
 */
export default [
  {
    path: '/',
    component: () => import('@/views/Index.vue'),
  },
  {
    path: '/ai-revise',
    component: () => import('@/views/ai-revise/Index.vue'),
    children: [
      {
        path: 'home',
        component: () => import('@/views/ai-revise/home/Index.vue'),
      },
      {
        path: 'suggest/:type',
        component: () => import('@/views/ai-revise/suggest/Index.vue'),
      },
    ],
    redirect: '/ai-revise/home',
  },
  {
    path: '/ai-simulation',
    component: () => import('@/views/ai-simulation/Index.vue'),
    children: [
      {
        path: 'home',
        component: () => import('@/views/ai-simulation/home/Index.vue'),
      },
      {
        path: 'room',
        component: () => import('@/views/ai-simulation/room/Index.vue'),
      },
    ],
    redirect: '/ai-simulation/home',
  },
  {
    path: '/login',
    component: () => import('@/views/login/Index.vue'),
    name: 'login-page',
    meta: {
      title: '系统登录页',
    },
  },
  {
    path: '/request',
    component: () => import('@/views/request/Index.vue'),
  },
] as RouteRecordRaw[]
