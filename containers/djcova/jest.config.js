module.exports = {
	displayName: 'djcova',
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['<rootDir>/tests/**/*.test.ts'],
	setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/index*.ts',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@starbunk/shared$': '<rootDir>/../shared/src/index.ts',
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
