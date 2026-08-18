import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },
  rules: {
    'ts/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'no-console': 'off',
  },
  ignores: [
    'dist/**',
    'node_modules/**',
    'logs/**',
    'coverage/**',
  ],
})
