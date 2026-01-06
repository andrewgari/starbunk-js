// Root Jest configuration for container orchestration
// Individual containers have their own Jest configs
module.exports = {
	projects: [
		'<rootDir>/packages/shared',
		'<rootDir>/apps/bunkbot',
		'<rootDir>/apps/djcova',
		'<rootDir>/apps/starbunk-dnd',
		'<rootDir>/apps/covabot',
		'<rootDir>/apps/bluebot'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'clover', 'html'],
	collectCoverageFrom: [
		'apps/*/src/**/*.ts',
		'packages/*/src/**/*.ts',
		'!apps/*/src/**/*.d.ts',
		'!packages/*/src/**/*.d.ts',
		'!apps/*/src/**/index*.ts',
		'!packages/*/src/**/index*.ts',
		'!apps/*/src/**/__tests__/**',
		'!packages/*/src/**/__tests__/**',
		'!apps/*/src/**/__mocks__/**',
		'!packages/*/src/**/__mocks__/**',
	],
	coverageThreshold: {
		global: {
			branches: 10,
			functions: 13,
			lines: 18,
			statements: 17,
		},
	},
};
