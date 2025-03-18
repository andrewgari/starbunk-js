module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: [
		'**/macaroniBot.test.ts',
		'**/bananaBot.test.ts',
		'**/checkBot.test.ts',
		'**/time.test.ts',
		'**/interruptBot.test.ts',
		'**/*.e2e.test.ts'
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
