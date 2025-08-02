// Jest environment setup - runs before all tests
// This file forces specific environment variables to override CI/CD settings

// Force DEBUG_MODE to false for all tests to ensure consistent behavior
process.env.DEBUG_MODE = 'false';
process.env.NODE_ENV = 'test';

// Ensure other test environment variables are set
process.env.STARBUNK_TOKEN = 'test_token';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Also use the setDebugMode function from shared library to ensure it's properly set
try {
	const { setDebugMode } = require('@starbunk/shared');
	setDebugMode(false);
	console.log('[Jest Setup] DEBUG_MODE forced to false using setDebugMode()');
} catch (error) {
	console.log('[Jest Setup] Could not import setDebugMode, using environment variable only');
}
