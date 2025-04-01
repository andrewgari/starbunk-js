import { config as configDotenv } from 'dotenv';
import fs from 'fs';
import path from 'path';

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
console.log(`[Environment] - DEBUG: ${process.env.DEBUG}`);
console.log(`[Environment] - Is Debug Mode Active: ${isDebugMode()}`);

// Helper function to check debug mode
export function isDebugMode(): boolean {
	return process.env.DEBUG === 'true';
}

// Helper function to set debug mode (for tests or runtime changes)
export function setDebugMode(value: boolean): void {
	process.env.DEBUG = value ? 'true' : 'false';
}

// Export default object with environment variables
const environment = {
	app: {
		DEBUG: process.env.DEBUG
	},
	discord: {
		STARBUNK_TOKEN: process.env.STARBUNK_TOKEN,
		SNOWBUNK_TOKEN: process.env.SNOWBUNK_TOKEN,
		WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL
	},
	llm: {
		OPENAI_DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL,
		OLLAMA_API_URL: process.env.OLLAMA_API_URL
	}
};

// Export the environment object as frozen to prevent modifications
export default Object.freeze(environment);
