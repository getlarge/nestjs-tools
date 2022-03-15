module.exports = {
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(css-wipe|@wf-titan/kashyyyk-theme|@inferno/effigy))'],
  testPathIgnorePatterns: ['/node_modules/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/test/', '/fixtures/'],
  testEnvironment: 'node',
  maxConcurrency: 2,
  moduleFileExtensions: ['js', 'ts', 'node'],
};
