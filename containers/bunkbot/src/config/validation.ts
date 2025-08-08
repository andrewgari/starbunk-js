import { z } from 'zod';
import { logger, ensureError } from '@starbunk/shared';

// Discord ID validation regex
const DISCORD_ID_REGEX = /^\d{17,19}$/;

// Configuration schema definition
export const ConfigSchema = z.object({
	discord: z.object({
		token: z.string()
			.min(1, 'Discord token is required')
			.regex(/^[A-Za-z0-9._-]+$/, 'Invalid Discord token format'),
		clientId: z.string()
			.regex(DISCORD_ID_REGEX, 'Invalid Discord client ID format')
			.optional(),
		guildId: z.string()
			.regex(DISCORD_ID_REGEX, 'Invalid Discord guild ID format')
			.optional(),
	}),
	server: z.object({
		healthPort: z.coerce.number()
			.min(1000, 'Health port must be >= 1000')
			.max(65535, 'Health port must be <= 65535')
			.default(3002),
		nodeEnv: z.enum(['development', 'production', 'test'])
			.default('production'),
		maxRequestsPerMinute: z.coerce.number()
			.min(10, 'Rate limit must be at least 10 requests per minute')
			.max(1000, 'Rate limit must not exceed 1000 requests per minute')
			.default(300),
	}),
	features: z.object({
		debugMode: z.coerce.boolean().default(false),
		maxBotInstances: z.coerce.number()
			.min(1, 'Must allow at least 1 bot instance')
			.max(200, 'Cannot exceed 200 bot instances for performance reasons')
			.default(50),
		enableCircuitBreaker: z.coerce.boolean().default(true),
		circuitBreakerThreshold: z.coerce.number()
			.min(1, 'Circuit breaker threshold must be at least 1')
			.max(20, 'Circuit breaker threshold cannot exceed 20')
			.default(3),
	}),
	database: z.object({
		url: z.string().url('Invalid database URL format').optional(),
		maxConnections: z.coerce.number()
			.min(1, 'Database connection pool must be at least 1')
			.max(100, 'Database connection pool cannot exceed 100')
			.default(10),
	}),
	logging: z.object({
		level: z.enum(['error', 'warn', 'info', 'debug'])
			.default('info'),
		enableStructuredLogging: z.coerce.boolean().default(true),
		enableCorrelationIds: z.coerce.boolean().default(true),
	}),
	security: z.object({
		enableBotValidation: z.coerce.boolean().default(true),
		maxMessageLength: z.coerce.number()
			.min(100, 'Max message length must be at least 100 characters')
			.max(4000, 'Max message length cannot exceed 4000 characters')
			.default(2000),
		allowedBotDirectories: z.array(z.string())
			.default(['reply-bots']),
		enablePathTraversalProtection: z.coerce.boolean().default(true),
	})
});

export type BunkBotConfig = z.infer<typeof ConfigSchema>;

/**
 * Validates and parses the application configuration from environment variables
 * @returns Validated configuration object
 * @throws Error if configuration is invalid
 */
export function validateAndParseConfig(): BunkBotConfig {
	const rawConfig = {
		discord: {
			token: process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN || process.env.DISCORD_TOKEN,
			clientId: process.env.DISCORD_CLIENT_ID,
			guildId: process.env.GUILD_ID,
		},
		server: {
			healthPort: process.env.HEALTH_PORT,
			nodeEnv: process.env.NODE_ENV,
			maxRequestsPerMinute: process.env.MAX_REQUESTS_PER_MINUTE,
		},
		features: {
			debugMode: process.env.DEBUG_MODE,
			maxBotInstances: process.env.MAX_BOT_INSTANCES,
			enableCircuitBreaker: process.env.ENABLE_CIRCUIT_BREAKER,
			circuitBreakerThreshold: process.env.CIRCUIT_BREAKER_THRESHOLD,
		},
		database: {
			url: process.env.DATABASE_URL,
			maxConnections: process.env.DATABASE_MAX_CONNECTIONS,
		},
		logging: {
			level: process.env.LOG_LEVEL,
			enableStructuredLogging: process.env.ENABLE_STRUCTURED_LOGGING,
			enableCorrelationIds: process.env.ENABLE_CORRELATION_IDS,
		},
		security: {
			enableBotValidation: process.env.ENABLE_BOT_VALIDATION,
			maxMessageLength: process.env.MAX_MESSAGE_LENGTH,
			allowedBotDirectories: process.env.ALLOWED_BOT_DIRECTORIES?.split(','),
			enablePathTraversalProtection: process.env.ENABLE_PATH_TRAVERSAL_PROTECTION,
		}
	};

	try {
		const config = ConfigSchema.parse(rawConfig);
		
		// Additional custom validations
		validateCustomRules(config);
		
		logger.info('✅ Configuration validation successful', {
			nodeEnv: config.server.nodeEnv,
			debugMode: config.features.debugMode,
			maxBotInstances: config.features.maxBotInstances,
			healthPort: config.server.healthPort
		});
		
		return config;
	} catch (error) {
		if (error instanceof z.ZodError) {
			logger.error('❌ Configuration validation failed:');
			error.errors.forEach(err => {
				const path = err.path.join('.');
				logger.error(`  - ${path}: ${err.message}`);
			});
			throw new Error(`Invalid configuration - check environment variables: ${error.errors.length} validation errors found`);
		}
		
		const processedError = ensureError(error);
		logger.error('❌ Unexpected error during configuration validation:', processedError);
		throw new Error(`Configuration validation failed: ${processedError.message}`);
	}
}

/**
 * Additional custom validation rules that cannot be expressed in Zod schema
 */
function validateCustomRules(config: BunkBotConfig): void {
	// Validate production-specific requirements
	if (config.server.nodeEnv === 'production') {
		if (config.features.debugMode) {
			logger.warn('⚠️ Debug mode is enabled in production environment');
		}
		
		if (config.logging.level === 'debug') {
			logger.warn('⚠️ Debug logging enabled in production - may impact performance');
		}
		
		if (!config.features.enableCircuitBreaker) {
			logger.error('❌ Circuit breaker must be enabled in production');
			throw new Error('Circuit breaker is required for production deployments');
		}
	}
	
	// Validate Discord token format based on environment
	if (!config.discord.token) {
		throw new Error('Discord token is required but not provided');
	}
	
	// Validate bot directory security
	if (config.security.enablePathTraversalProtection) {
		const suspiciousDirectories = config.security.allowedBotDirectories.filter(dir => 
			dir.includes('..') || dir.includes('/') || dir.includes('\\')
		);
		
		if (suspiciousDirectories.length > 0) {
			throw new Error(`Suspicious bot directories detected: ${suspiciousDirectories.join(', ')}`);
		}
	}
	
	// Validate resource constraints
	const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT_MB || '512');
	const estimatedMemoryPerBot = 10; // MB per bot (rough estimate)
	const estimatedMaxBots = Math.floor(memoryLimitMB * 0.6 / estimatedMemoryPerBot); // Use 60% of available memory
	
	if (config.features.maxBotInstances > estimatedMaxBots) {
		logger.warn(`⚠️ Max bot instances (${config.features.maxBotInstances}) may exceed available memory. Recommended max: ${estimatedMaxBots}`);
	}
}

/**
 * Get a sanitized version of the configuration for logging (removes sensitive data)
 */
export function getSanitizedConfig(config: BunkBotConfig): Partial<BunkBotConfig> {
	return {
		server: config.server,
		features: config.features,
		logging: config.logging,
		security: {
			...config.security,
			// Don't include actual directories in logs
			allowedBotDirectories: config.security.allowedBotDirectories.map(() => '[DIRECTORY]')
		},
		discord: {
			// Mask the token but show first/last few characters for verification
			token: config.discord.token ? 
				`${config.discord.token.slice(0, 4)}...${config.discord.token.slice(-4)}` : 
				'[NOT_SET]',
			clientId: config.discord.clientId,
			guildId: config.discord.guildId,
		},
		database: {
			url: config.database.url ? '[DATABASE_URL_SET]' : '[NOT_SET]',
			maxConnections: config.database.maxConnections,
		}
	};
}