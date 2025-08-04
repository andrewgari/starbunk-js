module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  moduleNameMapper: {
    '^@starbunk/shared(.*)$': '<rootDir>/../shared/src$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
