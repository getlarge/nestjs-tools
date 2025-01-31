export default {
  displayName: 'nestjs-tools-lock',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/lock',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 35,
      functions: 60,
      lines: 70,
    },
  },
};
