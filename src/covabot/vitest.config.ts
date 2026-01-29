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
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^@starbunk\/shared$/, replacement: path.resolve(__dirname, '../shared/src') },
      {
        find: /^@starbunk\/shared\/database$/,
        replacement: path.resolve(__dirname, '../shared/src/services/database'),
      },
      {
        find: /^@starbunk\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../shared/src/$1'),
      },
    ],
  },
});
