// eslint-disable-next-line @typescript-eslint/no-var-requires
const base = require('./jest.config.base.js');

module.exports = {
  ...base,
  projects: ['<rootDir>/packages/*/jest.config.js'],
  // collectCoverageFrom: ['<rootDir>/packages/*/src/**'],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 30,
      functions: 35,
      lines: 50,
    },
  },
  coverageDirectory: '<rootDir>/coverage/',
  moduleDirectories: ['node_modules'],
};
