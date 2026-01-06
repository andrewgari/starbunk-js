// Basic test for Starbunk-DND container bootstrap
describe('Starbunk-DND Container', () => {
	it('should have minimal bootstrap functionality', () => {
		// Test that the container can be imported without errors
		expect(() => {
			require('../src/index');
		}).not.toThrow();
	});

	it('should handle optional Snowbunk token', () => {
		// Should work with or without Snowbunk token
		const originalSnowbunk = process.env.SNOWBUNK_TOKEN;
		delete process.env.SNOWBUNK_TOKEN;

		expect(() => {
			const { validateEnvironment } = require('@starbunk/shared');
			validateEnvironment({
				required: ['STARBUNK_TOKEN'],
				optional: ['SNOWBUNK_TOKEN', 'DATABASE_URL', 'OPENAI_API_KEY'],
			});
		}).not.toThrow();

		// Restore environment
		if (originalSnowbunk) {
			process.env.SNOWBUNK_TOKEN = originalSnowbunk;
		}
	});
});
