export default {
  displayName: 'nestjs-tools-fastify-upload',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '/node_modules/path-to-regexp/.+\\.js$': '<rootDir>/../../tools/jest/esm-to-cjs.transformer.js',
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/fastify-upload',
};
