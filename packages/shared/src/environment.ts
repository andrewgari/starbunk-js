import { config as configDotenv } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment configuration abstraction that loads and validates environment variables.
 * This is the central place to access all environment variables and ensures type safety.
 */

// Find the .env file - look in repository root, not current working directory
const repoRoot = path.resolve(__dirname, '../../../'); // Go up from packages/shared/src to repo root
const envPath = path.resolve(repoRoot, '.env');
const envExists = fs.existsSync(envPath);

// Log whether the .env file exists
console.log(`[Environment] Looking for .env file at: ${envPath}`);
console.log(`[Environment] .env file exists: ${envExists}`);

// Load environment variables from .env file - looking in project root
const _result = configDotenv({ path: envPath });
console.log(`[Environment] .env file loaded successfully: ${_result.parsed ? 'Yes' : 'No'}`);

// Log available environment variables for debugging
console.log('[Environment] Environment variables loaded:');
console.log(`[Environment] - STARBUNK_TOKEN: ${process.env.STARBUNK_TOKEN ? 'Set' : 'Not set'}`);
console.log(`[Environment] - SNOWBUNK_TOKEN: ${process.env.SNOWBUNK_TOKEN ? 'Set' : 'Not set'}`);
console.log(`[Environment] - DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`[Environment] - OLLAMA_API_URL: ${process.env.OLLAMA_API_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`[Environment] - QDRANT_URL: ${process.env.QDRANT_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - DEBUG_MODE: ${process.env.DEBUG_MODE}`);
console.log(`[Environment] - TESTING_SERVER_IDS: ${process.env.TESTING_SERVER_IDS || 'Not set'}`);
console.log(`[Environment] - TESTING_CHANNEL_IDS: ${process.env.TESTING_CHANNEL_IDS || 'Not set'}`);
console.log(`[Environment] - NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log(`[Environment] - Is Debug Mode Active: ${isDebugMode()}`);

// Detect Jest test environment
const isJest = !!process.env.JEST_WORKER_ID;
// Additional environment heuristics
const isJestArg = (process.argv || []).some((a) => typeof a === 'string' && a.toLowerCase().includes('jest'));

const isCI = process.env.CI === 'true';
const isNpmTest = process.env.npm_lifecycle_event === 'test';
const isTestLike = isJest || isJestArg || isNpmTest || process.env.NODE_ENV === 'test' || isCI;

// Diagnostics for test detection
console.log(
	`[Environment] Diagnostics: NODE_ENV=${process.env.NODE_ENV}, isJest=${isJest}, isNpmTest=${isNpmTest}, isCI=${isCI}, isTestLike=${isTestLike}`,
);

// --- Start Validation ---
if (!process.env.STARBUNK_TOKEN) {
	// Allow missing token in test-like, CI, or any non-production context
	if (isTestLike || process.env.NODE_ENV !== 'production') {
		console.warn('[Environment] TEST/DEV MODE: STARBUNK_TOKEN not set; using dummy token');
		process.env.STARBUNK_TOKEN = 'test-token';
	} else {
		console.error('[Environment] FATAL: Required environment variable STARBUNK_TOKEN is not set.');
		process.exit(1);
	}
}
// Add other critical variable checks here if needed
// --- End Validation ---

// Helper function to check debug mode (updated to use DEBUG_MODE)
export function isDebugMode(): boolean {
	return process.env.DEBUG_MODE === 'true';
}

// Helper function to set debug mode (for tests or runtime changes)
export function setDebugMode(value: boolean): void {
	process.env.DEBUG_MODE = value ? 'true' : 'false';
}

// Export default object with environment variables
const environment = {
	app: {
		DEBUG_MODE: process.env.DEBUG_MODE,
		TESTING_SERVER_IDS: process.env.TESTING_SERVER_IDS,
		TESTING_CHANNEL_IDS: process.env.TESTING_CHANNEL_IDS,
		NODE_ENV: process.env.NODE_ENV,
		LOG_LEVEL: process.env.LOG_LEVEL,
		BOT_WHITELIST_IDS: process.env.BOT_WHITELIST_IDS,
		INVERSE_BEHAVIOR_BOTS: process.env.INVERSE_BEHAVIOR_BOTS,
	},
	discord: {
		STARBUNK_TOKEN: process.env.STARBUNK_TOKEN,
		SNOWBUNK_TOKEN: process.env.SNOWBUNK_TOKEN,
		WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
		GUILD_ID: process.env.GUILD_ID,
		STARBUNK_CLIENT_ID: process.env.STARBUNK_CLIENT_ID,
		COVA_USER_ID: process.env.COVA_USER_ID,
	},
	llm: {
		OPENAI_DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL,
		OLLAMA_API_URL: process.env.OLLAMA_API_URL,
		OLLAMA_AUTO_PULL_MODELS: process.env.OLLAMA_AUTO_PULL_MODELS,
		OLLAMA_PULL_ON_STARTUP: process.env.OLLAMA_PULL_ON_STARTUP,
		OLLAMA_PULL_TIMEOUT_MS: process.env.OLLAMA_PULL_TIMEOUT_MS,
		GEMINI_DEFAULT_MODEL: process.env.GEMINI_DEFAULT_MODEL,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
	},
	database: {
		DATABASE_URL: process.env.DATABASE_URL,
		POSTGRES_DB: process.env.POSTGRES_DB,
		POSTGRES_USER: process.env.POSTGRES_USER,
		POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
		POSTGRES_PORT: process.env.POSTGRES_PORT,
	},
	qdrant: {
		QDRANT_URL: process.env.QDRANT_URL,
		QDRANT_API_KEY: process.env.QDRANT_API_KEY,
		QDRANT_SEARCH_LIMIT: process.env.QDRANT_SEARCH_LIMIT,
		QDRANT_SIMILARITY_THRESHOLD: process.env.QDRANT_SIMILARITY_THRESHOLD,
		QDRANT_BATCH_SIZE: process.env.QDRANT_BATCH_SIZE,
	},
	embedding: {
		EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
		EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
		EMBEDDING_BATCH_SIZE: process.env.EMBEDDING_BATCH_SIZE,
		EMBEDDING_CACHE_SIZE: process.env.EMBEDDING_CACHE_SIZE,
		EMBEDDING_TIMEOUT: process.env.EMBEDDING_TIMEOUT,
		PERSONALITY_COLLECTION: process.env.PERSONALITY_COLLECTION,
		CONVERSATION_COLLECTION: process.env.CONVERSATION_COLLECTION,
		MEMORY_COLLECTION: process.env.MEMORY_COLLECTION,
	},
	observability: {
		ENABLE_METRICS: process.env.ENABLE_METRICS,
		ENABLE_STRUCTURED_LOGGING: process.env.ENABLE_STRUCTURED_LOGGING,
		ENABLE_RUNTIME_METRICS: process.env.ENABLE_RUNTIME_METRICS,
		METRICS_PUSH_INTERVAL: process.env.METRICS_PUSH_INTERVAL,
		LOG_FORMAT: process.env.LOG_FORMAT,
		CIRCUIT_BREAKER_THRESHOLD: process.env.CIRCUIT_BREAKER_THRESHOLD,
		HTTP_TIMEOUT: process.env.HTTP_TIMEOUT,
		HTTP_MAX_REQUEST_SIZE: process.env.HTTP_MAX_REQUEST_SIZE,
		METRICS_AUTH_TOKEN: process.env.METRICS_AUTH_TOKEN,
		PROMETHEUS_URL: process.env.PROMETHEUS_URL,
		GRAFANA_URL: process.env.GRAFANA_URL,
		LOKI_URL: process.env.LOKI_URL,
		PROMETHEUS_PUSHGATEWAY_URL: process.env.PROMETHEUS_PUSHGATEWAY_URL,
		BUNKBOT_METRICS_PORT: process.env.BUNKBOT_METRICS_PORT,
		BUNKBOT_HEALTH_PORT: process.env.BUNKBOT_HEALTH_PORT,
		COVABOT_METRICS_PORT: process.env.COVABOT_METRICS_PORT,
		COVABOT_HEALTH_PORT: process.env.COVABOT_HEALTH_PORT,
		DJCOVA_METRICS_PORT: process.env.DJCOVA_METRICS_PORT,
		DJCOVA_HEALTH_PORT: process.env.DJCOVA_HEALTH_PORT,
		STARBUNK_DND_METRICS_PORT: process.env.STARBUNK_DND_METRICS_PORT,
		STARBUNK_DND_HEALTH_PORT: process.env.STARBUNK_DND_HEALTH_PORT,
	},
	e2e: {
		E2E_TEST_WEBHOOK_URL: process.env.E2E_TEST_WEBHOOK_URL,
		E2E_TEST_SERVER_ID: process.env.E2E_TEST_SERVER_ID,
		E2E_TEST_CHANNEL_ID: process.env.E2E_TEST_CHANNEL_ID,
		E2E_MONITOR_TOKEN: process.env.E2E_MONITOR_TOKEN,
		E2E_ALLOW_WEBHOOK_TESTS: process.env.E2E_ALLOW_WEBHOOK_TESTS,
		E2E_TIMEOUT_MS: process.env.E2E_TIMEOUT_MS,
		E2E_DELAY_MS: process.env.E2E_DELAY_MS,
		E2E_INCLUDE_CHANCE_BOTS: process.env.E2E_INCLUDE_CHANCE_BOTS,
		E2E_CHANCE_ATTEMPTS: process.env.E2E_CHANCE_ATTEMPTS,
		E2E_FAILURE_THRESHOLD: process.env.E2E_FAILURE_THRESHOLD,
	},
	infrastructure: {
		AI_SERVICE_IP: process.env.AI_SERVICE_IP,
		DATABASE_IP: process.env.DATABASE_IP,
		OBSERVABILITY_IP: process.env.OBSERVABILITY_IP,
	},
};

// Export the environment object as frozen to prevent modifications
export default Object.freeze(environment);
