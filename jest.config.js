module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	// Use standard patterns for finding tests
	testMatch: [
		'**/__tests__/**/*.test.ts',
		'**/strategy-bots/**/*.test.ts'
	],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/bunkbot.ts',
		'!src/**/index.ts',
		'!src/tests/**',
		'!src/**/__tests__/**',
		'!src/**/__mocks__/**'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'clover', 'html'],
	// Only exclude tests with complex external dependencies like LLM services
	testPathIgnorePatterns: [
		'node_modules/',
		// Tests needing special mocks for external services
		// blueBot.test.ts depends on LLM service which is complex to mock
		'blueBot\\.test\\.ts',
	],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			// This helps with type issues in tests
			isolatedModules: true
		}]
	},
	// Transform ESM modules in node_modules that use 'export' syntax
	transformIgnorePatterns: [
		'/node_modules/(?!@xenova/transformers)/'
	],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	}
};
