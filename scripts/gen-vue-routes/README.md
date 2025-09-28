# Vue 路由配置自动化生成工具

使用本工具，可以轻松帮你把项目里所有视图组件转化成 Vue Router 配置文件，并且你还可以做自定义增量配置！

**注意**：开始之前，将默认你会以传统方式使用 Vue Router，如遇问题，可以参阅此文档学习：[入门 | Vue Router (vuejs.org)](https://router.vuejs.org/zh/guide/)

## 使用方式

### Step 1 安装

1. 运行如下命令之一即可

   ```bash
   npm i @ezview/gen-vue-routes --dev
   ```

   ```bash
   pnpm i @ezview/gen-vue-routes -D
   ```

2. 然后在你需要使用此工具的项目 `package.json` 文件的 `scripts` 中添加

   ```json
   "gen-routes": "gen-vue-routes"
   ```

   当然，你也可以直接在终端运行 `gen-vue-routes`

### Step 2 准备目录结构

1. 在你的项目 `src/router` 目录下准备如下三个文件

   - `index.js` ：导出 `router`

   - `routes.ts` ：配置 `router` 时传入的 `routes`

   - `options.ts` ：对 `routes` 的增量配置

2. 初始化 `routes.ts`，直接复制如下内容填入

   ```typescript
   export default []
   ```

3. 初始化 `options.ts`，直接复制如下内容填入

   ```typescript
   import type { RouteRecordOption } from '@ezview/gen-vue-routes'

   export default [] as RouteRecordOption[]
   ```

4. 配置 `index.js` ，根据你的实际项目来，相当于把原来你写 `routes` 的地方移到了外面

   ```typescript
   import { createRouter, createWebHistory } from 'vue-router'
   import routes from '@/router/routes.ts'

   const router = createRouter({
     history: createWebHistory('/'),
     routes,
   })

   export default router
   ```

5. 开始组织你的视图组件，这些页面要放置在 `src/views` 目录下，路由指向的入口必须是 `Index.vue` 组件，文件夹名就是该路由的 `path`，支持多级目录自动对应多级子路由，这里提供一个演示结构：

   ```
   views
   │  Index.vue
   │
   ├─ai-revise
   │  │  Index.vue
   │  │
   │  ├─home
   │  │  Index.vue
   │  │
   │  └─suggest
   │     Index.vue
   │
   ├─ai-simulation
   │  │  Index.vue
   │  │
   │  ├─home
   │  │  Index.vue
   │  │
   │  └─room
   │     Index.vue
   │
   └─login
       Index.vue
   ```

   在这个演示结构里，有首页、AI简历修改页、AI模拟面试页、登录页，同时，这两个AI页面还分别有自己的子页面。

### Step 3 生成路由配置

此时我们运行 [Step 1](#Step 1 安装) 的脚本，可以看到如下输出：

```
> gen-vue-routes

Vue Router 路由配置生成器(v1.1) Powered By WIFI连接超时
[1/7] 从"src/views/"解析视图入口组件
 - Index.vue
 - ai-revise/Index.vue
 - ai-simulation/Index.vue
 - login/Index.vue
 - ai-revise/home/Index.vue
 - ai-revise/suggest/Index.vue
 - ai-simulation/home/Index.vue
 - ai-simulation/room/Index.vue
[2/7] 构建目录树
[3/7] 基于目录树生成 routes 的 AST
[4/7] 合并路由增强配置"/router/options.ts"
 - 未发现可合并的自定义配置，或 options.ts 文件为空，跳过此步骤
[5/7] 编译抽象语法树生成最终 routes
[6/7] 代码格式化 && ESLint --fix"
[7/7] 写入文件
Done!
```

接下来打开 `route.ts` 文件，可以看到已经正确生成了配置：

```typescript
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
        path: 'suggest',
        component: () => import('@/views/ai-revise/suggest/Index.vue'),
      },
    ],
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
  },
  {
    path: '/login',
    component: () => import('@/views/login/Index.vue'),
  },
] as RouteRecordRaw[]
```

   ### Step 4 增强配置

很显然，当前状态下我们只维护了组件位置和路由地址的映射关系，我们的路由往往还会配置更多的属性，比如名字、元数据、重定向等等，这时，我们只需要把这些需要单独配置的配置项给放置到 `options.ts` 即可

举个例子，我希望这两个AI页面能自动跳转到自己的首页，同时登录页能有自己的名字，AI修改建议这个子页面要支持动态路由参数，那么我们只需要在 `options.ts` 中填写如下内容：

```typescript
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
    path: '/ai-revise/suggest/:type'
  }
] as RouteRecordOption[]
```

继续运行脚本，可以看到我们得到了最终的 `routes` 如下：

```typescript
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
] as RouteRecordRaw[]
```

**注意事项：**一般项目的 `views` 目录结构完全可以和 `routes` 配置看作是重复代码，所以才设计此工具解决此问题，避免了不小心配置错组件位置导致页面无法显示，解决了修改了目录结构后发现几乎要重新检查 `routes` 的痛点，因此，如果你在 `options.ts` 中配置 `component` 字段，只要你指定的 `path` 在你的 `views` 中能正常找到，在应用增强配置时会忽略你指定的 `component`，如果找不到，会在最终 `routes` 新增一个节点。
