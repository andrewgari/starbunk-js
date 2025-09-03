import { config as configDotenv } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment configuration abstraction that loads and validates environment variables.
 * This is the central place to access all environment variables and ensures type safety.
 */

// Find the .env file
const envPath = path.resolve(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

// Log whether the .env file exists
console.log(`[Environment] Looking for .env file at: ${envPath}`);
console.log(`[Environment] .env file exists: ${envExists}`);

// Load environment variables from .env file - looking in project root
const result = configDotenv({ path: envPath });
console.log(`[Environment] .env file loaded successfully: ${result.parsed ? 'Yes' : 'No'}`);

// Log available environment variables for debugging
console.log('[Environment] Environment variables loaded:');
console.log(`[Environment] - STARBUNK_TOKEN: ${process.env.STARBUNK_TOKEN ? 'Set' : 'Not set'}`);
console.log(`[Environment] - SNOWBUNK_TOKEN: ${process.env.SNOWBUNK_TOKEN ? 'Set' : 'Not set'}`);
console.log(`[Environment] - DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`[Environment] - OLLAMA_API_URL: ${process.env.OLLAMA_API_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - DEBUG_MODE: ${process.env.DEBUG_MODE}`);
console.log(`[Environment] - TESTING_SERVER_IDS: ${process.env.TESTING_SERVER_IDS || 'Not set'}`);
console.log(`[Environment] - TESTING_CHANNEL_IDS: ${process.env.TESTING_CHANNEL_IDS || 'Not set'}`);
console.log(`[Environment] - Is Debug Mode Active: ${isDebugMode()}`);

// --- Start Validation ---
if (!process.env.STARBUNK_TOKEN) {
	console.error('[Environment] FATAL: Required environment variable STARBUNK_TOKEN is not set.');
	process.exit(1);
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

export enum NodeEnvironment {
	Production = 'production',
	Development = 'development',
	Test = 'test',
}

export function getNodeEnv(): NodeEnvironment {
	const env = process.env.NODE_ENV as NodeEnvironment | undefined;
	if (!env) {
		console.warn('[Environment] Warning: NODE_ENV is not set. Defaulting to "production" for safety.');
		return NodeEnvironment.Production;
	}
	return env;
}

export const isProduction = (): boolean => getNodeEnv() === NodeEnvironment.Production;
export const isDevelopment = (): boolean => getNodeEnv() === NodeEnvironment.Development;
export const isTest = (): boolean => getNodeEnv() === NodeEnvironment.Test;

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
	},
};

// Export the environment object as frozen to prevent modifications
export default Object.freeze(environment);
