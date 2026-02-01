import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests
 * Integration tests are run separately from unit tests
 */
export default defineConfig({
  resolve: {
    alias: {
      // Match tsconfig path alias: "@/*" -> "./src/*"
      '@': path.resolve(__dirname, 'src'),
      // Map @starbunk/shared to the source files for testing
      '@starbunk/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Include integration, contract, and e2e tests
    include: [
      'tests/**/*.integration.test.ts',
      'tests/**/*.contract.test.ts',
      'tests/**/*.e2e.test.ts',
      'src/**/*.integration.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index*.ts', 'src/**/*.test.ts', 'src/**/__tests__/**'],
    },
  },
});
