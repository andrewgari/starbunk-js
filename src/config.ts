import { config as configDotenv } from 'dotenv';
import { resolve } from 'path';
import LoggerAdapter from './services/LoggerAdapter';

switch (process.env.NODE_ENV) {
	case 'development':
		LoggerAdapter.info('🔧 Loading development environment configuration');
		configDotenv({
			path: resolve(__dirname, '../.env.development'),
		});
		break;
	case 'test':
		LoggerAdapter.info('🧪 Loading test environment configuration');
		configDotenv({
			path: resolve(__dirname, '../.env.test'),
		});
		break;
	// Add 'staging' and 'production' cases here as well!
	default:
		LoggerAdapter.error(`Invalid NODE_ENV: ${process.env.NODE_ENV}`);
		throw new Error(`'NODE_ENV' ${process.env.NODE_ENV} is not handled!`);
}

// More content in config.ts
const throwIfNot = function <T, K extends keyof T>(obj: Partial<T>, prop: K, msg?: string): T[K] {
	if (obj[prop] === undefined || obj[prop] === null) {
		const errorMsg = msg || `Environment is missing variable ${String(prop)}`;
		LoggerAdapter.error(errorMsg);
		throw new Error(errorMsg);
	}
	return obj[prop] as T[K];
};

LoggerAdapter.info('🔍 Validating environment variables...');
['AUTHENTICATION_API_URL', 'GRAPHQL_API_URL'].forEach((v) => {
	throwIfNot(process.env, v);
});
LoggerAdapter.success('✅ Environment validation complete');

interface IProcessEnv {
	AUTHENTICATION_API_URL: string;
	GRAPHQL_API_URL: string;
	NODE_ENV: 'development' | 'test' | 'production';
	STARBUNK_TOKEN: string;
	SNOWBUNK_TOKEN: string;
	CLIENT_ID: string;
	GUILD_ID: string;
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
		}
	}
}
