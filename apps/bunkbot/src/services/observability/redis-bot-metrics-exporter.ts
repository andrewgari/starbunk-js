/**
 * Redis Bot Metrics Exporter for Prometheus
 *
 * High-performance export system that efficiently exposes Redis-based bot trigger
 * metrics to Prometheus without impacting bot performance.
 *
 * Features:
 * - Asynchronous, non-blocking metric collection
 * - Efficient Redis query patterns with caching
 * - Circuit breaker for fault tolerance
 * - Optimized for high-frequency scraping (15-30s intervals)
 * - Graceful degradation when Redis is unavailable
 */

import * as promClient from 'prom-client';
import type Redis from 'ioredis';
import { logger } from '@starbunk/shared';
import { ensureError } from '../../utils/error-utils';
import type { BotTriggerMetricsService } from './bot-trigger-metrics-service';
import type {} from // 	BotPerformanceAnalytics,
// 	ChannelActivityAnalytics,
// 	UserInteractionAnalytics
'../../types/bot-metrics';

// Export configuration
export interface RedisMetricsExporterConfig {
	/** Cache TTL in milliseconds (default: 15000) */
	cacheTTL?: number;
	/** Enable circuit breaker (default: true) */
	enableCircuitBreaker?: boolean;
	/** Circuit breaker failure threshold (default: 3) */
	circuitBreakerThreshold?: number;
	/** Circuit breaker reset timeout in ms (default: 30000) */
	circuitBreakerResetTimeout?: number;
	/** Maximum concurrent Redis operations (default: 10) */
	maxConcurrentOperations?: number;
	/** Enable performance tracking (default: true) */
	enablePerformanceTracking?: boolean;
	/** Export timeout in milliseconds (default: 5000) */
	exportTimeout?: number;
	/** Enable detailed labels (default: false) */
	enableDetailedLabels?: boolean;
	/** Batch size for Redis operations (default: 100) */
	batchSize?: number;
	/** Max Redis keys to scan per iteration (default: 1000) */
	scanCount?: number;
}

// Cache entry interface
interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

// Metrics aggregation result
interface MetricsAggregation {
	botMetrics: Map<string, BotMetricsSummary>;
	channelMetrics: Map<string, ChannelMetricsSummary>;
	userMetrics: Map<string, UserMetricsSummary>;
	systemMetrics: SystemMetricsSummary;
	timestamp: number;
}

interface BotMetricsSummary {
	botName: string;
	totalTriggers: number;
	totalResponses: number;
	totalFailures: number;
	avgResponseTime: number;
	p95ResponseTime: number;
	uniqueUsers: number;
	uniqueChannels: number;
	conditionDistribution: Map<string, number>;
	lastActivity: number;
}

interface ChannelMetricsSummary {
	channelId: string;
	guildId?: string;
	totalActivity: number;
	uniqueBots: number;
	uniqueUsers: number;
	lastActivity: number;
}

interface UserMetricsSummary {
	userId: string;
	totalInteractions: number;
	uniqueBots: number;
	lastActivity: number;
}

interface SystemMetricsSummary {
	totalKeys: number;
	memoryUsage: number;
	connectionStatus: 'connected' | 'disconnected' | 'error';
	exportDuration: number;
	cacheHitRate: number;
}

/**
 * Circuit breaker for Redis export operations
 */
class ExportCircuitBreaker {
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
	private failureCount = 0;
	private lastFailureTime?: number;
	private resetTimer?: NodeJS.Timeout;

	constructor(
		private readonly threshold: number,
		private readonly resetTimeout: number,
	) {}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === 'OPEN') {
			throw new Error('Circuit breaker is OPEN - export operation rejected');
		}

		try {
			const _result = await operation();
			this.onSuccess();
			return _result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		if (this.state === 'HALF_OPEN') {
			this.state = 'CLOSED';
			this.failureCount = 0;
			logger.info('Redis export circuit breaker CLOSED');
		}
	}

	private onFailure(): void {
		this.failureCount++;
		this.lastFailureTime = Date.now();

		if (this.failureCount >= this.threshold) {
			this.state = 'OPEN';
			logger.warn('Redis export circuit breaker OPEN', {
				failures: this.failureCount,
			});

			// Schedule reset to HALF_OPEN
			if (this.resetTimer) {
				clearTimeout(this.resetTimer);
			}
			this.resetTimer = setTimeout(() => {
				this.state = 'HALF_OPEN';
				logger.info('Redis export circuit breaker transitioned to HALF_OPEN');
			}, this.resetTimeout);
		}
	}

	getState(): string {
		return this.state;
	}

	getStats() {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
		};
	}

	reset(): void {
		this.state = 'CLOSED';
		this.failureCount = 0;
		this.lastFailureTime = undefined;
		if (this.resetTimer) {
			clearTimeout(this.resetTimer);
			this.resetTimer = undefined;
		}
	}
}

/**
 * Redis Bot Metrics Exporter
 */
export class RedisBotMetricsExporter {
	private readonly config: Required<RedisMetricsExporterConfig>;
	private readonly registry: promClient.Registry;
	private readonly cache = new Map<string, CacheEntry<any>>();
	private readonly circuitBreaker: ExportCircuitBreaker;
	private redis?: Redis;
	private metricsService?: BotTriggerMetricsService;
	private isInitialized = false;
	private exportInProgress = false;
	private lastExportTime = 0;
	private cacheHits = 0;
	private cacheMisses = 0;
	private cleanupInterval?: NodeJS.Timeout;

	// Prometheus metrics
	private botTriggersCounter!: promClient.Counter<string>;
	private botResponsesCounter!: promClient.Counter<string>;
	private botResponseDurationHistogram!: promClient.Histogram<string>;
	private uniqueUsersGauge!: promClient.Gauge<string>;
	private channelActivityGauge!: promClient.Gauge<string>;
	private redisConnectionGauge!: promClient.Gauge<string>;
	private batchOperationsCounter!: promClient.Counter<string>;
	private circuitBreakerStateGauge!: promClient.Gauge<string>;
	private exportDurationHistogram!: promClient.Histogram<string>;
	private cacheHitRateGauge!: promClient.Gauge<string>;

	constructor(registry: promClient.Registry, config?: RedisMetricsExporterConfig) {
		this.registry = registry;
		this.config = {
			cacheTTL: config?.cacheTTL ?? 15000,
			enableCircuitBreaker: config?.enableCircuitBreaker ?? true,
			circuitBreakerThreshold: config?.circuitBreakerThreshold ?? 3,
			circuitBreakerResetTimeout: config?.circuitBreakerResetTimeout ?? 30000,
			maxConcurrentOperations: config?.maxConcurrentOperations ?? 10,
			enablePerformanceTracking: config?.enablePerformanceTracking ?? true,
			exportTimeout: config?.exportTimeout ?? 5000,
			enableDetailedLabels: config?.enableDetailedLabels ?? false,
			batchSize: config?.batchSize ?? 100,
			scanCount: config?.scanCount ?? 1000,
		};

		this.circuitBreaker = new ExportCircuitBreaker(
			this.config.circuitBreakerThreshold,
			this.config.circuitBreakerResetTimeout,
		);

		this.initializeMetrics();
		logger.info('Redis bot metrics exporter initialized', {
			cacheTTL: this.config.cacheTTL,
			circuitBreakerEnabled: this.config.enableCircuitBreaker,
		});
	}

	private initializeMetrics(): void {
		// Bot trigger metrics
		this.botTriggersCounter = new promClient.Counter({
			name: 'bunkbot_redis_triggers_total',
			help: 'Total bot triggers from Redis',
			labelNames: ['bot_name', 'condition_name', 'channel_id', 'guild_id'],
			registers: [this.registry],
		});

		this.botResponsesCounter = new promClient.Counter({
			name: 'bunkbot_redis_responses_total',
			help: 'Total bot responses from Redis',
			labelNames: ['bot_name', 'condition_name', 'success'],
			registers: [this.registry],
		});

		this.botResponseDurationHistogram = new promClient.Histogram({
			name: 'bunkbot_redis_response_duration_seconds',
			help: 'Bot response duration from Redis in seconds',
			labelNames: ['bot_name', 'condition_name'],
			buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
			registers: [this.registry],
		});

		this.uniqueUsersGauge = new promClient.Gauge({
			name: 'bunkbot_redis_unique_users_daily',
			help: 'Unique users per bot per day from Redis',
			labelNames: ['bot_name', 'channel_id'],
			registers: [this.registry],
		});

		this.channelActivityGauge = new promClient.Gauge({
			name: 'bunkbot_redis_channel_activity',
			help: 'Channel activity level from Redis',
			labelNames: ['channel_id', 'guild_id'],
			registers: [this.registry],
		});

		// System metrics
		this.redisConnectionGauge = new promClient.Gauge({
			name: 'bunkbot_redis_connection_status',
			help: 'Redis connection status (1=connected, 0=disconnected)',
			registers: [this.registry],
		});

		this.batchOperationsCounter = new promClient.Counter({
			name: 'bunkbot_redis_batch_operations_total',
			help: 'Total Redis batch operations',
			labelNames: ['operation', 'success'],
			registers: [this.registry],
		});

		this.circuitBreakerStateGauge = new promClient.Gauge({
			name: 'bunkbot_redis_circuit_breaker_state',
			help: 'Circuit breaker state for Redis exports (0=closed, 1=open, 2=half-open)',
			labelNames: ['bot_name'],
			registers: [this.registry],
		});

		this.exportDurationHistogram = new promClient.Histogram({
			name: 'bunkbot_redis_export_duration_seconds',
			help: 'Duration of Redis metrics export in seconds',
			buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
			registers: [this.registry],
		});

		this.cacheHitRateGauge = new promClient.Gauge({
			name: 'bunkbot_redis_cache_hit_rate',
			help: 'Cache hit rate for Redis metrics export',
			registers: [this.registry],
		});
	}

	/**
	 * Initialize the exporter with Redis connection
	 */
	async initialize(redis: Redis, metricsService?: BotTriggerMetricsService): Promise<void> {
		if (this.isInitialized) {
			logger.warn('Redis metrics exporter already initialized');
			return;
		}

		this.redis = redis;
		this.metricsService = metricsService;
		this.isInitialized = true;

		// Test Redis connection
		try {
			await redis.ping();
			this.redisConnectionGauge.set(1);
			logger.info('Redis metrics exporter connected successfully');
		} catch (error) {
			this.redisConnectionGauge.set(0);
			logger.error('Redis connection failed for metrics exporter:', ensureError(error));
		}

		// Start periodic cache cleanup
		this.startCacheCleanup();
	}

	/**
	 * Export metrics to Prometheus
	 */
	async exportMetrics(): Promise<void> {
		if (!this.isInitialized) {
			logger.warn('Redis metrics exporter not initialized');
			return;
		}

		// If Redis is not connected but we're initialized, still update lastExportTime
		if (!this.redis) {
			logger.warn('Redis not connected for metrics export');
			this.lastExportTime = Date.now();
			return;
		}

		// Prevent concurrent exports
		if (this.exportInProgress) {
			logger.debug('Export already in progress, skipping');
			return;
		}

		this.exportInProgress = true;
		const startTime = Date.now();

		try {
			// Execute through circuit breaker if enabled
			if (this.config.enableCircuitBreaker) {
				await this.circuitBreaker.execute(async () => {
					await this.performExport();
				});
			} else {
				await this.performExport();
			}

			// Update export duration
			const duration = (Date.now() - startTime) / 1000;
			this.exportDurationHistogram.observe(duration);
			this.lastExportTime = Date.now();

			logger.debug('Redis metrics export completed', {
				duration: `${duration}s`,
			});
		} catch (error) {
			logger.error('Failed to export Redis metrics:', ensureError(error));
			// Still update lastExportTime even on failure for tracking purposes
			this.lastExportTime = Date.now();
			// Don't throw - graceful degradation
		} finally {
			this.exportInProgress = false;
		}
	}

	/**
	 * Perform the actual export operation
	 */
	private async performExport(): Promise<void> {
		// Check cache first
		const cacheKey = 'metrics_aggregation';
		const cached = this.getFromCache<MetricsAggregation>(cacheKey);

		if (cached) {
			this.cacheHits++;
			await this.updatePrometheusMetrics(cached);
			this.updateCacheHitRate();
			return;
		}

		this.cacheMisses++;

		// Aggregate metrics from Redis
		const aggregation = await this.aggregateMetrics();

		// Update cache
		this.setCache(cacheKey, aggregation, this.config.cacheTTL);

		// Update Prometheus metrics
		await this.updatePrometheusMetrics(aggregation);
		this.updateCacheHitRate();
	}

	/**
	 * Aggregate metrics from Redis
	 */
	private async aggregateMetrics(): Promise<MetricsAggregation> {
		if (!this.redis) {
			throw new Error('Redis not initialized');
		}

		const startTime = Date.now();
		const aggregation: MetricsAggregation = {
			botMetrics: new Map(),
			channelMetrics: new Map(),
			userMetrics: new Map(),
			systemMetrics: {
				totalKeys: 0,
				memoryUsage: 0,
				connectionStatus: 'connected',
				exportDuration: 0,
				cacheHitRate: this.getCacheHitRate(),
			},
			timestamp: Date.now(),
		};

		try {
			// Use pipeline for efficient batch operations
			const pipeline = this.redis.pipeline();

			// Scan for bot metrics keys
			const botKeys = await this.scanKeys('bot:*:stats');
			for (const key of botKeys) {
				pipeline.hgetall(key);
			}

			// Scan for channel metrics keys
			const channelKeys = await this.scanKeys('channel:*:activity');
			for (const key of channelKeys) {
				pipeline.hgetall(key);
			}

			// Get system info
			pipeline.dbsize();
			pipeline.info('memory');

			// Execute pipeline
			const results = await pipeline.exec();
			if (!results) {
				throw new Error('Pipeline execution failed');
			}

			// Process bot metrics
			let resultIndex = 0;
			for (let i = 0; i < botKeys.length; i++) {
				const [err, data] = results[resultIndex++];
				if (!err && data) {
					const botName = this.extractBotName(botKeys[i]);
					aggregation.botMetrics.set(botName, this.parseBotMetrics(botName, data as any));
				}
			}

			// Process channel metrics
			for (let i = 0; i < channelKeys.length; i++) {
				const [err, data] = results[resultIndex++];
				if (!err && data) {
					const channelId = this.extractChannelId(channelKeys[i]);
					aggregation.channelMetrics.set(channelId, this.parseChannelMetrics(channelId, data as any));
				}
			}

			// Process system metrics
			const [dbSizeErr, dbSize] = results[resultIndex++];
			if (!dbSizeErr && dbSize) {
				aggregation.systemMetrics.totalKeys = dbSize as number;
			}

			const [memInfoErr, memInfo] = results[resultIndex++];
			if (!memInfoErr && memInfo) {
				const memoryUsage = this.parseMemoryInfo(memInfo as string);
				aggregation.systemMetrics.memoryUsage = memoryUsage;
			}

			aggregation.systemMetrics.exportDuration = Date.now() - startTime;
			aggregation.systemMetrics.connectionStatus = 'connected';
		} catch (error) {
			logger.error('Failed to aggregate Redis metrics:', ensureError(error));
			aggregation.systemMetrics.connectionStatus = 'error';
			throw error;
		}

		return aggregation;
	}

	/**
	 * Scan Redis keys with pattern
	 */
	private async scanKeys(pattern: string): Promise<string[]> {
		if (!this.redis) {
			return [];
		}

		const keys: string[] = [];
		let cursor = '0';

		try {
			do {
				const [newCursor, batch] = await this.redis.scan(
					cursor,
					'MATCH',
					pattern,
					'COUNT',
					this.config.scanCount,
				);
				cursor = newCursor;
				keys.push(...batch);

				// Limit total keys to prevent memory issues
				if (keys.length > 10000) {
					logger.warn('Too many Redis keys found, limiting to 10000');
					break;
				}
			} while (cursor !== '0');
		} catch (error) {
			logger.error(`Failed to scan keys with pattern ${pattern}:`, ensureError(error));
		}

		return keys;
	}

	/**
	 * Update Prometheus metrics from aggregation
	 */
	private async updatePrometheusMetrics(aggregation: MetricsAggregation): Promise<void> {
		// Update bot metrics
		for (const [botName, metrics] of aggregation.botMetrics) {
			// Reset counters for this bot to ensure accuracy
			this.botTriggersCounter.reset();
			this.botResponsesCounter.reset();

			// Update trigger counts
			for (const [condition, count] of metrics.conditionDistribution) {
				this.botTriggersCounter
					.labels(
						botName,
						condition,
						'all', // channel_id placeholder
						'all', // guild_id placeholder
					)
					.inc(count);
			}

			// Update response counts
			this.botResponsesCounter.labels(botName, 'all', 'true').inc(metrics.totalResponses);

			this.botResponsesCounter.labels(botName, 'all', 'false').inc(metrics.totalFailures);

			// Update response duration
			if (metrics.avgResponseTime > 0) {
				this.botResponseDurationHistogram.labels(botName, 'all').observe(metrics.avgResponseTime / 1000); // Convert to seconds
			}

			// Update unique users
			this.uniqueUsersGauge.labels(botName, 'all').set(metrics.uniqueUsers);
		}

		// Update channel metrics
		for (const [channelId, metrics] of aggregation.channelMetrics) {
			this.channelActivityGauge.labels(channelId, metrics.guildId || 'unknown').set(metrics.totalActivity);
		}

		// Update system metrics
		this.redisConnectionGauge.set(aggregation.systemMetrics.connectionStatus === 'connected' ? 1 : 0);

		// Update circuit breaker state
		const cbState = this.circuitBreaker.getState();
		const cbValue = cbState === 'CLOSED' ? 0 : cbState === 'OPEN' ? 1 : 2;
		this.circuitBreakerStateGauge.labels('all').set(cbValue);

		// Update cache hit rate
		this.cacheHitRateGauge.set(aggregation.systemMetrics.cacheHitRate);
	}

	/**
	 * Parse bot metrics from Redis hash
	 */
	private parseBotMetrics(botName: string, data: Record<string, string>): BotMetricsSummary {
		return {
			botName,
			totalTriggers: parseInt(data.total_triggers || '0', 10),
			totalResponses: parseInt(data.total_responses || '0', 10),
			totalFailures: parseInt(data.total_failures || '0', 10),
			avgResponseTime: parseFloat(data.avg_response_time || '0'),
			p95ResponseTime: parseFloat(data.p95_response_time || '0'),
			uniqueUsers: parseInt(data.unique_users || '0', 10),
			uniqueChannels: parseInt(data.unique_channels || '0', 10),
			conditionDistribution: this.parseConditionDistribution(data),
			lastActivity: parseInt(data.last_activity || '0', 10),
		};
	}

	/**
	 * Parse channel metrics from Redis hash
	 */
	private parseChannelMetrics(channelId: string, data: Record<string, string>): ChannelMetricsSummary {
		return {
			channelId,
			guildId: data.guild_id,
			totalActivity: parseInt(data.bot_triggers || '0', 10),
			uniqueBots: parseInt(data.unique_bots || '0', 10),
			uniqueUsers: parseInt(data.unique_users || '0', 10),
			lastActivity: parseInt(data.last_trigger || '0', 10),
		};
	}

	/**
	 * Parse condition distribution from Redis data
	 */
	private parseConditionDistribution(data: Record<string, string>): Map<string, number> {
		const distribution = new Map<string, number>();

		for (const [key, value] of Object.entries(data)) {
			if (key.startsWith('condition:')) {
				const conditionName = key.substring(10);
				distribution.set(conditionName, parseInt(value, 10));
			}
		}

		return distribution;
	}

	/**
	 * Parse memory info from Redis INFO command
	 */
	private parseMemoryInfo(info: string): number {
		const match = info.match(/used_memory:(\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	}

	/**
	 * Extract bot name from Redis key
	 */
	private extractBotName(key: string): string {
		const parts = key.split(':');
		return parts[1] || 'unknown';
	}

	/**
	 * Extract channel ID from Redis key
	 */
	private extractChannelId(key: string): string {
		const parts = key.split(':');
		return parts[1] || 'unknown';
	}

	/**
	 * Get data from cache
	 */
	private getFromCache<T>(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	/**
	 * Set data in cache
	 */
	private setCache<T>(key: string, data: T, ttl: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	/**
	 * Update cache hit rate metric
	 */
	private updateCacheHitRate(): void {
		const total = this.cacheHits + this.cacheMisses;
		const hitRate = total > 0 ? this.cacheHits / total : 0;
		this.cacheHitRateGauge.set(hitRate);
	}

	/**
	 * Get cache hit rate
	 */
	private getCacheHitRate(): number {
		const total = this.cacheHits + this.cacheMisses;
		return total > 0 ? this.cacheHits / total : 0;
	}

	/**
	 * Start periodic cache cleanup
	 */
	private startCacheCleanup(): void {
		this.cleanupInterval = setInterval(() => {
			const _now = Date.now();
			const keysToDelete: string[] = [];

			for (const [key, entry] of this.cache) {
				if (_now - entry.timestamp > entry.ttl) {
					keysToDelete.push(key);
				}
			}

			for (const key of keysToDelete) {
				this.cache.delete(key);
			}

			if (keysToDelete.length > 0) {
				logger.debug(`Cleaned ${keysToDelete.length} expired cache entries`);
			}
		}, 60000); // Run every minute
	}

	/**
	 * Get exporter statistics
	 */
	getStats() {
		return {
			initialized: this.isInitialized,
			cacheSize: this.cache.size,
			cacheHitRate: this.getCacheHitRate(),
			lastExportTime: this.lastExportTime,
			exportInProgress: this.exportInProgress,
			circuitBreaker: this.circuitBreaker.getStats(),
			redisConnected: this.redis ? true : false,
		};
	}

	/**
	 * Reset all metrics
	 */
	reset(): void {
		this.botTriggersCounter.reset();
		this.botResponsesCounter.reset();
		this.botResponseDurationHistogram.reset();
		this.uniqueUsersGauge.reset();
		this.channelActivityGauge.reset();
		this.batchOperationsCounter.reset();
		this.exportDurationHistogram.reset();
		this.cache.clear();
		this.cacheHits = 0;
		this.cacheMisses = 0;
		this.circuitBreaker.reset();
		logger.info('Redis metrics exporter reset');
	}

	/**
	 * Shutdown the exporter
	 */
	async shutdown(): Promise<void> {
		// Clear the cleanup interval
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}

		this.reset();
		this.cache.clear();
		this.isInitialized = false;
		logger.info('Redis metrics exporter shutdown');
	}
}

/**
 * Factory function to create Redis metrics exporter
 */
export function createRedisBotMetricsExporter(
	registry: promClient.Registry,
	config?: RedisMetricsExporterConfig,
): RedisBotMetricsExporter {
	return new RedisBotMetricsExporter(registry, config);
}
