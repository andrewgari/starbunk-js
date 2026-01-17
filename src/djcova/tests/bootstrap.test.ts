import { validateEnvironment } from '../src/utils';

// Basic test for DJCova container bootstrap
describe('DJCova Container', () => {
	it('should have minimal bootstrap functionality', () => {
		// Test that the utils can be imported without errors
		expect(validateEnvironment).toBeDefined();
	});

	it('should not require database dependencies', () => {
		// DJCova should work without database
		const originalDb = process.env.DATABASE_URL;
		const originalToken = process.env.STARBUNK_TOKEN;
		delete process.env.DATABASE_URL;
		process.env.STARBUNK_TOKEN = 'test-token';

		expect(() => {
			validateEnvironment({
				required: ['STARBUNK_TOKEN'],
				optional: ['DEBUG'],
			});
		}).not.toThrow();

		// Restore environment
		if (originalDb) {
			process.env.DATABASE_URL = originalDb;
		}
		if (originalToken) {
			process.env.STARBUNK_TOKEN = originalToken;
		} else {
			delete process.env.STARBUNK_TOKEN;
		}
	});
});
