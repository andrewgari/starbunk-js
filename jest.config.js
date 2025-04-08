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
	// Setting minimum coverage goals - adjust these numbers upward over time
	coverageThreshold: {
		global: {
			branches: 10,
			functions: 13,
			lines: 18,
			statements: 17
		}
	},
	// Only exclude tests with complex external dependencies like LLM services
	testPathIgnorePatterns: [
		'node_modules/',
		// Tests needing special mocks for external services
		// blueBot.test.ts depends on LLM service which is complex to mock
		'blueBot\\.test\\.ts',
	],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			isolatedModules: true
		}]
	},
	transformIgnorePatterns: [
		'node_modules/(?!@xenova/transformers)'
	],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		// Mock @xenova/transformers for tests
		'^@xenova/transformers$': '<rootDir>/src/tests/mocks/transformers.ts'
	}
};
