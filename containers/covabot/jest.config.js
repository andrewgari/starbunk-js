module.exports = {
	displayName: 'covabot',
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
		'^@xenova/transformers$': '<rootDir>/tests/mocks/transformers.ts',
	},
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				isolatedModules: true,
			},
		],
	},
	transformIgnorePatterns: ['node_modules/(?!@xenova/transformers)'],
};
