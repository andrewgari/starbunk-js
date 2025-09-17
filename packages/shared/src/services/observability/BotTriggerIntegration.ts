/**
 * Integration helper for BotTriggerMetricsService with existing BunkBot architecture
 *
 * This file provides integration utilities to connect the new BotTriggerMetricsService
 * with the existing _BunkBotMetricsCollector and observability infrastructure.
 */

import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { _BunkBotMetricsCollector } from './BunkBotMetrics';
import {
	BotTriggerMetricsService,
	createProductionConfig,
	initializeBotTriggerMetricsService,
} from './BotTriggerMetricsService';
import {
	type BotTriggerEvent,
	type BotMetricsServiceConfig,
	type ServiceOperationResult,
} from '../../types/bot-metrics';
import type { MessageContext } from './ContainerMetrics';

// ============================================================================
// Integration Configuration
// ============================================================================

/**
 * Configuration for bot trigger integration
 */
interface BotTriggerIntegrationConfig {
	/** Redis configuration - defaults to standard Redis setup */
	redis?: {
		host?: string;
		port?: number;
		password?: string;
		db?: number;
	};
	/** Enable enhanced tracking features */
	enableEnhancedTracking?: boolean;
	/** Enable batch operations for high-throughput scenarios */
	enableBatchOperations?: boolean;
	/** Batch size for bulk operations */
	batchSize?: number;
	/** Environment override (development/production) */
	environment?: 'development' | 'production';
}

// ============================================================================
// Enhanced Metrics Collector with Redis Integration
// ============================================================================

/**
 * Enhanced BunkBot metrics collector that integrates Redis-based detailed tracking
 * with the existing Prometheus metrics system
 */
class Enhanced_BunkBotMetricsCollector extends _BunkBotMetricsCollector {
	private botTriggerService?: BotTriggerMetricsService;
	private integrationConfig: BotTriggerIntegrationConfig;
	private isEnhancedTrackingEnabled = false;

	constructor(
		metrics: import('./ProductionMetricsService').ProductionMetricsService,
		config: import('./ContainerMetrics').ContainerMetricsConfig = {},
		integrationConfig: BotTriggerIntegrationConfig = {},
	) {
		super(metrics, config);
		this.integrationConfig = integrationConfig;
	}

	/**
	 * Initialize enhanced tracking with Redis-based metrics
	 */
	async initializeEnhancedTracking(): Promise<void> {
		if (this.isEnhancedTrackingEnabled) {
			logger.warn('Enhanced tracking already initialized');
			return;
		}

		try {
			// Create Redis configuration
			const redisConfig = createProductionConfig(
				this.integrationConfig.redis?.host ?? process.env.REDIS_HOST ?? 'localhost',
				this.integrationConfig.redis?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10),
			);

			// Override with custom settings if provided
			if (this.integrationConfig.redis?.password) {
				redisConfig.redis.password = this.integrationConfig.redis.password;
			}
			if (this.integrationConfig.redis?.db !== undefined) {
				redisConfig.redis.db = this.integrationConfig.redis.db;
			}

			// Configure batch operations
			if (this.integrationConfig.enableBatchOperations !== undefined) {
				redisConfig.enableBatchOperations = this.integrationConfig.enableBatchOperations;
			}
			if (this.integrationConfig.batchSize) {
				redisConfig.batchSize = this.integrationConfig.batchSize;
			}

			// Initialize the bot trigger service
			this.botTriggerService = await initializeBotTriggerMetricsService(redisConfig);

			this.isEnhancedTrackingEnabled = true;
			logger.info('Enhanced BunkBot metrics tracking initialized with Redis backend', {
				redis: {
					host: redisConfig.redis.host,
					port: redisConfig.redis.port,
					db: redisConfig.redis.db,
				},
				batchOperations: redisConfig.enableBatchOperations,
			});
		} catch (error) {
			logger.error('Failed to initialize enhanced tracking:', ensureError(error));
			// Continue without enhanced tracking - fall back to standard Prometheus metrics
			this.isEnhancedTrackingEnabled = false;
		}
	}

	/**
	 * Enhanced bot trigger tracking with detailed Redis storage
	 */
	trackBotTrigger(botName: string, conditionName: string, messageContext: MessageContext): void {
		// Always call the base implementation for Prometheus metrics
		super.trackBotTrigger(botName, conditionName, messageContext);

		// If enhanced tracking is enabled, also store detailed event data in Redis
		if (this.isEnhancedTrackingEnabled && this.botTriggerService) {
			this.trackDetailedBotTrigger(botName, conditionName, messageContext);
		}
	}

	/**
	 * Enhanced bot response tracking with detailed timing and success metrics
	 */
	trackBotResponse(
		botName: string,
		conditionName: string,
		responseTime: number,
		messageContext: MessageContext,
		success = true,
		responseType: 'message' | 'reaction' | 'webhook' | 'none' = 'message',
	): void {
		// Always call the base implementation for Prometheus metrics
		super.trackBotResponse(botName, conditionName, responseTime, messageContext);

		// If enhanced tracking is enabled, update the detailed event in Redis
		if (this.isEnhancedTrackingEnabled && this.botTriggerService) {
			this.updateDetailedBotResponse(
				botName,
				conditionName,
				responseTime,
				messageContext,
				success,
				responseType,
			);
		}
	}

	/**
	 * Store detailed bot trigger event in Redis
	 */
	private async trackDetailedBotTrigger(
		botName: string,
		conditionName: string,
		messageContext: MessageContext,
	): Promise<void> {
		try {
			const triggerEvent: BotTriggerEvent = {
				triggerId: `${messageContext.messageId}-${botName}-${Date.now()}`,
				timestamp: Date.now(),
				botName: this.sanitizeLabel(botName),
				conditionName: this.sanitizeLabel(conditionName),
				userId: messageContext.userId,
				channelId: messageContext.channelId,
				guildId: messageContext.guildId,
				messageId: messageContext.messageId,
				metadata: {
					trackingSource: 'Enhanced_BunkBotMetricsCollector',
					environment: this.integrationConfig.environment ?? process.env.NODE_ENV ?? 'development',
				},
			};

			const _result = await this.botTriggerService!.trackBotTrigger(triggerEvent);

			if (!result.success) {
				logger.warn('Failed to track detailed bot trigger:', result.error);
			} else {
				logger.debug(`Detailed bot trigger tracked: ${botName} -> ${conditionName}`, {
					triggerId: triggerEvent.triggerId,
					messageId: messageContext.messageId,
				});
			}
		} catch (error) {
			logger.error('Error tracking detailed bot trigger:', ensureError(error));
		}
	}

	/**
	 * Update detailed bot response in Redis
	 */
	private async updateDetailedBotResponse(
		botName: string,
		conditionName: string,
		responseTime: number,
		messageContext: MessageContext,
		success: boolean,
		responseType: 'message' | 'reaction' | 'webhook' | 'none',
	): Promise<void> {
		try {
			// Create a new event for the response (could be optimized to update existing event)
			const responseEvent: BotTriggerEvent = {
				triggerId: `${messageContext.messageId}-${botName}-response-${Date.now()}`,
				timestamp: Date.now(),
				botName: this.sanitizeLabel(botName),
				conditionName: this.sanitizeLabel(conditionName),
				userId: messageContext.userId,
				channelId: messageContext.channelId,
				guildId: messageContext.guildId,
				messageId: messageContext.messageId,
				responseTimeMs: responseTime,
				responseType,
				success,
				metadata: {
					trackingSource: 'Enhanced_BunkBotMetricsCollector',
					environment: this.integrationConfig.environment ?? process.env.NODE_ENV ?? 'development',
					isResponseUpdate: true,
				},
			};

			const _result = await this.botTriggerService!.trackBotTrigger(responseEvent);

			if (!result.success) {
				logger.warn('Failed to track detailed bot response:', result.error);
			} else {
				logger.debug(`Detailed bot response tracked: ${botName} (${responseTime}ms, ${success})`, {
					triggerId: responseEvent.triggerId,
					messageId: messageContext.messageId,
					responseType,
				});
			}
		} catch (error) {
			logger.error('Error tracking detailed bot response:', ensureError(error));
		}
	}

	/**
	 * Get enhanced health status including Redis metrics service
	 */
	async getEnhancedHealthStatus(): Promise<Record<string, any>> {
		const baseHealth = this.getHealthStatus();

		if (this.isEnhancedTrackingEnabled && this.botTriggerService) {
			try {
				const redisHealth = await this.botTriggerService.getHealthStatus();
				return {
					...baseHealth,
					enhancedTracking: {
						enabled: true,
						redisHealth,
					},
				};
			} catch (error) {
				return {
					...baseHealth,
					enhancedTracking: {
						enabled: true,
						error: ensureError(error).message,
					},
				};
			}
		}

		return {
			...baseHealth,
			enhancedTracking: {
				enabled: false,
			},
		};
	}

	/**
	 * Get bot trigger service instance for direct access
	 */
	getBotTriggerService(): BotTriggerMetricsService | undefined {
		return this.botTriggerService;
	}

	/**
	 * Cleanup enhanced tracking resources
	 */
	async cleanup(): Promise<void> {
		// Cleanup base resources
		await super.cleanup();

		// Cleanup Redis resources
		if (this.botTriggerService) {
			try {
				await this.botTriggerService.cleanup();
				logger.info('Enhanced tracking resources cleaned up successfully');
			} catch (error) {
				logger.error('Error cleaning up enhanced tracking resources:', ensureError(error));
			}
		}
	}
}

// ============================================================================
// Factory Functions and Integration Utilities
// ============================================================================

/**
 * Create enhanced BunkBot metrics collector with Redis integration
 */
export function createEnhancedBunkBotMetrics(
	metrics: import('./ProductionMetricsService').ProductionMetricsService,
	config: import('./ContainerMetrics').ContainerMetricsConfig = {},
	integrationConfig: BotTriggerIntegrationConfig = {},
): Enhanced_BunkBotMetricsCollector {
	return new Enhanced_BunkBotMetricsCollector(metrics, config, integrationConfig);
}

/**
 * Integration utility to easily add bot trigger tracking to existing bot implementations
 */
class BotTriggerTracker {
	private metricsCollector?: Enhanced_BunkBotMetricsCollector;
	private isInitialized = false;

	constructor(private readonly config: BotTriggerIntegrationConfig = {}) {}

	/**
	 * Initialize the tracker with metrics collector
	 */
	async initialize(metricsCollector: Enhanced_BunkBotMetricsCollector): Promise<void> {
		this.metricsCollector = metricsCollector;

		if (this.config.enableEnhancedTracking !== false) {
			await metricsCollector.initializeEnhancedTracking();
		}

		this.isInitialized = true;
		logger.info('BotTriggerTracker initialized', {
			enhancedTracking: this.config.enableEnhancedTracking !== false,
		});
	}

	/**
	 * Track a bot trigger event
	 */
	trackTrigger(botName: string, conditionName: string, messageContext: MessageContext): void {
		if (!this.isInitialized || !this.metricsCollector) {
			logger.warn('BotTriggerTracker not initialized, skipping tracking');
			return;
		}

		this.metricsCollector.trackBotTrigger(botName, conditionName, messageContext);
	}

	/**
	 * Track a bot response event
	 */
	trackResponse(
		botName: string,
		conditionName: string,
		responseTime: number,
		messageContext: MessageContext,
		success = true,
		responseType: 'message' | 'reaction' | 'webhook' | 'none' = 'message',
	): void {
		if (!this.isInitialized || !this.metricsCollector) {
			logger.warn('BotTriggerTracker not initialized, skipping tracking');
			return;
		}

		this.metricsCollector.trackBotResponse(botName, conditionName, responseTime, messageContext, success, responseType);
	}

	/**
	 * Get analytics for a specific bot
	 */
	async getBotAnalytics(botName: string, hours = 24): Promise<ServiceOperationResult<any>> {
		if (!this.isInitialized || !this.metricsCollector) {
			return {
				success: false,
				error: {
					code: 'NOT_INITIALIZED',
					message: 'BotTriggerTracker not initialized',
				},
			};
		}

		const botTriggerService = this.metricsCollector.getBotTriggerService();
		if (!botTriggerService) {
			return {
				success: false,
				error: {
					code: 'ENHANCED_TRACKING_DISABLED',
					message: 'Enhanced tracking not enabled',
				},
			};
		}

		const _now = Date.now();
		const startTime = now - hours * 60 * 60 * 1000;

		return await botTriggerService.getBotMetrics(
			{ botName },
			{
				startTime,
				endTime: now,
				period: 'hour',
			},
		);
	}

	/**
	 * Get health status
	 */
	async getHealthStatus(): Promise<Record<string, any>> {
		if (!this.isInitialized || !this.metricsCollector) {
			return {
				status: 'not_initialized',
			};
		}

		return await this.metricsCollector.getEnhancedHealthStatus();
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		if (this.metricsCollector) {
			await this.metricsCollector.cleanup();
		}
		this.isInitialized = false;
	}
}

// ============================================================================
// Environment Detection and Auto-Configuration
// ============================================================================

/**
 * Detect environment and create appropriate configuration
 */
function createEnvironmentConfig(): BotTriggerIntegrationConfig {
	const isProduction = process.env.NODE_ENV === 'production';
	const isDocker = process.env.DOCKER === 'true' || process.env.CONTAINER_NAME !== undefined;

	return {
		redis: {
			// Use Docker service name if in container, localhost otherwise
			host: process.env.REDIS_HOST ?? (isDocker ? 'redis' : 'localhost'),
			port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
			password: process.env.REDIS_PASSWORD,
			db: parseInt(process.env.REDIS_DB ?? '0', 10),
		},
		enableEnhancedTracking: process.env.ENABLE_ENHANCED_BOT_TRACKING !== 'false',
		enableBatchOperations: isProduction,
		batchSize: isProduction ? 100 : 10,
		environment: isProduction ? 'production' : 'development',
	};
}

/**
 * Initialize complete bot metrics system with auto-detected configuration
 */
async function initializeBotMetricsSystem(
	metricsService: import('./ProductionMetricsService').ProductionMetricsService,
	customConfig?: BotTriggerIntegrationConfig,
): Promise<{
	metricsCollector: Enhanced_BunkBotMetricsCollector;
	tracker: BotTriggerTracker;
	config: BotTriggerIntegrationConfig;
}> {
	const config = { ...createEnvironmentConfig(), ...customConfig };

	const metricsCollector = createEnhancedBunkBotMetrics(metricsService, {}, config);
	const tracker = new BotTriggerTracker(config);

	await tracker.initialize(metricsCollector);

	logger.info('Complete bot metrics system initialized', {
		enhancedTracking: config.enableEnhancedTracking,
		batchOperations: config.enableBatchOperations,
		environment: config.environment,
	});

	return {
		metricsCollector,
		tracker,
		config,
	};
}

// ============================================================================
// Convenience Exports
// ============================================================================

export type {
	BotTriggerIntegrationConfig,
};

export {
	Enhanced_BunkBotMetricsCollector,
	BotTriggerTracker,
	createEnvironmentConfig,
	initializeBotMetricsSystem,
};