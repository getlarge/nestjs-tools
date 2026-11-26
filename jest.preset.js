const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  coverageReporters: ['json', 'lcov'],
  // ESM-only dependencies that must be transpiled to CommonJS for Jest.
  // Projects loading them must map them to tools/jest/esm-to-cjs.transformer.js first.
  transformIgnorePatterns: ['^(?!.*/node_modules/path-to-regexp/).*/node_modules/'],
};
