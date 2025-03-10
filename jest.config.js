module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: [
		'**/macaroniBot.test.ts',
		'**/bananaBot.test.ts',
		'**/checkBot.test.ts',
		'**/time.test.ts'
	],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			isolatedModules: true // This helps with type issues in tests
		}]
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
};
