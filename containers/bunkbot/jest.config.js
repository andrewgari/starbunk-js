module.exports = {
	displayName: 'bunkbot',
	preset: 'ts-jest',
	testEnvironment: 'node',
	// Support both co-located tests and centralized integration tests
	testMatch: [
		'<rootDir>/tests/**/*.test.ts',      // Integration/bootstrap tests
		'<rootDir>/src/**/*.test.ts',        // Co-located unit tests
		'<rootDir>/src/**/__tests__/**/*.test.ts' // Co-located unit tests in __tests__ dirs
	],
	// E2E tests have longer timeouts
	testTimeout: 30000,
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
	// Force test environment variables to override CI/CD settings
	setupFiles: ['<rootDir>/tests/jest-env-setup.js'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/index*.ts',
		'!src/**/*.test.ts',                 // Exclude test files from coverage
		'!src/**/__tests__/**',              // Exclude test directories from coverage
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@starbunk/shared$': '<rootDir>/../shared/src/index.ts',
	},
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
};
