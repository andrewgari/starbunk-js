import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			// Match tsconfig path alias: "@/*" -> "./src/*"
			'@': path.resolve(__dirname, 'src'),
			// Map @starbunk/shared to the source files for testing
			'@starbunk/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
			'@starbunk/shared/dist': path.resolve(__dirname, '../../packages/shared/src'),
			// Mock transformers for testing
			'@xenova/transformers': path.resolve(__dirname, 'tests/mocks/transformers.ts'),
		},
	},
	test: {
		environment: 'node',
		globals: true,
		// Support both co-located tests and centralized integration tests
		include: [
			'tests/**/*.test.ts',      // Integration/bootstrap tests
			'src/**/*.test.ts',        // Co-located unit tests
			'src/**/__tests__/**/*.test.ts' // Co-located unit tests in __tests__ dirs
		],
		setupFiles: ['./tests/setup.ts'],
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

