// Pre-env setup for shared package tests
// This runs before modules are loaded so env is in place for imports
process.env.DISCORD_TOKEN = 'test_token';
process.env.CLIENT_ID = 'test_client_id';
process.env.NODE_ENV = 'test';
process.env.DEBUG = 'false';

// Ensure CI/tests do not attempt external pushes/log shipping
process.env.ENABLE_METRICS_PUSH = 'false';
process.env.ENABLE_STRUCTURED_LOGGING = 'false';
process.env.LOKI_URL = '';

// Use test-safe unified metrics defaults
process.env.UNIFIED_METRICS_HOST = '127.0.0.1';
process.env.UNIFIED_METRICS_PORT = '0'; // ephemeral port in tests
process.env.ENABLE_UNIFIED_HEALTH = 'false';

// Enable enhanced bot tracking for tests that assert it (explicit opt-in)
process.env.ENABLE_ENHANCED_BOT_TRACKING = 'true';
