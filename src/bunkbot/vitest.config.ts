import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@starbunk/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    reporters: [
      'default',
      [
        'junit',
        {
          outputFile: path.resolve(__dirname, '../../test-results/bunkbot.junit.xml'),
        },
      ],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
    },
  },
});
