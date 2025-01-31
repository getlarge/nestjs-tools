export default {
  displayName: 'nestjs-tools-async-local-storage',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/async-local-storage',
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 25,
      functions: 30,
      lines: 40,
    },
  },
};
