// Environment validation utilities
import { logger } from '../services/logger';

export interface EnvConfig {
	required: string[];
	optional?: string[];
}

export function validateEnvironment(config: EnvConfig): void {
	const missing: string[] = [];
	
	// Check required environment variables
	for (const envVar of config.required) {
		if (!process.env[envVar]) {
			missing.push(envVar);
		}
	}

	if (missing.length > 0) {
		const error = `Missing required environment variables: ${missing.join(', ')}`;
		logger.error(error);
		throw new Error(error);
	}

	// Log optional variables that are missing
	if (config.optional) {
		const missingOptional = config.optional.filter(envVar => !process.env[envVar]);
		if (missingOptional.length > 0) {
			logger.warn(`Optional environment variables not set: ${missingOptional.join(', ')}`);
		}
	}

	logger.info('Environment validation passed');
}

export function getEnvVar(name: string, defaultValue?: string): string {
	const value = process.env[name];
	if (!value && defaultValue === undefined) {
		throw new Error(`Environment variable ${name} is required but not set`);
	}
	return value || defaultValue!;
}

export function getEnvVarBoolean(name: string, defaultValue: boolean = false): boolean {
	const value = process.env[name];
	if (!value) return defaultValue;
	return value.toLowerCase() === 'true' || value === '1';
}
