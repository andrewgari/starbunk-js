// Basic test for DJCova container bootstrap
describe('DJCova Container', () => {
	it('should have minimal bootstrap functionality', () => {
		// Test that the container can be imported without errors
		expect(() => {
			require('../src/index');
		}).not.toThrow();
	});

	it('should not require database dependencies', () => {
		// DJCova should work without database
		const originalDb = process.env.DATABASE_URL;
		delete process.env.DATABASE_URL;

		expect(() => {
			const { validateEnvironment } = require('@starbunk/shared');
			validateEnvironment({
				required: ['STARBUNK_TOKEN'],
				optional: ['DEBUG'],
			});
		}).not.toThrow();

		// Restore environment
		if (originalDb) {
			process.env.DATABASE_URL = originalDb;
		}
	});
});
