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

/**
 * Validates observability-related environment variables
 */
export interface ObservabilityConfig {
	metricsEnabled?: boolean;
	pushEnabled?: boolean;
	structuredLoggingEnabled?: boolean;
	runtimeMetricsEnabled?: boolean;
	pushGatewayUrl?: string;
	lokiUrl?: string;
	pushInterval?: number;
	circuitBreakerThreshold?: number;
}

export function validateObservabilityEnvironment(): ObservabilityConfig {
	const config: ObservabilityConfig = {
		metricsEnabled: getEnvVarBoolean('ENABLE_METRICS', true),
		pushEnabled: getEnvVarBoolean('ENABLE_METRICS_PUSH', false),
		structuredLoggingEnabled: getEnvVarBoolean('ENABLE_STRUCTURED_LOGGING', false),
		runtimeMetricsEnabled: getEnvVarBoolean('ENABLE_RUNTIME_METRICS', true),
		pushGatewayUrl: process.env.PROMETHEUS_PUSHGATEWAY_URL,
		lokiUrl: process.env.LOKI_URL,
		pushInterval: parseInt(process.env.METRICS_PUSH_INTERVAL || '30000'),
		circuitBreakerThreshold: parseInt(process.env.METRICS_CIRCUIT_BREAKER_THRESHOLD || '5')
	};

	// Validate URLs if provided
	if (config.pushGatewayUrl && !isValidUrl(config.pushGatewayUrl)) {
		logger.warn(`Invalid PROMETHEUS_PUSHGATEWAY_URL: ${config.pushGatewayUrl}`);
		config.pushGatewayUrl = undefined;
		config.pushEnabled = false;
	}

	if (config.lokiUrl && !isValidUrl(config.lokiUrl)) {
		logger.warn(`Invalid LOKI_URL: ${config.lokiUrl}`);
		config.lokiUrl = undefined;
		config.structuredLoggingEnabled = false;
	}

	// Validate intervals
	if (config.pushInterval && config.pushInterval < 1000) {
		logger.warn(`METRICS_PUSH_INTERVAL too low (${config.pushInterval}ms), setting to 1000ms minimum`);
		config.pushInterval = 1000;
	}

	if (config.circuitBreakerThreshold && config.circuitBreakerThreshold < 1) {
		logger.warn(`METRICS_CIRCUIT_BREAKER_THRESHOLD too low (${config.circuitBreakerThreshold}), setting to 1 minimum`);
		config.circuitBreakerThreshold = 1;
	}

	// Log configuration
	logger.info('Observability configuration validated:', {
		metricsEnabled: config.metricsEnabled,
		pushEnabled: config.pushEnabled,
		structuredLoggingEnabled: config.structuredLoggingEnabled,
		runtimeMetricsEnabled: config.runtimeMetricsEnabled,
		pushInterval: config.pushInterval,
		circuitBreakerThreshold: config.circuitBreakerThreshold,
		hasPushGateway: !!config.pushGatewayUrl,
		hasLoki: !!config.lokiUrl
	});

	return config;
}

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Gets observability-related environment variables with validation
 */
export function getObservabilityEnvVars(): Required<ObservabilityConfig> {
	const config = validateObservabilityEnvironment();
	
	return {
		metricsEnabled: config.metricsEnabled ?? true,
		pushEnabled: config.pushEnabled ?? false,
		structuredLoggingEnabled: config.structuredLoggingEnabled ?? false,
		runtimeMetricsEnabled: config.runtimeMetricsEnabled ?? true,
		pushGatewayUrl: config.pushGatewayUrl ?? '',
		lokiUrl: config.lokiUrl ?? '',
		pushInterval: config.pushInterval ?? 30000,
		circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5
	};
}
