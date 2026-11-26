import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import nxEslintPlugin from '@nx/eslint-plugin';
import maxParamsNoConstructor from 'eslint-plugin-max-params-no-constructor';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'];
const jsFiles = ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'];
const scoped = (configs, files) => configs.map((config) => ({ ...config, files }));

export default [
  {
    // Example projects are standalone demos with relaxed rules (console.* etc.).
    ignores: ['**/dist', '**/out-tsc', '**/packages/*/examples/**'],
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
  ...scoped(
    [...nxEslintPlugin.configs['flat/typescript'], js.configs.recommended, ...tseslint.configs.recommended],
    tsFiles,
  ),
  {
    files: tsFiles,
    plugins: {
      // Unmaintained (0.0.4) and calls context APIs removed in ESLint 10; fixupPluginRules restores them.
      'max-params-no-constructor': fixupPluginRules(maxParamsNoConstructor),
      'simple-import-sort': simpleImportSort,
    },
    rules: {
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
  },
  ...scoped(nxEslintPlugin.configs['flat/javascript'], jsFiles),
  { files: jsFiles, rules: { 'no-extra-semi': 'off' } },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx'],
    languageOptions: { globals: globals.jest },
  },
  {
    // Preserve the ESLint 9 policy while upgrading the engine: these rules joined
    // `recommended` (or changed defaults) in v10; adopting them is a separate policy change.
    files: [...tsFiles, ...jsFiles],
    rules: {
      'no-unassigned-vars': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'no-shadow-restricted-names': ['error', { reportGlobalThis: false }],
    },
  },
  {
    // Nx converts Jest configs to CommonJS (`module.exports` / `require`).
    files: ['**/jest.config.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['dist', 'build'],
  },
];
