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

/**
 * Validates if a string is a valid Discord snowflake ID
 * Discord snowflakes are 64-bit integers represented as strings
 */
export function isValidDiscordId(id: string): boolean {
	// Discord snowflakes are numeric strings between 17-19 characters
	const snowflakeRegex = /^\d{17,19}$/;
	return snowflakeRegex.test(id);
}

/**
 * Parses a comma-separated list of Discord IDs and validates them
 * Returns an array of valid Discord IDs, filtering out invalid ones
 */
export function parseDiscordIdList(envValue: string | undefined): string[] {
	if (!envValue || envValue.trim() === '') {
		return [];
	}

	const ids = envValue
		.split(',')
		.map(id => id.trim())
		.filter(id => id.length > 0);

	const validIds: string[] = [];
	const invalidIds: string[] = [];

	for (const id of ids) {
		if (isValidDiscordId(id)) {
			validIds.push(id);
		} else {
			invalidIds.push(id);
		}
	}

	if (invalidIds.length > 0) {
		logger.warn(`Invalid Discord IDs found and ignored: ${invalidIds.join(', ')}`);
	}

	if (validIds.length > 0) {
		logger.info(`Parsed ${validIds.length} valid Discord IDs`);
	}

	return validIds;
}

/**
 * Gets testing server IDs from environment variable
 */
export function getTestingServerIds(): string[] {
	return parseDiscordIdList(process.env.TESTING_SERVER_IDS);
}

/**
 * Gets testing channel IDs from environment variable
 */
export function getTestingChannelIds(): string[] {
	return parseDiscordIdList(process.env.TESTING_CHANNEL_IDS);
}

/**
 * Gets debug mode from environment variable (replaces old DEBUG variable)
 */
export function getDebugMode(): boolean {
	return getEnvVarBoolean('DEBUG_MODE', false);
}
