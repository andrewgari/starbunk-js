const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  // Override setup files for E2E tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest-e2e-setup.js'
  ],
  // Only run E2E tests
  testMatch: [
    '<rootDir>/src/__tests__/**/bunkbot-live-e2e.test.ts'
  ],
  // Longer timeout for live Discord interactions
  testTimeout: 30000,
  // Run tests serially to avoid Discord rate limits
  maxWorkers: 1,
  // Preserve environment variables
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false
};
