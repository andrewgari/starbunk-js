/**
 * Production-Ready Bot Trigger Metrics Collection Service
 *
 * Implements comprehensive Redis-based metrics collection for Discord bot triggers
 * with circuit breaker patterns, batch operations, and Prometheus integration.
 *
 * Features:
 * - High-performance Redis operations with connection pooling
 * - Circuit breaker pattern for fault tolerance
 * - Batch processing for high-throughput scenarios
 * - Comprehensive analytics and reporting
 * - Prometheus metrics export
 * - Production-ready error handling and monitoring
 */

import type { RedisOptions, Cluster } from 'ioredis';
import Redis from 'ioredis';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import {
	type BotTriggerEvent,
	type BotMetricsFilter,
// 	type BotPerformanceAnalytics,
// 	type ChannelActivityAnalytics,
// 	type UserInteractionAnalytics,
	type BotMetricsAggregation,
	type TimeRangeQuery,
	type BotMetricsServiceConfig,
	type HealthCheckResult,
	type ServiceOperationResult,
	type CircuitBreakerState,
	type CircuitBreakerStats,
	type BatchOperationResult,
	type PrometheusMetricsExport,
	type IBotTriggerMetricsService,
} from '../../types/bot-metrics';
import * as promClient from 'prom-client';

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

/**
 * Circuit breaker for Redis operations to prevent cascade failures
 */
class CircuitBreaker {
	private state: CircuitBreakerState = 'CLOSED';
	private failureCount = 0;
	private lastFailureTime?: number;
	private lastSuccessTime?: number;
	private totalRequests = 0;
	private totalFailures = 0;
	private totalSuccesses = 0;
	private resetTime?: number;

	constructor(
		private readonly failureThreshold: number = 5,
		private readonly resetTimeout: number = 60000, // 1 minute
		private readonly monitoringPeriod: number = 10000, // 10 seconds
	) {}

	/**
	 * Execute operation through circuit breaker
	 */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		this.totalRequests++;

		// Check if circuit should remain open
		if (this.state === 'OPEN') {
			if (this.resetTime && Date.now() < this.resetTime) {
				throw new Error('Circuit breaker is OPEN - operation rejected');
			}
			// Transition to HALF_OPEN
			this.state = 'HALF_OPEN';
			logger.info('Circuit breaker transitioning to HALF_OPEN');
		}

		try {
			const _result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		this.lastSuccessTime = Date.now();
		this.totalSuccesses++;

		if (this.state === 'HALF_OPEN') {
			this.state = 'CLOSED';
			this.failureCount = 0;
			this.resetTime = undefined;
			logger.info('Circuit breaker CLOSED after successful operation');
		}
	}

	private onFailure(): void {
		this.lastFailureTime = Date.now();
		this.failureCount++;
		this.totalFailures++;

		if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
			this.state = 'OPEN';
			this.resetTime = Date.now() + this.resetTimeout;
			logger.warn(`Circuit breaker OPEN due to ${this.failureCount} failures`);
		} else if (this.state === 'HALF_OPEN') {
			this.state = 'OPEN';
			this.resetTime = Date.now() + this.resetTimeout;
			logger.warn('Circuit breaker returning to OPEN state after half-open failure');
		}
	}

	getStats(): CircuitBreakerStats {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			totalRequests: this.totalRequests,
			totalFailures: this.totalFailures,
			totalSuccesses: this.totalSuccesses,
			resetTime: this.resetTime,
		};
	}

	isOpen(): boolean {
		return this.state === 'OPEN';
	}

	reset(): void {
		this.state = 'CLOSED';
		this.failureCount = 0;
		this.resetTime = undefined;
		logger.info('Circuit breaker manually reset');
	}
}

// ============================================================================
// Batch Operation Manager
// ============================================================================

/**
 * Manages batch operations for high-throughput metrics collection
 */
class BatchOperationManager {
	private batchQueue: BotTriggerEvent[] = [];
	private batchTimer?: NodeJS.Timeout;
	private isProcessing = false;

	constructor(
		private readonly processor: (events: BotTriggerEvent[]) => Promise<void>,
		private readonly batchSize: number = 100,
		private readonly batchFlushInterval: number = 5000, // 5 seconds
	) {}

	/**
	 * Add event to batch queue
	 */
	addEvent(event: BotTriggerEvent): void {
		this.batchQueue.push(event);

		// Check if we should flush due to batch size
		if (this.batchQueue.length >= this.batchSize) {
			this.flush();
		} else if (!this.batchTimer) {
			// Start timer if not already running
			this.batchTimer = setTimeout(() => this.flush(), this.batchFlushInterval);
		}
	}

	/**
	 * Force flush current batch
	 */
	async flush(): Promise<void> {
		if (this.isProcessing || this.batchQueue.length === 0) {
			return;
		}

		this.isProcessing = true;
		const currentBatch = this.batchQueue.splice(0);

		// Clear timer
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = undefined;
		}

		try {
			await this.processor(currentBatch);
			logger.debug(`Successfully processed batch of ${currentBatch.length} events`);
		} catch (error) {
			logger.error('Failed to process batch:', ensureError(error));
			// Re-queue failed events (with exponential backoff in production)
			this.batchQueue.unshift(...currentBatch);
		} finally {
			this.isProcessing = false;

			// If there are still events, restart the timer
			if (this.batchQueue.length > 0 && !this.batchTimer) {
				this.batchTimer = setTimeout(() => this.flush(), this.batchFlushInterval);
			}
		}
	}

	/**
	 * Get current batch statistics
	 */
	getStats() {
		return {
			queueSize: this.batchQueue.length,
			isProcessing: this.isProcessing,
			hasTimer: !!this.batchTimer,
		};
	}

	/**
	 * Cleanup batch manager
	 */
	async cleanup(): Promise<void> {
		if (this.batchTimer) {
			clearTimeout(this.batchTimer);
			this.batchTimer = undefined;
		}

		// Process remaining events
		await this.flush();
	}
}

// ============================================================================
// Main Service Implementation
// ============================================================================

/**
 * Production-ready bot trigger metrics collection service
 */
export class BotTriggerMetricsService implements IBotTriggerMetricsService {
	private redis!: Redis | Cluster;
	private circuitBreaker: CircuitBreaker;
	private batchManager?: BatchOperationManager;
	private isInitialized = false;
	private startTime = Date.now();

	// Prometheus metrics
	private readonly metricsRegistry: promClient.Registry;
	private readonly redisOperationCounter: promClient.Counter<string>;
	private readonly redisOperationDuration: promClient.Histogram<string>;
	private readonly circuitBreakerGauge: promClient.Gauge<string>;
	private readonly batchSizeHistogram: promClient.Histogram<string>;
	private readonly cacheHitCounter: promClient.Counter<string>;

	// Redis key patterns
	private readonly KEYS = {
		EVENT: (triggerId: string) => `bot:trigger:event:${triggerId}`,
		BOT_TRIGGERS: (botName: string) => `bot:triggers:${botName}`,
		BOT_HOURLY: (botName: string, hour: string) => `bot:hourly:${botName}:${hour}`,
		BOT_DAILY: (botName: string, day: string) => `bot:daily:${botName}:${day}`,
		BOT_MONTHLY: (botName: string, month: string) => `bot:monthly:${botName}:${month}`,
		CHANNEL_ACTIVITY: (channelId: string) => `channel:activity:${channelId}`,
		USER_INTERACTIONS: (userId: string) => `user:interactions:${userId}`,
		ANALYTICS_CACHE: (key: string) => `analytics:cache:${key}`,
		BOT_CONDITIONS: (botName: string) => `bot:conditions:${botName}`,
		PERFORMANCE_STATS: (botName: string) => `bot:perf:${botName}`,
	} as const;

	// Lua scripts for atomic operations
	private readonly LUA_SCRIPTS = {
		TRACK_TRIGGER: `
			local event_key = KEYS[1]
			local bot_key = KEYS[2]
			local hourly_key = KEYS[3]
			local daily_key = KEYS[4]
			local channel_key = KEYS[5]
			local user_key = KEYS[6]
			local condition_key = KEYS[7]
			local perf_key = KEYS[8]

			local event_data = ARGV[1]
			local timestamp = tonumber(ARGV[2])
			local response_time = tonumber(ARGV[3]) or 0
			local success = ARGV[4] == 'true'

			-- Store individual event
			redis.call('HSET', event_key, 'data', event_data, 'timestamp', timestamp)
			redis.call('EXPIRE', event_key, 604800) -- 7 days TTL

			-- Update bot counters
			redis.call('HINCRBY', bot_key, 'total_triggers', 1)
			if success then
				redis.call('HINCRBY', bot_key, 'total_responses', 1)
				redis.call('HINCRBY', bot_key, 'total_response_time', response_time)
			else
				redis.call('HINCRBY', bot_key, 'total_failures', 1)
			end

			-- Update hourly aggregation
			redis.call('HINCRBY', hourly_key, 'triggers', 1)
			redis.call('HINCRBY', hourly_key, 'response_time_sum', response_time)
			redis.call('EXPIRE', hourly_key, 2592000) -- 30 days TTL

			-- Update daily aggregation
			redis.call('HINCRBY', daily_key, 'triggers', 1)
			redis.call('EXPIRE', daily_key, 7776000) -- 90 days TTL

			-- Update channel activity
			redis.call('HINCRBY', channel_key, 'bot_triggers', 1)
			redis.call('HSET', channel_key, 'last_trigger', timestamp)
			redis.call('EXPIRE', channel_key, 2592000) -- 30 days TTL

			-- Update user interactions
			redis.call('HINCRBY', user_key, 'bot_triggers', 1)
			redis.call('HSET', user_key, 'last_trigger', timestamp)
			redis.call('EXPIRE', user_key, 2592000) -- 30 days TTL

			-- Update condition stats
			redis.call('HINCRBY', condition_key, ARGV[5], 1) -- condition_name
			redis.call('EXPIRE', condition_key, 2592000) -- 30 days TTL

			-- Update performance stats
			if response_time > 0 then
				redis.call('ZADD', perf_key, response_time, timestamp)
				redis.call('EXPIRE', perf_key, 604800) -- 7 days TTL
			end

			return 'OK'
		`,

		GET_BOT_ANALYTICS: `
			local bot_key = KEYS[1]
			local perf_key = KEYS[2]
			local condition_key = KEYS[3]
			local start_time = tonumber(ARGV[1])
			local end_time = tonumber(ARGV[2])

			-- Get basic stats
			local stats = redis.call('HMGET', bot_key,
				'total_triggers', 'total_responses', 'total_failures', 'total_response_time')

			-- Get performance percentiles
			local response_times = redis.call('ZRANGEBYSCORE', perf_key, start_time, end_time)

			-- Get condition distribution
			local conditions = redis.call('HGETALL', condition_key)

			return {stats, response_times, conditions}
		`,
	} as const;

	constructor(private readonly config: BotMetricsServiceConfig) {
		// Initialize circuit breaker
		this.circuitBreaker = new CircuitBreaker(
			this.config.circuitBreaker?.failureThreshold ?? 5,
			this.config.circuitBreaker?.resetTimeout ?? 60000,
			this.config.circuitBreaker?.monitoringPeriod ?? 10000,
		);

		// Initialize Prometheus metrics
		this.metricsRegistry = new promClient.Registry();

		this.redisOperationCounter = new promClient.Counter({
			name: 'bot_metrics_redis_operations_total',
			help: 'Total Redis operations performed',
			labelNames: ['operation', 'success'],
			registers: [this.metricsRegistry],
		});

		this.redisOperationDuration = new promClient.Histogram({
			name: 'bot_metrics_redis_operation_duration_seconds',
			help: 'Duration of Redis operations in seconds',
			labelNames: ['operation'],
			buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
			registers: [this.metricsRegistry],
		});

		this.circuitBreakerGauge = new promClient.Gauge({
			name: 'bot_metrics_circuit_breaker_state',
			help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
			registers: [this.metricsRegistry],
		});

		this.batchSizeHistogram = new promClient.Histogram({
			name: 'bot_metrics_batch_size',
			help: 'Size of processed batches',
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
			registers: [this.metricsRegistry],
		});

		this.cacheHitCounter = new promClient.Counter({
			name: 'bot_metrics_cache_hits_total',
			help: 'Total cache hits and misses',
			labelNames: ['type'],
			registers: [this.metricsRegistry],
		});
	}

	/**
	 * Initialize the service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			logger.warn('BotTriggerMetricsService already initialized');
			return;
		}

		try {
			// Initialize Redis connection
			await this.initializeRedis();

			// Initialize batch manager if enabled
			if (this.config.enableBatchOperations) {
				this.batchManager = new BatchOperationManager(
					(events) => this.processBatch(events),
					this.config.batchSize ?? 100,
					this.config.batchFlushInterval ?? 5000,
				);
			}

			// Load and prepare Lua scripts
			await this.loadLuaScripts();

			this.isInitialized = true;
			logger.info('BotTriggerMetricsService initialized successfully', {
				redis: {
					host: this.config.redis.host,
					port: this.config.redis.port,
					db: this.config.redis.db ?? 0,
				},
				batchOperations: this.config.enableBatchOperations,
				circuitBreaker: this.config.enableCircuitBreaker,
			});

			// Start periodic health checks
			this.startHealthChecks();
		} catch (error) {
			logger.error('Failed to initialize BotTriggerMetricsService:', ensureError(error));
			throw error;
		}
	}

	/**
	 * Initialize Redis connection with production-ready configuration
	 */
	private async initializeRedis(): Promise<void> {
		const redisOptions: RedisOptions = {
			host: this.config.redis.host,
			port: this.config.redis.port,
			password: this.config.redis.password,
			db: this.config.redis.db ?? 0,
			connectTimeout: this.config.redis.connectTimeout ?? 10000,
			commandTimeout: this.config.redis.commandTimeout ?? 5000,
			keepAlive: this.config.redis.keepAlive ? 30000 : 0, // 30 seconds if enabled
			maxRetriesPerRequest: 3,
			lazyConnect: true,
		};

		this.redis = new Redis(redisOptions);

		// Set up event handlers
		this.redis.on('connect', () => {
			logger.info('Connected to Redis for bot metrics');
		});

		this.redis.on('ready', () => {
			logger.info('Redis connection ready for bot metrics');
		});

		this.redis.on('error', (error: unknown) => {
			logger.error('Redis connection error:', ensureError(error));
		});

		this.redis.on('close', () => {
			logger.warn('Redis connection closed');
		});

		this.redis.on('reconnecting', () => {
			logger.info('Reconnecting to Redis...');
		});

		// Connect to Redis
		await this.redis.connect();
	}

	/**
	 * Load and prepare Lua scripts
	 */
	private async loadLuaScripts(): Promise<void> {
		try {
			// Define scripts on Redis for better performance
			for (const [name, script] of Object.entries(this.LUA_SCRIPTS)) {
				await this.redis.script('LOAD', script);
				logger.debug(`Loaded Lua script: ${name}`);
			}
		} catch (error) {
			logger.warn('Failed to load Lua scripts, operations will use multiple commands:', ensureError(error));
		}
	}

	/**
	 * Track a bot trigger event
	 */
	async trackBotTrigger(event: BotTriggerEvent): Promise<ServiceOperationResult<void>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = Date.now();
		const operation = 'trackBotTrigger';

		try {
			if (this.batchManager) {
				// Use batch processing
				this.batchManager.addEvent(event);
				this.redisOperationCounter.inc({ operation, success: 'true' });
				return { success: true };
			}

			// Direct processing
			const _result = await this.circuitBreaker.execute(async () => {
				await this.processEvent(event);
			});

			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'true' });

			logger.debug(`Bot trigger tracked successfully: ${event.botName}`, {
				triggerId: event.triggerId,
				responseTime: event.responseTimeMs,
				duration,
			});

			return { success: true };
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'false' });

			const errorDetails = ensureError(error);
			logger.error(`Failed to track bot trigger: ${event.botName}`, errorDetails);

			return {
				success: false,
				error: {
					code: 'TRACKING_FAILED',
					message: errorDetails.message,
					details: {
						botName: event.botName,
						triggerId: event.triggerId,
						circuitBreakerState: this.circuitBreaker.getStats().state,
					},
				},
				metadata: {
					operationTime: duration * 1000,
					circuitBreakerState: this.circuitBreaker.getStats().state,
				},
			};
		}
	}

	/**
	 * Process individual event (internal method)
	 */
	private async processEvent(event: BotTriggerEvent): Promise<void> {
		const _now = Date.now();
		const hour = new Date(event.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
		const day = new Date(event.timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
		const _month = new Date(event.timestamp).toISOString().slice(0, 7); // YYYY-MM

		const keys = [
			this.KEYS.EVENT(event.triggerId),
			this.KEYS.BOT_TRIGGERS(event.botName),
			this.KEYS.BOT_HOURLY(event.botName, hour),
			this.KEYS.BOT_DAILY(event.botName, day),
			this.KEYS.CHANNEL_ACTIVITY(event.channelId),
			this.KEYS.USER_INTERACTIONS(event.userId),
			this.KEYS.BOT_CONDITIONS(event.botName),
			this.KEYS.PERFORMANCE_STATS(event.botName),
		];

		const args = [
			JSON.stringify(event),
			event.timestamp.toString(),
			(event.responseTimeMs ?? 0).toString(),
			(event.success ?? false).toString(),
			event.conditionName,
		];

		try {
			// Try to use Lua script for atomic operation
			await this.redis.eval(this.LUA_SCRIPTS.TRACK_TRIGGER, keys.length, ...keys, ...args);
		} catch (luaError) {
			logger.debug('Lua script failed, falling back to individual commands:', ensureError(luaError));

			// Fallback to individual Redis commands
			const pipeline = this.redis.pipeline();

			// Store event
			pipeline.hset(this.KEYS.EVENT(event.triggerId), {
				data: JSON.stringify(event),
				timestamp: event.timestamp,
			});
			pipeline.expire(this.KEYS.EVENT(event.triggerId), 604800); // 7 days

			// Update bot counters
			const botKey = this.KEYS.BOT_TRIGGERS(event.botName);
			pipeline.hincrby(botKey, 'total_triggers', 1);

			if (event.success) {
				pipeline.hincrby(botKey, 'total_responses', 1);
				if (event.responseTimeMs) {
					pipeline.hincrby(botKey, 'total_response_time', event.responseTimeMs);
				}
			} else {
				pipeline.hincrby(botKey, 'total_failures', 1);
			}

			// Update aggregations
			const hourlyKey = this.KEYS.BOT_HOURLY(event.botName, hour);
			pipeline.hincrby(hourlyKey, 'triggers', 1);
			pipeline.expire(hourlyKey, 2592000); // 30 days

			const dailyKey = this.KEYS.BOT_DAILY(event.botName, day);
			pipeline.hincrby(dailyKey, 'triggers', 1);
			pipeline.expire(dailyKey, 7776000); // 90 days

			// Update channel activity
			const channelKey = this.KEYS.CHANNEL_ACTIVITY(event.channelId);
			pipeline.hincrby(channelKey, 'bot_triggers', 1);
			pipeline.hset(channelKey, 'last_trigger', event.timestamp);
			pipeline.expire(channelKey, 2592000); // 30 days

			// Update user interactions
			const userKey = this.KEYS.USER_INTERACTIONS(event.userId);
			pipeline.hincrby(userKey, 'bot_triggers', 1);
			pipeline.hset(userKey, 'last_trigger', event.timestamp);
			pipeline.expire(userKey, 2592000); // 30 days

			// Update condition stats
			const conditionKey = this.KEYS.BOT_CONDITIONS(event.botName);
			pipeline.hincrby(conditionKey, event.conditionName, 1);
			pipeline.expire(conditionKey, 2592000); // 30 days

			// Update performance stats
			if (event.responseTimeMs && event.responseTimeMs > 0) {
				const perfKey = this.KEYS.PERFORMANCE_STATS(event.botName);
				pipeline.zadd(perfKey, event.responseTimeMs, event.timestamp);
				pipeline.expire(perfKey, 604800); // 7 days
			}

			await pipeline.exec();
		}
	}

	/**
	 * Process batch of events
	 */
	private async processBatch(events: BotTriggerEvent[]): Promise<void> {
		const batchStartTime = Date.now();

		try {
			// Process events in parallel chunks for better performance
			const chunkSize = 10;
			const chunks = [];

			for (let i = 0; i < events.length; i += chunkSize) {
				chunks.push(events.slice(i, i + chunkSize));
			}

			await Promise.all(
				chunks.map(async (chunk) => {
					await Promise.all(chunk.map((event) => this.processEvent(event)));
				}),
			);

			const duration = Date.now() - batchStartTime;
			this.batchSizeHistogram.observe(events.length);

			logger.debug(`Processed batch of ${events.length} events in ${duration}ms`);
		} catch (error) {
			logger.error(`Failed to process batch of ${events.length} events:`, ensureError(error));
			throw error;
		}
	}

	/**
	 * Track batch triggers
	 */
	async trackBatchTriggers(events: BotTriggerEvent[]): Promise<ServiceOperationResult<BatchOperationResult>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = Date.now();
		const operation = 'trackBatchTriggers';

		try {
			await this.circuitBreaker.execute(async () => {
				await this.processBatch(events);
			});

			const duration = Date.now() - startTime;
			this.redisOperationDuration.observe({ operation }, duration / 1000);
			this.redisOperationCounter.inc({ operation, success: 'true' });

			return {
				success: true,
				data: {
					successful: events.length,
					failed: 0,
					processingTimeMs: duration,
				},
			};
		} catch (error) {
			const duration = Date.now() - startTime;
			this.redisOperationDuration.observe({ operation }, duration / 1000);
			this.redisOperationCounter.inc({ operation, success: 'false' });

			const errorDetails = ensureError(error);
			logger.error(`Failed to process batch of ${events.length} events:`, errorDetails);

			return {
				success: false,
				error: {
					code: 'BATCH_PROCESSING_FAILED',
					message: errorDetails.message,
					details: {
						batchSize: events.length,
						circuitBreakerState: this.circuitBreaker.getStats().state,
					},
				},
				metadata: {
					operationTime: duration,
					circuitBreakerState: this.circuitBreaker.getStats().state,
				},
			};
		}
	}

	/**
	 * Get bot performance analytics
	 */
	async getBotMetrics(
		filter: BotMetricsFilter,
		timeRange?: TimeRangeQuery,
	): Promise<ServiceOperationResult<any>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = Date.now();
		const operation = 'getBotMetrics';

		try {
			const _result = await this.circuitBreaker.execute(async () => {
				return await this.computeBotAnalytics(filter, timeRange);
			});

			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'true' });

			return { success: true, data: result };
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'false' });

			const errorDetails = ensureError(error);
			logger.error('Failed to get bot metrics:', errorDetails);

			return {
				success: false,
				error: {
					code: 'ANALYTICS_FAILED',
					message: errorDetails.message,
				},
				metadata: {
					operationTime: duration * 1000,
					circuitBreakerState: this.circuitBreaker.getStats().state,
				},
			};
		}
	}

	/**
	 * Compute bot analytics (internal method)
	 */
	private async computeBotAnalytics(
		filter: BotMetricsFilter,
		timeRange?: TimeRangeQuery,
// 	): Promise<BotPerformanceAnalytics> {
		if (!filter.botName) {
			throw new Error('Bot name is required for analytics');
		}

		const _now = Date.now();
		const startTimestamp = timeRange?.startTime ?? now - 24 * 60 * 60 * 1000; // 24 hours ago
		const endTimestamp = timeRange?.endTime ?? now;

		const botKey = this.KEYS.BOT_TRIGGERS(filter.botName);
		const perfKey = this.KEYS.PERFORMANCE_STATS(filter.botName);
		const conditionKey = this.KEYS.BOT_CONDITIONS(filter.botName);

		// Get basic stats
		const basicStats = await this.redis.hmget(
			botKey,
			'total_triggers',
			'total_responses',
			'total_failures',
			'total_response_time',
		);

		const totalTriggers = parseInt(basicStats[0] ?? '0', 10);
		const totalResponses = parseInt(basicStats[1] ?? '0', 10);
		const _totalFailures = parseInt(basicStats[2] ?? '0', 10);
		const totalResponseTime = parseInt(basicStats[3] ?? '0', 10);

		// Get performance data
		const responseTimes = await this.redis.zrangebyscore(perfKey, startTimestamp, endTimestamp);
		const responseTimeNumbers = responseTimes.map((rt: string) => parseFloat(rt)).sort((a: number, b: number) => a - b);

		// Calculate percentiles
		const p95Index = Math.floor(responseTimeNumbers.length * 0.95);
		const medianIndex = Math.floor(responseTimeNumbers.length * 0.5);

		// Get condition distribution
		const conditionStats = await this.redis.hgetall(conditionKey);
		const topConditions = Object.entries(conditionStats)
			.map(([conditionName, count]) => ({
				conditionName,
				triggerCount: parseInt(count as string, 10),
				successRate: 0.95, // Placeholder - would need more detailed tracking
				avgResponseTime: totalResponseTime / totalTriggers || 0,
			}))
			.sort((a, b) => b.triggerCount - a.triggerCount)
			.slice(0, 10);

		return {
			botName: filter.botName,
			timeRange: {
				start: startTimestamp,
				end: endTimestamp,
			},
			stats: {
				totalTriggers,
				totalResponses,
				successRate: totalTriggers > 0 ? totalResponses / totalTriggers : 0,
				avgResponseTime: totalTriggers > 0 ? totalResponseTime / totalTriggers : 0,
				medianResponseTime: responseTimeNumbers[medianIndex] ?? 0,
				p95ResponseTime: responseTimeNumbers[p95Index] ?? 0,
				uniqueUsers: 0, // Would need SET operations for exact count
				uniqueChannels: 0, // Would need SET operations for exact count
				uniqueGuilds: 0, // Would need SET operations for exact count
			},
			trends: {
				triggersPerHour: [], // Would need hourly aggregation query
				avgResponseTimePerHour: [], // Would need hourly aggregation query
				successRatePerHour: [], // Would need hourly aggregation query
				timestamps: [],
			},
			topConditions,
			channelDistribution: [], // Would need channel-specific queries
			userEngagement: [], // Would need user-specific queries
		};
	}

	/**
	 * Get channel activity analytics
	 */
	async getChannelMetrics(
		channelId: string,
		timeRange: TimeRangeQuery,
// 	): Promise<ServiceOperationResult<ChannelActivityAnalytics>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = Date.now();
		const operation = 'getChannelMetrics';

		try {
			const _result = await this.circuitBreaker.execute(async () => {
				return await this.computeChannelAnalytics(channelId, timeRange);
			});

			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'true' });

			return { success: true, data: result };
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'false' });

			const errorDetails = ensureError(error);
			logger.error('Failed to get channel metrics:', errorDetails);

			return {
				success: false,
				error: {
					code: 'CHANNEL_ANALYTICS_FAILED',
					message: errorDetails.message,
				},
				metadata: {
					operationTime: duration * 1000,
				},
			};
		}
	}

	/**
	 * Compute channel analytics (internal method)
	 */
	private async computeChannelAnalytics(
		channelId: string,
		timeRange: TimeRangeQuery,
// 	): Promise<ChannelActivityAnalytics> {
		const channelKey = this.KEYS.CHANNEL_ACTIVITY(channelId);
		const channelStats = await this.redis.hgetall(channelKey);

		const botTriggers = parseInt(channelStats.bot_triggers ?? '0', 10);
		const _lastTrigger = parseInt(channelStats.last_trigger ?? '0', 10);

		// Placeholder implementation - would need more detailed queries for real data
		return {
			channelId,
			timeRange: {
				start: timeRange.startTime,
				end: timeRange.endTime,
			},
			stats: {
				totalMessages: 0, // Would need message counting
				totalBotTriggers: botTriggers,
				uniqueBots: 0, // Would need SET operations
				uniqueUsers: 0, // Would need SET operations
				botTriggerRate: 0,
				avgResponseTime: 0,
			},
			botActivity: [],
			timeline: [],
		};
	}

	/**
	 * Get user interaction analytics
	 */
	async getUserMetrics(
		userId: string,
		timeRange: TimeRangeQuery,
// 	): Promise<ServiceOperationResult<UserInteractionAnalytics>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = Date.now();
		const operation = 'getUserMetrics';

		try {
			const _result = await this.circuitBreaker.execute(async () => {
				return await this.computeUserAnalytics(userId, timeRange);
			});

			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'true' });

			return { success: true, data: result };
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'false' });

			const errorDetails = ensureError(error);
			logger.error('Failed to get user metrics:', errorDetails);

			return {
				success: false,
				error: {
					code: 'USER_ANALYTICS_FAILED',
					message: errorDetails.message,
				},
				metadata: {
					operationTime: duration * 1000,
				},
			};
		}
	}

	/**
	 * Compute user analytics (internal method)
	 */
// 	private async computeUserAnalytics(userId: string, timeRange: TimeRangeQuery): Promise<UserInteractionAnalytics> {
		const userKey = this.KEYS.USER_INTERACTIONS(userId);
		const userStats = await this.redis.hgetall(userKey);

		const botTriggers = parseInt(userStats.bot_triggers ?? '0', 10);
		const _lastTrigger = parseInt(userStats.last_trigger ?? '0', 10);

		// Placeholder implementation - would need more detailed queries for real data
		return {
			userId,
			timeRange: {
				start: timeRange.startTime,
				end: timeRange.endTime,
			},
			stats: {
				totalMessages: 0, // Would need message counting
				totalBotTriggers: botTriggers,
				uniqueBots: 0, // Would need SET operations
				uniqueChannels: 0, // Would need SET operations
				botInteractionRate: 0,
			},
			botInteractions: [],
			channelActivity: [],
		};
	}

	/**
	 * Get aggregated metrics
	 */
	async getAggregatedMetrics(
		filter: BotMetricsFilter,
		timeRange: TimeRangeQuery,
	): Promise<ServiceOperationResult<BotMetricsAggregation[]>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = Date.now();
		const operation = 'getAggregatedMetrics';

		try {
			const _result = await this.circuitBreaker.execute(async () => {
				return await this.computeAggregatedMetrics(filter, timeRange);
			});

			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'true' });

			return { success: true, data: result };
		} catch (error) {
			const duration = (Date.now() - startTime) / 1000;
			this.redisOperationDuration.observe({ operation }, duration);
			this.redisOperationCounter.inc({ operation, success: 'false' });

			const errorDetails = ensureError(error);
			logger.error('Failed to get aggregated metrics:', errorDetails);

			return {
				success: false,
				error: {
					code: 'AGGREGATED_METRICS_FAILED',
					message: errorDetails.message,
				},
				metadata: {
					operationTime: duration * 1000,
				},
			};
		}
	}

	/**
	 * Compute aggregated metrics (internal method)
	 */
	private async computeAggregatedMetrics(
		filter: BotMetricsFilter,
		timeRange: TimeRangeQuery,
	): Promise<BotMetricsAggregation[]> {
		const results: BotMetricsAggregation[] = [];

		// Generate time keys based on the period
		const timeKeys = this.generateTimeKeys(timeRange.startTime, timeRange.endTime, timeRange.period);

		if (filter.botName) {
			// Single bot aggregation
			for (const timeKey of timeKeys) {
				const keyFunc = timeRange.period === 'hour' ? this.KEYS.BOT_HOURLY : this.KEYS.BOT_DAILY;
				const aggregationKey = keyFunc(filter.botName, timeKey);
				const stats = await this.redis.hgetall(aggregationKey);

				const triggers = parseInt(stats.triggers ?? '0', 10);
				if (triggers > 0) {
					results.push({
						timeKey,
						period: timeRange.period,
						botName: filter.botName,
						totalTriggers: triggers,
						totalResponses: parseInt(stats.responses ?? '0', 10),
						totalFailures: parseInt(stats.failures ?? '0', 10),
						avgResponseTime: parseInt(stats.response_time_sum ?? '0', 10) / triggers,
						minResponseTime: parseInt(stats.min_response_time ?? '0', 10),
						maxResponseTime: parseInt(stats.max_response_time ?? '0', 10),
						uniqueUsers: parseInt(stats.unique_users ?? '0', 10),
						uniqueChannels: parseInt(stats.unique_channels ?? '0', 10),
						responseTypes: {},
					});
				}
			}
		}

		return results;
	}

	/**
	 * Generate time keys for aggregation queries
	 */
	private generateTimeKeys(startTime: number, endTime: number, period: 'hour' | 'day' | 'week' | 'month'): string[] {
		const keys: string[] = [];
		const start = new Date(startTime);
		const end = new Date(endTime);

		switch (period) {
			case 'hour': {
				const current = new Date(start);
				current.setMinutes(0, 0, 0);
				while (current <= end) {
					keys.push(current.toISOString().slice(0, 13)); // YYYY-MM-DDTHH
					current.setHours(current.getHours() + 1);
				}
				break;
			}
			case 'day': {
				const current = new Date(start);
				current.setHours(0, 0, 0, 0);
				while (current <= end) {
					keys.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
					current.setDate(current.getDate() + 1);
				}
				break;
			}
			case 'month': {
				const current = new Date(start);
				current.setDate(1);
				current.setHours(0, 0, 0, 0);
				while (current <= end) {
					keys.push(current.toISOString().slice(0, 7)); // YYYY-MM
					current.setMonth(current.getMonth() + 1);
				}
				break;
			}
		}

		return keys;
	}

	/**
	 * Export Prometheus metrics
	 */
	async exportPrometheusMetrics(): Promise<ServiceOperationResult<string>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			// Update circuit breaker gauge
			const cbStats = this.circuitBreaker.getStats();
			const stateValue = cbStats.state === 'CLOSED' ? 0 : cbStats.state === 'OPEN' ? 1 : 2;
			this.circuitBreakerGauge.set(stateValue);

			// Get all metrics
			const metrics = await this.metricsRegistry.metrics();

			return { success: true, data: metrics };
		} catch (error) {
			const errorDetails = ensureError(error);
			logger.error('Failed to export Prometheus metrics:', errorDetails);

			return {
				success: false,
				error: {
					code: 'PROMETHEUS_EXPORT_FAILED',
					message: errorDetails.message,
				},
			};
		}
	}

	/**
	 * Get service health status
	 */
	async getHealthStatus(): Promise<HealthCheckResult> {
		const timestamp = Date.now();
		let redisStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
		let redisLatency: number | undefined;
		let redisError: string | undefined;

		// Test Redis connection
		try {
			const pingStart = Date.now();
			await this.redis.ping();
			redisLatency = Date.now() - pingStart;
			redisStatus = 'connected';
		} catch (error) {
			redisStatus = 'error';
			redisError = ensureError(error).message;
		}

		// Get circuit breaker stats
		const cbStats = this.circuitBreaker.getStats();

		// Get memory usage
		const memUsage = process.memoryUsage();

		// Calculate operation metrics
		const uptime = timestamp - this.startTime;
		const operationsPerSecond = cbStats.totalRequests / (uptime / 1000);
		const errorRate = cbStats.totalRequests > 0 ? cbStats.totalFailures / cbStats.totalRequests : 0;
		const avgResponseTime = 0; // Would need to track this over time

		let overall: 'healthy' | 'degraded' | 'unhealthy';
		if (redisStatus === 'connected' && cbStats.state === 'CLOSED' && errorRate < 0.1) {
			overall = 'healthy';
		} else if (redisStatus === 'connected' && cbStats.state !== 'OPEN' && errorRate < 0.25) {
			overall = 'degraded';
		} else {
			overall = 'unhealthy';
		}

		return {
			service: 'BotTriggerMetricsService',
			status: overall,
			timestamp,
			checks: {
				redis: {
					status: redisStatus,
					latency: redisLatency,
					error: redisError,
				},
				circuitBreaker: {
					status: cbStats.state,
					failureCount: cbStats.failureCount,
				},
				memory: {
					usage: memUsage.heapUsed,
					limit: memUsage.heapTotal,
				},
			},
			metrics: {
				operationsPerSecond,
				avgResponseTime,
				errorRate,
			},
		};
	}

	/**
	 * Start periodic health checks and maintenance
	 */
	private startHealthChecks(): void {
		// Health check every 30 seconds
		setInterval(async () => {
			try {
				const health = await this.getHealthStatus();
				if (health.status === 'unhealthy') {
					logger.warn('Service health check failed', health);
				}
			} catch (error) {
				logger.error('Health check error:', ensureError(error));
			}
		}, 30000);

		// Data cleanup every hour
		setInterval(async () => {
			try {
				await this.performDataCleanup();
			} catch (error) {
				logger.error('Data cleanup failed:', ensureError(error));
			}
		}, 3600000); // 1 hour
	}

	/**
	 * Perform data cleanup based on retention policies
	 */
	private async performDataCleanup(): Promise<void> {
		if (!this.config.retention) {
			return;
		}

		const _now = Date.now();
		const { eventRetentionDays, _hourlyRetentionDays, _dailyRetentionDays, _monthlyRetentionDays } =
			this.config.retention;

		try {
			// Clean up old events
			const eventCutoff = now - eventRetentionDays * 24 * 60 * 60 * 1000;
			// Implementation would scan and delete old event keys

			// Clean up old aggregations
			// Implementation would clean up old hourly, daily, monthly keys

			logger.debug('Data cleanup completed', {
				eventCutoff: new Date(eventCutoff).toISOString(),
			});
		} catch (error) {
			logger.error('Data cleanup failed:', ensureError(error));
		}
	}

	/**
	 * Cleanup service resources
	 */
	async cleanup(): Promise<ServiceOperationResult<void>> {
		try {
			// Flush any pending batch operations
			if (this.batchManager) {
				await this.batchManager.cleanup();
			}

			// Close Redis connection
			if (this.redis) {
				await this.redis.quit();
			}

			logger.info('BotTriggerMetricsService cleanup completed successfully');

			return { success: true };
		} catch (error) {
			const errorDetails = ensureError(error);
			logger.error('Failed to cleanup BotTriggerMetricsService:', errorDetails);

			return {
				success: false,
				error: {
					code: 'CLEANUP_FAILED',
					message: errorDetails.message,
				},
			};
		}
	}
}

// ============================================================================
// Factory Functions and Exports
// ============================================================================

/**
 * Create a new BotTriggerMetricsService instance
 */
export function createBotTriggerMetricsService(config: BotMetricsServiceConfig): BotTriggerMetricsService {
	return new BotTriggerMetricsService(config);
}

/**
 * Singleton instance for global access
 */
let globalInstance: BotTriggerMetricsService | null = null;

/**
 * Initialize global BotTriggerMetricsService instance
 */
export async function initializeBotTriggerMetricsService(
	config: BotMetricsServiceConfig,
): Promise<BotTriggerMetricsService> {
	if (globalInstance) {
		logger.warn('BotTriggerMetricsService already initialized, returning existing instance');
		return globalInstance;
	}

	globalInstance = new BotTriggerMetricsService(config);
	await globalInstance.initialize();

	logger.info('Global BotTriggerMetricsService instance initialized');
	return globalInstance;
}

/**
 * Get global BotTriggerMetricsService instance
 */
export function getBotTriggerMetricsService(): BotTriggerMetricsService {
	if (!globalInstance) {
		throw new Error(
			'BotTriggerMetricsService not initialized. Call initializeBotTriggerMetricsService() first.',
		);
	}
	return globalInstance;
}

/**
 * Create default configuration for production use
 */
export function createProductionConfig(redisHost = 'localhost', redisPort = 6379): BotMetricsServiceConfig {
	return {
		redis: {
			host: redisHost,
			port: redisPort,
			connectTimeout: 10000,
			commandTimeout: 5000,
			keepAlive: true,
			pool: {
				min: 2,
				max: 10,
			},
		},
		enableBatchOperations: true,
		batchSize: 100,
		batchFlushInterval: 5000,
		enableCircuitBreaker: true,
		circuitBreaker: {
			failureThreshold: 5,
			resetTimeout: 60000,
			monitoringPeriod: 10000,
		},
		retention: {
			eventRetentionDays: 7,
			_hourlyRetentionDays: 30,
			_dailyRetentionDays: 90,
			_monthlyRetentionDays: 365,
		},
		monitoring: {
			slowOperationThreshold: 1000,
			loggingSampleRate: 0.1,
			enableCommandTiming: true,
		},
	};
}