import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.ts',
      'src/**/__tests__/**/*.{test,spec}.ts',
    ],
    reporters: [
      'default',
      [
        'junit',
        {
          outputFile: path.resolve(__dirname, '../../test-results/shared.junit.xml'),
        },
      ],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
  },
});
