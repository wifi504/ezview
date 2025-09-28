import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  javascript: true,
  markdown: true,
  json: true,
  yaml: true,
  rules: {
    // 允许使用console.log()
    'no-console': 'off',
    // Vue组件的风格
    'vue/block-order': ['error', {
      order: ['template', 'script', 'style'],
    }],
    // 禁止在条件语句中赋值，相当于避免你if (a = 5)，必须得赋值的情况下，加括号 if ((a = b))
    'no-cond-assign': ['error', 'except-parens'],
    // Vue模板里面的组件统一用短横线命名法
    'vue/component-name-in-template-casing': ['error', 'kebab-case', {
      registeredComponentsOnly: false,
    }],
    // 允许在必要的时候使用显示的 any 类型，但是仍然不建议，不要把TypeScript写成AnyScript啊
    '@typescript-eslint/no-explicit-any': 'off',
    // 启用真括号风格，允许 } 后不换行，并且允许单行使用：if (x) { foo() } else { bar() }
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'style/brace-style': 'off',
    // 允许写 /* eslint-disable */ 时不指定规则名
    'eslint-comments/no-unlimited-disable': 'off',
    // 多行语句不可以省略大括号
    'curly': ['error', 'multi-line'],
    // if 后可以不换行
    'antfu/if-newline': 'off',
    'style/max-statements-per-line': 'off',
  },
})
