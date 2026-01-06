// Basic test for BunkBot container bootstrap
describe('BunkBot Container', () => {
	it('should have minimal bootstrap functionality', () => {
		// Test that the container can be imported without errors
		expect(() => {
			require('../src/index');
		}).not.toThrow();
	});

	it('should validate environment correctly', () => {
		// Mock environment validation
		const originalEnv = process.env.STARBUNK_TOKEN;

		// Test missing token
		delete process.env.STARBUNK_TOKEN;
		expect(() => {
			const { validateEnvironment } = require('@starbunk/shared');
			validateEnvironment({
				required: ['STARBUNK_TOKEN'],
				optional: ['DATABASE_URL'],
			});
		}).toThrow();

		// Restore environment
		if (originalEnv) {
			process.env.STARBUNK_TOKEN = originalEnv;
		}
	});
});
