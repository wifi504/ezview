# vue-component-resolvers

Vue 组件自动导入插件 ( `unplugin-vue-components` ) 的 `Resolver` 拓展

### 安装与使用

1. 安装

   ```bash
   npm i @ezview/vue-component-resolvers --dev
   ```

   ```bash
   pnpm i @ezview/vue-component-resolvers -D
   ```

2. 使用

   ```typescript
   import Components from 'unplugin-vue-components/xxx'
   
   import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
   import { VIconsResolver } from '@ezview/vue-component-resolvers'
   
   
   // 在你所使用的打包工具的插件配置处配置，参考：
   const plugins = [
       vue(),
       Components({
           dirs: ['src/components'],
           extensions: ['vue'],
           deep: true,
           dts: 'src/components.d.ts',
           resolvers: [
               NaiveUiResolver(),
               VIconsResolver(),
           ],
       }),
   ]
   ```

   

### 现已支持

- [X-Icons](https://www.xicons.org)

  匹配这样的格式：`<ViLibraryComponentName />`

  自动解析成：`typeof import('@vicons/library')['ComponentName']`

- 敬请期待...

### 其他

欢迎提issue或pr，本插件专门收集各种冷门组件库的自动导入