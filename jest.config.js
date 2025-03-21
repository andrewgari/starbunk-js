module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	// Use standard patterns for finding tests
	testMatch: [
		'**/__tests__/**/*.test.ts'
	],
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
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	}
};
