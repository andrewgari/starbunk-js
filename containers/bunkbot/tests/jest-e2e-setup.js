// Jest E2E environment setup - preserves DEBUG_MODE for live testing
// This file is specifically for live E2E tests that need to interact with real Discord

console.log('[E2E Jest Setup] Preserving environment for live Discord testing');

// For E2E tests, we want to preserve the actual environment settings
// Do NOT override DEBUG_MODE - let it use the real .env values

// Only set test-specific overrides that don't interfere with Discord
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Ensure E2E testing is enabled
process.env.E2E_TEST_ENABLED = 'true';

console.log('[E2E Jest Setup] Environment preserved for live testing');
console.log('[E2E Jest Setup] DEBUG_MODE:', process.env.DEBUG_MODE);
console.log('[E2E Jest Setup] E2E_TEST_ENABLED:', process.env.E2E_TEST_ENABLED);
console.log('[E2E Jest Setup] TESTING_SERVER_IDS:', process.env.TESTING_SERVER_IDS);
console.log('[E2E Jest Setup] TESTING_CHANNEL_IDS:', process.env.TESTING_CHANNEL_IDS);
