import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			// Match tsconfig path alias: "@/*" -> "./src/*"
			'@': path.resolve(__dirname, 'src'),
			// Map @starbunk/shared to the built dist files for testing
			'@starbunk/shared': path.resolve(__dirname, '../shared/dist/index.js'),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html'],
			include: [
				'src/**/*.ts',
			],
			exclude: [
				'src/**/*.d.ts',
				'src/index*.ts',
				'src/**/*.test.ts',
				'src/**/__tests__/**',
			],
		},
	},
});

