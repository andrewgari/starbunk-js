import { config as configDotenv } from 'dotenv';
import { resolve } from 'path';
import { logger } from './services/logger';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV) {
	switch (process.env.NODE_ENV) {
		case 'development':
			logger.info('🔧 Loading development environment configuration');
			configDotenv({
				path: resolve(__dirname, '../.env.development'),
			});
			break;
		case 'test':
			logger.info('🧪 Loading test environment configuration');
			configDotenv({
				path: resolve(__dirname, '../.env.test'),
			});
			break;
		// Add 'staging' and 'production' cases here as well!
		default:
			logger.info('🔧 Loading default environment configuration');
			configDotenv();
	}
} else {
	// If NODE_ENV is not set, load the default .env file
	logger.info('🔧 NODE_ENV not set, loading default environment configuration');
	configDotenv();
}

// More content in config.ts
const throwIfNot = function <T, K extends keyof T>(obj: Partial<T>, prop: K, msg?: string): T[K] {
	if (obj[prop] === undefined || obj[prop] === null) {
		const errorMsg = msg || `Environment is missing variable ${String(prop)}`;
		logger.error(errorMsg);
		throw new Error(errorMsg);
	}
	return obj[prop] as T[K];
};

logger.info('🔍 Validating environment variables...');
// Only check for essential variables
['STARBUNK_TOKEN', 'SNOWBUNK_TOKEN', 'CLIENT_ID', 'GUILD_ID'].forEach((v) => {
	throwIfNot(process.env, v);
});
logger.success('✅ Environment validation complete');

// Set default debug mode to false if not explicitly set to 'true'
process.env.DEBUG_MODE = process.env.DEBUG_MODE === 'true' ? 'true' : 'false';
if (process.env.DEBUG_MODE === 'true') {
	logger.info('🐛 Debug mode enabled');
}

interface IProcessEnv {
	AUTHENTICATION_API_URL?: string;
	GRAPHQL_API_URL?: string;
	NODE_ENV?: 'development' | 'test' | 'production';
	STARBUNK_TOKEN: string;
	SNOWBUNK_TOKEN: string;
	CLIENT_ID: string;
	GUILD_ID: string;
	DEBUG_MODE?: boolean;
	WEBHOOK_URL?: string;
	OPENAI_API_KEY?: string;
}

export { IProcessEnv };

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			AUTHENTICATION_API_URL?: string;
			GRAPHQL_API_URL?: string;
			NODE_ENV?: 'development' | 'test' | 'production';
			STARBUNK_TOKEN: string;
			SNOWBUNK_TOKEN: string;
			CLIENT_ID: string;
			GUILD_ID: string;
			DEBUG_MODE?: string;
			WEBHOOK_URL?: string;
			OPENAI_API_KEY?: string;
		}
	}
}
