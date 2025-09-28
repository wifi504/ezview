# ESLint Config

基于 @antfu/eslint-config 封装的相对宽松的 eslint-config

## 使用方式

1. 先确保环境里有 `eslint`

   ```bash
   npm i eslint --dev
   ```

   ```bash
   pnpm i eslint -D
   ```

2. 安装依赖

   ```bash
   npm i @ezview/eslint-config --dev
   ```

   ```bash
   pnpm i @ezview/eslint-config -D
   ```

3. 完成配置

   创建 `eslint.config.js` 文件

   填入如下内容：

   ```js
   export { default } from '@ezview/eslint-config'
   ```
