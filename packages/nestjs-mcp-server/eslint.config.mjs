import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';
import baseConfig from '../../eslint.config.mjs';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    // Example projects are standalone demos, not part of the published library.
    // They use a more relaxed style (console.* for stdout logging, ad-hoc setup).
    ignores: ['**/dist', 'examples/**'],
  },
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {},
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {},
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {},
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          buildTargets: ['build'],
          checkMissingDependencies: true,
          checkObsoleteDependencies: true,
          checkVersionMismatches: true,
          // cacheable is ESM-only ("type": "module"); the nx 20.4 dependency
          // analyzer doesn't always detect ESM imports through TS sources,
          // so we declare it as an ignored entry to keep the peer dep in
          // package.json without lint failures.
          ignoredDependencies: ['cacheable'],
          // The examples/ subdirectory is excluded from the published package
          // (publish reads dist/packages/nestjs-mcp-server) and from the nx
          // workspace (packages/* glob, not packages/**). Its standalone demo
          // projects bring their own package.json with their own deps, so
          // ignore them when checking the library's dependency declarations.
          ignoredFiles: ['{projectRoot}/examples/**/*'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
