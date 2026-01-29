import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Match tsconfig path alias: "@/*" -> "./src/*"
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // Support both co-located tests and centralized integration tests
    include: [
      'tests/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/testing/llm/**',
    ],
    // Run tests serially to avoid port/timer contention in integration suites
    pool: 'forks',
    singleFork: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/**/*.test.ts',
        'src/**/__tests__/**',
      ],
    },
  },
});
