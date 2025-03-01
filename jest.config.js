module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src', '<rootDir>/examples'],
	testMatch: [
		'**/tests/**/*.ts',
		'**/?(*.)+(spec|test).ts',
		'**/src/starbunk/bots/reply-bots/**/*.test.ts'
	],
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1'
	},
	setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
	moduleDirectories: ['node_modules', 'src'],
	testPathIgnorePatterns: [
		'<rootDir>/src/tests/mocks/',
		'<rootDir>/src/tests/helpers/',
		'<rootDir>/src/tests/types/',
		'<rootDir>/src/tests/setup.ts'
	]
};
