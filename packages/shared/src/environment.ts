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
console.log(`[Environment] - DEBUG_MODE: ${process.env.DEBUG_MODE}`);
console.log(`[Environment] - TESTING_SERVER_IDS: ${process.env.TESTING_SERVER_IDS || 'Not set'}`);
console.log(`[Environment] - TESTING_CHANNEL_IDS: ${process.env.TESTING_CHANNEL_IDS || 'Not set'}`);
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
	},
	discord: {
		STARBUNK_TOKEN: process.env.STARBUNK_TOKEN,
		SNOWBUNK_TOKEN: process.env.SNOWBUNK_TOKEN,
		WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
	},
	llm: {
		OPENAI_DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL,
		OLLAMA_API_URL: process.env.OLLAMA_API_URL,
		GEMINI_DEFAULT_MODEL: process.env.GEMINI_DEFAULT_MODEL,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
	},
};

// Export the environment object as frozen to prevent modifications
export default Object.freeze(environment);
