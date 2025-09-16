// Root Jest configuration for container orchestration
// Individual containers have their own Jest configs
module.exports = {
	projects: [
		'<rootDir>/containers/shared',
		'<rootDir>/containers/bunkbot',
		'<rootDir>/containers/djcova',
		'<rootDir>/containers/starbunk-dnd',
		'<rootDir>/containers/covabot'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'clover', 'html'],
	collectCoverageFrom: [
		'containers/*/src/**/*.ts',
		'!containers/*/src/**/*.d.ts',
		'!containers/*/src/**/index*.ts',
		'!containers/*/src/**/__tests__/**',
		'!containers/*/src/**/__mocks__/**',
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
