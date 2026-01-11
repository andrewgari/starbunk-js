// Jest environment setup - runs before all tests
// This file forces specific environment variables to override CI/CD settings

// AGGRESSIVE DEBUG_MODE OVERRIDE FOR CI/CD COMPATIBILITY
// The CI/CD environment sets DEBUG_MODE=true which breaks chance-based tests
// We need to override this at multiple levels to ensure it sticks

// First, delete any existing DEBUG_MODE to ensure clean slate
delete process.env.DEBUG_MODE;

// Force DEBUG_MODE to false for all tests to ensure consistent behavior
process.env.DEBUG_MODE = 'false';
process.env.NODE_ENV = 'test';

// Ensure other test environment variables are set
process.env.DISCORD_TOKEN = 'test_token';
process.env.CLIENT_ID = 'test_client_id';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Also use the setDebugMode function from shared library to ensure it's properly set
try {
	// Clear the require cache to force fresh import
	delete require.cache[require.resolve('@starbunk/shared')];

	const { setDebugMode, isDebugMode } = require('@starbunk/shared');
	setDebugMode(false);

	// Environment setup: DEBUG_MODE forced to false
} catch (error) {
	console.log('[Jest Setup] Could not import setDebugMode, using environment variable only');
	console.log('[Jest Setup] Error:', error.message);
}
