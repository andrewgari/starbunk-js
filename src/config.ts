import { config as configDotenv } from 'dotenv';
import { resolve } from 'path';
import loggerAdapter from './services/loggerAdapter';

switch (process.env.NODE_ENV) {
	case 'development':
		loggerAdapter.info('🔧 Loading development environment configuration');
		configDotenv({
			path: resolve(__dirname, '../.env.development'),
		});
		break;
	case 'test':
		loggerAdapter.info('🧪 Loading test environment configuration');
		configDotenv({
			path: resolve(__dirname, '../.env.test'),
		});
		break;
	// Add 'staging' and 'production' cases here as well!
	default:
		loggerAdapter.error(`Invalid NODE_ENV: ${process.env.NODE_ENV}`);
		throw new Error(`'NODE_ENV' ${process.env.NODE_ENV} is not handled!`);
}

// More content in config.ts
const throwIfNot = function <T, K extends keyof T>(obj: Partial<T>, prop: K, msg?: string): T[K] {
	if (obj[prop] === undefined || obj[prop] === null) {
		const errorMsg = msg || `Environment is missing variable ${String(prop)}`;
		loggerAdapter.error(errorMsg);
		throw new Error(errorMsg);
	}
	return obj[prop] as T[K];
};

loggerAdapter.info('🔍 Validating environment variables...');
['AUTHENTICATION_API_URL', 'GRAPHQL_API_URL'].forEach((v) => {
	throwIfNot(process.env, v);
});
loggerAdapter.success('✅ Environment validation complete');

// Set default debug mode to false if not explicitly set to 'true'
process.env.DEBUG_MODE = process.env.DEBUG_MODE === 'true' ? 'true' : 'false';
if (process.env.DEBUG_MODE === 'true') {
	loggerAdapter.info('🐛 Debug mode enabled');
}

interface IProcessEnv {
	AUTHENTICATION_API_URL: string;
	GRAPHQL_API_URL: string;
	NODE_ENV: 'development' | 'test' | 'production';
	STARBUNK_TOKEN: string;
	SNOWBUNK_TOKEN: string;
	CLIENT_ID: string;
	GUILD_ID: string;
	DEBUG_MODE?: boolean;
}

export { IProcessEnv };

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			AUTHENTICATION_API_URL: string;
			GRAPHQL_API_URL: string;
			NODE_ENV: 'development' | 'test' | 'production';
			STARBUNK_TOKEN: string;
			SNOWBUNK_TOKEN: string;
			CLIENT_ID: string;
			GUILD_ID: string;
			DEBUG_MODE?: string;
		}
	}
}
