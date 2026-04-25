import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Run all test files sequentially — Discord rate limits and shared bot state
    // mean parallel execution produces flaky results
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    passWithNoTests: true,
    include: ['src/tests/**/*.e2e.test.ts'],
    globalSetup: ['src/setup/global-setup.ts'],
    reporters: [
      'default',
      ['junit', { outputFile: path.resolve(__dirname, '../../test-results/e2e.junit.xml') }],
    ],
  },
});
