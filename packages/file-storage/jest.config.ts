/* eslint-disable */
export default {
  displayName: 'nestjs-tools-file-storage',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/file-storage',
  coverageThreshold: {
    global: {
      statements: 35,
      branches: 10,
      functions: 15,
      lines: 30,
    },
  },
};
