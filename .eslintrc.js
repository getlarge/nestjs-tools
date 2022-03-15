module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    jest: true,
  },
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json'],
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'unused-imports',
    'import',
    'max-params-no-constructor',
    'simple-import-sort',
  ],
  // ignorePatterns: ['**/*', '**/openapi.json'],
  ignorePatterns: ['**/fixtures/*', '**/dist'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:sonarjs/recommended',
  ],
  root: true,
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'arrow-parens': 'off',
    complexity: 'error',
    'interface-name': 'off',
    'max-depth': 'error',
    'max-lines': ['error', { max: 400 }],
    'max-lines-per-function': ['error', { max: 50 }],
    'max-nested-callbacks': ['error', { max: 3 }],
    'max-params': ['error', 10],
    'max-params-no-constructor/max-params-no-constructor': ['error', 4],
    'member-access': 'off',
    'no-console': ['error', { allow: ['error', 'warn', 'info', 'table'] }],
    'no-duplicate-imports': 'error',
    'no-empty': 'error',
    'no-fallthrough': 'error',
    'no-param-reassign': 'error',
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',
    'no-var': 'error',
    'object-literal-sort-keys': 'off',
    'prefer-const': 'error',
    quotes: ['warn', 'single', { avoidEscape: true }],
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Side effects.
          ['^\\u0000'],
          // 3rd party.
          ['^@?\\w'],
          // Anything not fitting group above.
          ['^'],
          // Relative imports.
          ['^\\.'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
  },
};
