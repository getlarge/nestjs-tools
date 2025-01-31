import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';
import nxEslintPlugin from '@nx/eslint-plugin';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: ['**/dist'],
  },
  { plugins: { '@nx': nxEslintPlugin } },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...compat
    .config({
      extends: ['plugin:@nx/typescript', 'eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      plugins: [
        '@typescript-eslint/eslint-plugin',
        'unused-imports',
        'import',
        'max-params-no-constructor',
        'simple-import-sort',
      ],
    })
    .map((config) => ({
      ...config,
      files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
      rules: {
        ...config.rules,
        'arrow-parens': 'off',
        complexity: 'error',
        'interface-name': 'off',
        'max-depth': 'error',
        'max-lines': [
          'error',
          {
            max: 400,
          },
        ],
        'max-lines-per-function': [
          'error',
          {
            max: 50,
          },
        ],
        'max-nested-callbacks': [
          'error',
          {
            max: 3,
          },
        ],
        'max-params': ['error', 10],
        'max-params-no-constructor/max-params-no-constructor': ['error', 4],
        'member-access': 'off',
        'no-console': [
          'error',
          {
            allow: ['error', 'warn', 'info', 'table'],
          },
        ],
        'no-duplicate-imports': 'error',
        'no-empty': 'error',
        'no-fallthrough': 'error',
        'no-param-reassign': 'error',
        'no-unreachable': 'error',
        'no-unreachable-loop': 'error',
        'no-var': 'error',
        'object-literal-sort-keys': 'off',
        'prefer-const': 'error',
        quotes: [
          'warn',
          'single',
          {
            avoidEscape: true,
          },
        ],
        'simple-import-sort/imports': [
          'error',
          {
            groups: [['^\\u0000'], ['^@?\\w'], ['^'], ['^\\.']],
          },
        ],
        'simple-import-sort/exports': 'error',
        'no-extra-semi': 'off',
      },
    })),
  ...compat
    .config({
      extends: ['plugin:@nx/javascript'],
    })
    .map((config) => ({
      ...config,
      files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
      rules: {
        ...config.rules,
        'no-extra-semi': 'off',
      },
    })),
  ...compat
    .config({
      env: {
        jest: true,
      },
    })
    .map((config) => ({
      ...config,
      files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx'],
      rules: {
        ...config.rules,
      },
    })),
  {
    ignores: ['dist', 'build'],
  },
];
