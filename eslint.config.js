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
    'no-console': 'off',
  },
  ignores: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    'src/generated/**',
    'worker-configuration.d.ts',
  ],
}, {
  files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  rules: {
    'ts/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'ts/explicit-function-return-type': 'off',
  },
})
