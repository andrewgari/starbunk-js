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
		const originalToken = process.env.DISCORD_TOKEN;
		const originalStarbunkToken = process.env.STARBUNK_TOKEN;

		delete process.env.DATABASE_URL;
		process.env.DISCORD_TOKEN = 'test-token';
		process.env.STARBUNK_TOKEN = 'test-starbunk-token';

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
			process.env.DISCORD_TOKEN = originalToken;
		} else {
			delete process.env.DISCORD_TOKEN;
		}
		if (originalStarbunkToken) {
			process.env.STARBUNK_TOKEN = originalStarbunkToken;
		} else {
			delete process.env.STARBUNK_TOKEN;
		}
	});
});
