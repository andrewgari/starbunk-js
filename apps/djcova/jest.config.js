module.exports = {
	displayName: 'djcova',
	preset: 'ts-jest',
	testEnvironment: 'node',
	// Support both co-located tests and centralized integration tests
	testMatch: [
		'<rootDir>/tests/**/*.test.ts',      // Integration/bootstrap tests
		'<rootDir>/src/**/*.test.ts',        // Co-located unit tests
		'<rootDir>/src/**/__tests__/**/*.test.ts' // Co-located unit tests in __tests__ dirs
	],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/index*.ts',
		'!src/**/*.test.ts',                 // Exclude test files from coverage
		'!src/**/__tests__/**',              // Exclude test directories from coverage
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@starbunk/shared$': '<rootDir>/../../packages/shared/src/index.ts',
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				isolatedModules: true,
			},
		],
	},
};
