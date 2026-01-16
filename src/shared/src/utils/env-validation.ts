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
		const missingOptional = config.optional.filter((envVar) => !process.env[envVar]);
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
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

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
	// Unified metrics configuration
	unifiedMetricsEnabled?: boolean;
	unifiedMetricsHost?: string;
	unifiedMetricsPort?: number;
	unifiedMetricsAuth?: string;
	unifiedHealthEnabled?: boolean;
	unifiedCorsEnabled?: boolean;
	unifiedAutoDiscovery?: boolean;
	unifiedAutoRegistration?: boolean;
	unifiedHealthCheckInterval?: number;
	// Redis configuration for bot trigger metrics
	redisEnabled?: boolean;
	redisHost?: string;
	redisPort?: number;
	redisPassword?: string;
	redisDb?: number;
	redisBatchSize?: number;
	redisBatchFlushInterval?: number;
	redisCircuitBreakerThreshold?: number;
	redisConnectionTimeout?: number;
	redisRetryDelay?: number;
	redisMaxRetries?: number;
	enableEnhancedBotTracking?: boolean;
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
		circuitBreakerThreshold: parseInt(process.env.METRICS_CIRCUIT_BREAKER_THRESHOLD || '5'),
		// Unified metrics configuration
		unifiedMetricsEnabled: getEnvVarBoolean('ENABLE_UNIFIED_METRICS', true),
		unifiedMetricsHost: process.env.UNIFIED_METRICS_HOST || '192.168.50.3',
		unifiedMetricsPort: parseInt(process.env.UNIFIED_METRICS_PORT || '3001'),
		unifiedMetricsAuth: process.env.UNIFIED_METRICS_AUTH_TOKEN,
		unifiedHealthEnabled: getEnvVarBoolean('ENABLE_UNIFIED_HEALTH', true),
		unifiedCorsEnabled: getEnvVarBoolean('ENABLE_UNIFIED_CORS', false),
		unifiedAutoDiscovery: getEnvVarBoolean('UNIFIED_AUTO_DISCOVERY', true),
		unifiedAutoRegistration: getEnvVarBoolean('UNIFIED_AUTO_REGISTRATION', true),
		unifiedHealthCheckInterval: parseInt(process.env.UNIFIED_HEALTH_CHECK_INTERVAL || '30000'),
		// Redis configuration for bot trigger metrics
		redisEnabled: getEnvVarBoolean('ENABLE_REDIS_METRICS', false),
		redisHost: process.env.REDIS_HOST || (process.env.NODE_ENV === 'development' ? 'localhost' : 'redis'),
		redisPort: parseInt(process.env.REDIS_PORT || '6379'),
		redisPassword: process.env.REDIS_PASSWORD,
		redisDb: parseInt(process.env.REDIS_DB || '0'),
		redisBatchSize: parseInt(process.env.REDIS_BATCH_SIZE || '100'),
		redisBatchFlushInterval: parseInt(process.env.REDIS_BATCH_FLUSH_INTERVAL || '5000'),
		redisCircuitBreakerThreshold: parseInt(process.env.REDIS_CIRCUIT_BREAKER_THRESHOLD || '3'),
		redisConnectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT || '10000'),
		redisRetryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
		redisMaxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
		enableEnhancedBotTracking: getEnvVarBoolean('ENABLE_ENHANCED_BOT_TRACKING', false),
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
		logger.warn(
			`METRICS_CIRCUIT_BREAKER_THRESHOLD too low (${config.circuitBreakerThreshold}), setting to 1 minimum`,
		);
		config.circuitBreakerThreshold = 1;
	}

	// Validate unified metrics configuration
	if (config.unifiedMetricsPort && (config.unifiedMetricsPort < 1024 || config.unifiedMetricsPort > 65535)) {
		logger.warn(`Invalid UNIFIED_METRICS_PORT (${config.unifiedMetricsPort}), setting to 3001`);
		config.unifiedMetricsPort = 3001;
	}

	if (config.unifiedHealthCheckInterval && config.unifiedHealthCheckInterval < 5000) {
		logger.warn(
			`UNIFIED_HEALTH_CHECK_INTERVAL too low (${config.unifiedHealthCheckInterval}ms), setting to 5000ms minimum`,
		);
		config.unifiedHealthCheckInterval = 5000;
	}

	// Validate Redis configuration
	if (config.redisPort && (config.redisPort < 1 || config.redisPort > 65535)) {
		logger.warn(`Invalid REDIS_PORT (${config.redisPort}), setting to 6379`);
		config.redisPort = 6379;
	}

	if (config.redisDb && (config.redisDb < 0 || config.redisDb > 15)) {
		logger.warn(`Invalid REDIS_DB (${config.redisDb}), setting to 0`);
		config.redisDb = 0;
	}

	if (config.redisBatchSize && config.redisBatchSize < 10) {
		logger.warn(`REDIS_BATCH_SIZE too low (${config.redisBatchSize}), setting to 10 minimum`);
		config.redisBatchSize = 10;
	}

	if (config.redisBatchFlushInterval && config.redisBatchFlushInterval < 1000) {
		logger.warn(
			`REDIS_BATCH_FLUSH_INTERVAL too low (${config.redisBatchFlushInterval}ms), setting to 1000ms minimum`,
		);
		config.redisBatchFlushInterval = 1000;
	}

	if (config.redisCircuitBreakerThreshold && config.redisCircuitBreakerThreshold < 1) {
		logger.warn(
			`REDIS_CIRCUIT_BREAKER_THRESHOLD too low (${config.redisCircuitBreakerThreshold}), setting to 1 minimum`,
		);
		config.redisCircuitBreakerThreshold = 1;
	}

	if (config.redisConnectionTimeout && config.redisConnectionTimeout < 1000) {
		logger.warn(`REDIS_CONNECTION_TIMEOUT too low (${config.redisConnectionTimeout}ms), setting to 1000ms minimum`);
		config.redisConnectionTimeout = 1000;
	}

	if (config.redisMaxRetries && config.redisMaxRetries < 0) {
		logger.warn(`REDIS_MAX_RETRIES invalid (${config.redisMaxRetries}), setting to 3`);
		config.redisMaxRetries = 3;
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
		hasLoki: !!config.lokiUrl,
		// Unified metrics
		unifiedMetricsEnabled: config.unifiedMetricsEnabled,
		unifiedMetricsEndpoint: `http://${config.unifiedMetricsHost}:${config.unifiedMetricsPort}/metrics`,
		unifiedHealthEnabled: config.unifiedHealthEnabled,
		unifiedAutoDiscovery: config.unifiedAutoDiscovery,
		unifiedAutoRegistration: config.unifiedAutoRegistration,
		// Redis configuration
		redisEnabled: config.redisEnabled,
		redisEndpoint: `${config.redisHost}:${config.redisPort}`,
		redisDb: config.redisDb,
		hasRedisPassword: !!config.redisPassword,
		redisBatchSize: config.redisBatchSize,
		redisBatchFlushInterval: config.redisBatchFlushInterval,
		redisCircuitBreakerThreshold: config.redisCircuitBreakerThreshold,
		enableEnhancedBotTracking: config.enableEnhancedBotTracking,
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
		circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
		// Unified metrics
		unifiedMetricsEnabled: config.unifiedMetricsEnabled ?? true,
		unifiedMetricsHost: config.unifiedMetricsHost ?? '192.168.50.3',
		unifiedMetricsPort: config.unifiedMetricsPort ?? 3001,
		unifiedMetricsAuth: config.unifiedMetricsAuth ?? '',
		unifiedHealthEnabled: config.unifiedHealthEnabled ?? true,
		unifiedCorsEnabled: config.unifiedCorsEnabled ?? false,
		unifiedAutoDiscovery: config.unifiedAutoDiscovery ?? true,
		unifiedAutoRegistration: config.unifiedAutoRegistration ?? true,
		unifiedHealthCheckInterval: config.unifiedHealthCheckInterval ?? 30000,
		// Redis configuration
		redisEnabled: config.redisEnabled ?? false,
		redisHost: config.redisHost ?? (process.env.NODE_ENV === 'development' ? 'localhost' : 'redis'),
		redisPort: config.redisPort ?? 6379,
		redisPassword: config.redisPassword ?? '',
		redisDb: config.redisDb ?? 0,
		redisBatchSize: config.redisBatchSize ?? 100,
		redisBatchFlushInterval: config.redisBatchFlushInterval ?? 5000,
		redisCircuitBreakerThreshold: config.redisCircuitBreakerThreshold ?? 3,
		redisConnectionTimeout: config.redisConnectionTimeout ?? 10000,
		redisRetryDelay: config.redisRetryDelay ?? 1000,
		redisMaxRetries: config.redisMaxRetries ?? 3,
		enableEnhancedBotTracking: config.enableEnhancedBotTracking ?? false,
	};
}
