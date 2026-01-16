import { defineConfig } from 'vitest/config';
import path from 'path';

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
			'tests/**/*.test.ts',      // Integration/bootstrap tests
			'src/**/*.test.ts',        // Co-located unit tests
			'src/**/__tests__/**/*.test.ts' // Co-located unit tests in __tests__ dirs
		],
		exclude: [
			'node_modules',
			'dist',
			'src/testing/llm/**',  // Exclude LLM testing utilities (LLM services removed)
		],
		setupFiles: ['./tests/setup-env.ts', './tests/setup.ts'],
		// Run tests serially to avoid port/timer contention in integration suites
		pool: 'forks',
		singleFork: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html'],
			include: [
				'src/**/*.ts',
			],
			exclude: [
				'src/**/*.d.ts',
				'src/index.ts',
				'src/**/*.test.ts',
				'src/**/__tests__/**',
			],
		},
	},
});

