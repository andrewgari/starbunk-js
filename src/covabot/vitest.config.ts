import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@starbunk/shared/database': path.resolve(__dirname, '../shared/dist/services/database'),
      '@starbunk/shared/services/llm': path.resolve(__dirname, '../shared/dist/services/llm'),
      '@starbunk/shared/observability/log-layer': path.resolve(
        __dirname,
        '../shared/dist/observability/log-layer',
      ),
      '@starbunk/shared/observability': path.resolve(__dirname, '../shared/dist/observability'),
      '@starbunk/shared/*': path.resolve(__dirname, '../shared/dist'),
      '@starbunk/shared': path.resolve(__dirname, '../shared/dist'),
    },
  },
});
