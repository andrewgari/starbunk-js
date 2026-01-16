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
		include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html'],
		},
	},
});
