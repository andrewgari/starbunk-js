/**
 * Comprehensive test suite for Redis Bot Metrics Exporter
 *
 * Tests all components including:
 * - Prometheus metrics generation and caching
 * - Circuit breaker behavior for export operations
 * - Redis data aggregation and parsing
 * - Performance optimization and concurrent operations
 * - Error handling and graceful degradation
 * - Cache management and TTL behavior
 * - Memory usage tracking and cleanup
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { jest } from '@jest/globals';
import { RedisBotMetricsExporter, createRedisBotMetricsExporter } from '../RedisBotMetricsExporter';
import * as promClient from 'prom-client';
import type Redis from 'ioredis';
import type { BotTriggerMetricsService } from '../BotTriggerMetricsService';

// Mock Redis interface
const mockRedis = {
	ping: jest.fn().mockResolvedValue('PONG'),
	connect: jest.fn().mockResolvedValue(undefined),
	pipeline: jest.fn(),
	scan: jest.fn().mockResolvedValue(['0', []]),
	hgetall: jest.fn().mockResolvedValue({}),
	dbsize: jest.fn().mockResolvedValue(0),
	info: jest.fn().mockResolvedValue(''),
	on: jest.fn(),
	quit: jest.fn().mockResolvedValue('OK'),
} as unknown as Redis;

// Mock pipeline interface
const mockPipeline = {
	hgetall: jest.fn().mockReturnThis(),
	dbsize: jest.fn().mockReturnThis(),
	info: jest.fn().mockReturnThis(),
	exec: jest.fn(),
};

// Mock BotTriggerMetricsService
const mockBotTriggerMetricsService = {
	getHealthStatus: jest.fn(),
	getBotMetrics: jest.fn(),
	cleanup: jest.fn(),
} as unknown as BotTriggerMetricsService;

// Mock logger
jest.mock('../../logger', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('RedisBotMetricsExporter', () => {
	let exporter: RedisBotMetricsExporter;
	let registry: promClient.Registry;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create fresh registry for each test
		registry = new promClient.Registry();

		// Setup default mocks
		(mockRedis.pipeline as jest.Mock).mockReturnValue(mockPipeline);
		mockPipeline.exec.mockResolvedValue([]);

		// Create exporter with test configuration
		exporter = createRedisBotMetricsExporter(registry, {
			cacheTTL: 1000,
			enableCircuitBreaker: false,
			exportTimeout: 5000,
			enablePerformanceTracking: true,
			enableDetailedLabels: false,
			batchSize: 10,
			scanCount: 100,
		});
	});

	afterEach(async () => {
		try {
			await exporter.shutdown();
		} catch (error) {
			// Ignore shutdown errors in tests
		}
	});

	describe('Initialization', () => {
		it('should initialize successfully with Redis connection', async () => {
			await exporter.initialize(mockRedis);

			expect(mockRedis.ping).toHaveBeenCalled();
			expect(exporter.getStats().initialized).toBe(true);
			expect(exporter.getStats().redisConnected).toBe(true);
		});

		it('should handle Redis connection failure gracefully', async () => {
			const failingRedis = {
				...mockRedis,
				ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
			} as unknown as Redis;

			await exporter.initialize(failingRedis);

			expect(exporter.getStats().initialized).toBe(true);
			// Should still be marked as initialized even if ping fails
		});

		it('should initialize with BotTriggerMetricsService', async () => {
			await exporter.initialize(mockRedis, mockBotTriggerMetricsService);

			expect(exporter.getStats().initialized).toBe(true);
		});

		it('should not initialize twice', async () => {
			await exporter.initialize(mockRedis);
			await exporter.initialize(mockRedis);

			expect(mockRedis.ping).toHaveBeenCalledTimes(1);
		});

		it('should start cache cleanup interval on initialization', async () => {
			jest.useFakeTimers();

			await exporter.initialize(mockRedis);

			// Fast-forward time to trigger cache cleanup
			jest.advanceTimersByTime(60000);

			// Should not throw
			expect(exporter.getStats().initialized).toBe(true);

			jest.useRealTimers();
		});
	});

	describe('Metrics Export', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
		});

		it('should export metrics from Redis successfully', async () => {
			setupMockRedisData();

			await exporter.exportMetrics();

			expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'bot:*:stats', 'COUNT', 100);
			expect(mockRedis.scan).toHaveBeenCalledWith('0', 'MATCH', 'channel:*:activity', 'COUNT', 100);
			expect(mockPipeline.exec).toHaveBeenCalled();
		});

		it('should handle empty Redis data gracefully', async () => {
			(mockRedis.scan as jest.Mock).mockResolvedValue(['0', []]);
			mockPipeline.exec.mockResolvedValue([]);

			await exporter.exportMetrics();

			expect(exporter.getStats().lastExportTime).toBeGreaterThan(0);
		});

		it('should use cache on subsequent exports within TTL', async () => {
			setupMockRedisData();

			// First export
			await exporter.exportMetrics();
			const firstScanCount = (mockRedis.scan as jest.Mock).mock.calls.length;

			// Reset mocks
			jest.clearAllMocks();
			(mockRedis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

			// Second export (should use cache)
			await exporter.exportMetrics();

			expect(mockRedis.scan).not.toHaveBeenCalled();
			const stats = exporter.getStats();
			expect(stats.cacheHitRate).toBeGreaterThan(0);
		});

		it('should refresh cache after TTL expires', async () => {
			jest.useFakeTimers();
			setupMockRedisData();

			// First export
			await exporter.exportMetrics();

			// Fast-forward past cache TTL
			jest.advanceTimersByTime(2000);

			// Reset mocks to verify new Redis calls
			jest.clearAllMocks();
			(mockRedis.pipeline as jest.Mock).mockReturnValue(mockPipeline);
			setupMockRedisData();

			// Second export (should refresh cache)
			await exporter.exportMetrics();

			expect(mockRedis.scan).toHaveBeenCalled();

			jest.useRealTimers();
		});

		it('should prevent concurrent exports', async () => {
			let exportCount = 0;
			const trackingRedis = {
				...mockRedis,
				scan: jest.fn().mockImplementation(async (...args: any[]) => {
					exportCount++;
					await new Promise((resolve) => setTimeout(resolve, 100));
					return ['0', []];
				}),
			} as unknown as Redis;

			await exporter.initialize(trackingRedis);

			// Start multiple exports concurrently
			const exports = Promise.all([exporter.exportMetrics(), exporter.exportMetrics(), exporter.exportMetrics()]);

			await exports;

			// Only one export should be processing at a time
			expect(exportCount).toBeLessThanOrEqual(2); // bot:* and channel:* patterns
		});

		it('should handle large number of Redis keys efficiently', async () => {
			const manyKeys = Array.from({ length: 500 }, (_, i) => `bot:bot${i}:stats`);

			(mockRedis.scan as jest.Mock).mockImplementation((cursor: string, ...args: any[]) => {
				if (cursor === '0') {
					return Promise.resolve(['123', manyKeys.slice(0, 100)]);
				} else if (cursor === '123') {
					return Promise.resolve(['456', manyKeys.slice(100, 200)]);
				} else {
					return Promise.resolve(['0', manyKeys.slice(200)]);
				}
			});

			// Mock pipeline execution with many results
			const manyResults = manyKeys.map(() => [null, { total_triggers: '10' }]);
			mockPipeline.exec.mockResolvedValue([...manyResults, [null, 1000], [null, 'used_memory:1048576\r\n']]);

			await exporter.exportMetrics();

			expect(exporter.getStats().lastExportTime).toBeGreaterThan(0);
		});
	});

	describe('Circuit Breaker', () => {
		let circuitBreakerExporter: RedisBotMetricsExporter;

		beforeEach(async () => {
			circuitBreakerExporter = new RedisBotMetricsExporter(registry, {
				enableCircuitBreaker: true,
				circuitBreakerThreshold: 2,
				circuitBreakerResetTimeout: 100,
			});
			await circuitBreakerExporter.initialize(mockRedis);
		});

		afterEach(async () => {
			await circuitBreakerExporter.shutdown();
		});

		it('should open circuit breaker after threshold failures', async () => {
			const failingRedis = {
				...mockRedis,
				scan: jest.fn().mockRejectedValue(new Error('Redis scan error')),
			} as unknown as Redis;

			await circuitBreakerExporter.initialize(failingRedis);

			// First failure
			await circuitBreakerExporter.exportMetrics();

			// Second failure (should open circuit)
			await circuitBreakerExporter.exportMetrics();

			const stats = circuitBreakerExporter.getStats();
			expect(stats.circuitBreaker.state).toBe('OPEN');
			expect(stats.circuitBreaker.failureCount).toBe(2);
		});

		it('should reject operations when circuit is open', async () => {
			// Setup failing Redis to trigger circuit breaker
			const failingRedis = {
				...mockRedis,
				scan: jest.fn().mockRejectedValue(new Error('Redis error')),
			} as unknown as Redis;

			await circuitBreakerExporter.initialize(failingRedis);

			// Trigger circuit breaker open
			await circuitBreakerExporter.exportMetrics();
			await circuitBreakerExporter.exportMetrics();

			// Verify circuit is open
			const stats = circuitBreakerExporter.getStats();
			expect(stats.circuitBreaker.state).toBe('OPEN');

			// Next operation should be rejected immediately
			const startTime = Date.now();
			await circuitBreakerExporter.exportMetrics();
			const duration = Date.now() - startTime;

			// Should complete quickly without actual Redis operations
			expect(duration).toBeLessThan(50);
		});

		it('should transition to half-open and reset after timeout', async () => {
			jest.useFakeTimers();

			const intermittentRedis = {
				...mockRedis,
				scan: jest
					.fn()
					.mockRejectedValueOnce(new Error('Error 1'))
					.mockRejectedValueOnce(new Error('Error 2'))
					.mockResolvedValue(['0', []]),
			} as unknown as Redis;

			await circuitBreakerExporter.initialize(intermittentRedis);

			// Trigger circuit breaker open
			await circuitBreakerExporter.exportMetrics();
			await circuitBreakerExporter.exportMetrics();

			expect(circuitBreakerExporter.getStats().circuitBreaker.state).toBe('OPEN');

			// Fast-forward past reset timeout
			jest.advanceTimersByTime(150);

			// Should transition to half-open and succeed
			mockPipeline.exec.mockResolvedValue([]);
			await circuitBreakerExporter.exportMetrics();

			const stats = circuitBreakerExporter.getStats();
			expect(stats.circuitBreaker.state).toBe('CLOSED');

			jest.useRealTimers();
		});

		it('should track circuit breaker statistics', async () => {
			const stats = circuitBreakerExporter.getStats();

			expect(stats.circuitBreaker).toMatchObject({
				state: expect.stringMatching(/^(CLOSED|OPEN|HALF_OPEN)$/),
				failureCount: expect.any(Number),
			});
		});
	});

	describe('Prometheus Metrics Generation', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
			setupMockRedisData();
		});

		it('should generate bot trigger metrics', async () => {
			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bunkbot_redis_triggers_total');
			expect(metrics).toContain('bot_name="testbot"');
			expect(metrics).toContain('condition_name="greeting"');
		});

		it('should generate response metrics with success/failure labels', async () => {
			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bunkbot_redis_responses_total');
			expect(metrics).toContain('success="true"');
			expect(metrics).toContain('success="false"');
		});

		it('should generate response duration histograms', async () => {
			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bunkbot_redis_response_duration_seconds');
			expect(metrics).toContain('_bucket{');
			expect(metrics).toContain('le="0.1"');
		});

		it('should generate unique user metrics', async () => {
			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bunkbot_redis_unique_users_daily');
			expect(metrics).toContain('bot_name="testbot"');
		});

		it('should generate channel activity metrics', async () => {
			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bunkbot_redis_channel_activity');
			expect(metrics).toContain('channel_id="test-channel"');
			expect(metrics).toContain('guild_id="test-guild"');
		});

		it('should generate system metrics', async () => {
			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bunkbot_redis_connection_status');
			expect(metrics).toContain('bunkbot_redis_export_duration_seconds');
			expect(metrics).toContain('bunkbot_redis_cache_hit_rate');
			expect(metrics).toContain('bunkbot_redis_circuit_breaker_state');
		});

		it('should handle missing data gracefully in metrics', async () => {
			// Setup incomplete data
			(mockRedis.scan as jest.Mock)
				.mockResolvedValueOnce(['0', ['bot:emptybot:stats']])
				.mockResolvedValueOnce(['0', ['channel:emptychannel:activity']]);

			mockPipeline.exec.mockResolvedValue([
				[null, {}], // Empty bot data
				[null, {}], // Empty channel data
				[null, 0], // Zero database size
				[null, ''], // Empty memory info
			]);

			await exporter.exportMetrics();

			const metrics = await registry.metrics();
			expect(metrics).toContain('bunkbot_redis_connection_status');
		});

		it('should handle detailed labels when enabled', async () => {
			const detailedExporter = new RedisBotMetricsExporter(registry, {
				enableDetailedLabels: true,
				cacheTTL: 1000,
			});

			await detailedExporter.initialize(mockRedis);
			setupMockRedisData();

			await detailedExporter.exportMetrics();

			const metrics = await registry.metrics();
			expect(metrics).toContain('bunkbot_redis_triggers_total');

			await detailedExporter.shutdown();
		});
	});

	describe('Data Parsing and Aggregation', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
		});

		it('should parse bot metrics correctly', async () => {
			(mockRedis.scan as jest.Mock).mockResolvedValueOnce(['0', ['bot:parsebot:stats']]);

			mockPipeline.exec.mockResolvedValue([
				[
					null,
					{
						total_triggers: '150',
						total_responses: '140',
						total_failures: '10',
						avg_response_time: '200.5',
						p95_response_time: '350.7',
						unique_users: '30',
						unique_channels: '8',
						'condition:greeting': '80',
						'condition:farewell': '40',
						'condition:help': '30',
						last_activity: '1234567890',
					},
				],
				[null, 1500],
				[null, 'used_memory:2097152\r\n'],
			]);

			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('bot_name="parsebot"');
			expect(metrics).toContain('condition_name="greeting"');
			expect(metrics).toContain('condition_name="farewell"');
			expect(metrics).toContain('condition_name="help"');
		});

		it('should parse channel metrics correctly', async () => {
			(mockRedis.scan as jest.Mock)
				.mockResolvedValueOnce(['0', []])
				.mockResolvedValueOnce(['0', ['channel:parsechannel:activity']]);

			mockPipeline.exec.mockResolvedValue([
				[
					null,
					{
						bot_triggers: '75',
						unique_bots: '5',
						unique_users: '25',
						last_trigger: '1234567890',
						guild_id: 'parse-guild',
					},
				],
				[null, 2000],
				[null, 'used_memory:1048576\r\n'],
			]);

			await exporter.exportMetrics();

			const metrics = await registry.metrics();

			expect(metrics).toContain('channel_id="parsechannel"');
			expect(metrics).toContain('guild_id="parse-guild"');
		});

		it('should handle malformed Redis data gracefully', async () => {
			(mockRedis.scan as jest.Mock).mockResolvedValueOnce(['0', ['bot:malformed:stats']]);

			mockPipeline.exec.mockResolvedValue([
				[null, null], // null data
				[null, 'invalid_number'], // invalid numeric data
				[new Error('Redis error'), null], // error result
				[null, 'malformed_memory_info'], // malformed memory info
			]);

			await expect(exporter.exportMetrics()).resolves.not.toThrow();

			const stats = exporter.getStats();
			expect(stats.lastExportTime).toBeGreaterThan(0);
		});

		it('should parse memory usage from Redis INFO', async () => {
			mockPipeline.exec.mockResolvedValue([
				[null, 3000],
				[null, 'used_memory:4194304\r\nused_memory_human:4.00M\r\nother_info:value\r\n'],
			]);

			await exporter.exportMetrics();

			const metrics = await registry.metrics();
			expect(metrics).toContain('bunkbot_redis_connection_status 1');
		});
	});

	describe('Cache Management', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
		});

		it('should track cache hit rate accurately', async () => {
			setupMockRedisData();

			// First export (cache miss)
			await exporter.exportMetrics();
			let stats = exporter.getStats();
			expect(stats.cacheHitRate).toBe(0);

			// Reset mocks but keep cache
			jest.clearAllMocks();
			(mockRedis.pipeline as jest.Mock).mockReturnValue(mockPipeline);

			// Second export (cache hit)
			await exporter.exportMetrics();
			stats = exporter.getStats();
			expect(stats.cacheHitRate).toBe(0.5);
		});

		it('should cleanup expired cache entries', async () => {
			jest.useFakeTimers();

			// Create cache entry
			setupMockRedisData();
			await exporter.exportMetrics();

			let stats = exporter.getStats();
			expect(stats.cacheSize).toBeGreaterThan(0);

			// Fast-forward past cleanup interval
			jest.advanceTimersByTime(120000); // 2 minutes

			// Check cache was cleaned
			stats = exporter.getStats();
			expect(stats.cacheSize).toBe(0);

			jest.useRealTimers();
		});

		it('should respect cache TTL configuration', async () => {
			const shortCacheExporter = new RedisBotMetricsExporter(registry, {
				cacheTTL: 100,
			});

			await shortCacheExporter.initialize(mockRedis);
			setupMockRedisData();

			// First export
			await shortCacheExporter.exportMetrics();

			// Wait for cache to expire
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Reset mocks to verify new Redis calls
			jest.clearAllMocks();
			(mockRedis.pipeline as jest.Mock).mockReturnValue(mockPipeline);
			setupMockRedisData();

			// Second export (should refresh cache)
			await shortCacheExporter.exportMetrics();

			expect(mockRedis.scan).toHaveBeenCalled();

			await shortCacheExporter.shutdown();
		});
	});

	describe('Performance and Resource Management', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
		});

		it('should handle high-frequency exports efficiently', async () => {
			const startTime = Date.now();
			const exportPromises = Array.from({ length: 50 }, () => exporter.exportMetrics());

			await Promise.all(exportPromises);

			const duration = Date.now() - startTime;
			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

			// Most should be served from cache
			const stats = exporter.getStats();
			expect(stats.cacheHitRate).toBeGreaterThan(0.8);
		});

		it('should limit Redis key scanning to prevent memory issues', async () => {
			// Create exporter with low scan limit
			const limitedExporter = new RedisBotMetricsExporter(registry, {
				scanCount: 5,
			});

			await limitedExporter.initialize(mockRedis);

			// Mock many keys
			(mockRedis.scan as jest.Mock).mockResolvedValue([
				'0',
				Array.from({ length: 15000 }, (_, i) => `bot:bot${i}:stats`),
			]);

			await limitedExporter.exportMetrics();

			// Should complete without memory issues
			expect(limitedExporter.getStats().lastExportTime).toBeGreaterThan(0);

			await limitedExporter.shutdown();
		});

		it('should provide accurate performance statistics', async () => {
			setupMockRedisData();
			await exporter.exportMetrics();

			const stats = exporter.getStats();

			expect(stats).toMatchObject({
				initialized: true,
				cacheSize: expect.any(Number),
				cacheHitRate: expect.any(Number),
				lastExportTime: expect.any(Number),
				exportInProgress: false,
				circuitBreaker: expect.objectContaining({
					state: expect.any(String),
					failureCount: expect.any(Number),
				}),
				redisConnected: true,
			});
		});
	});

	describe('Error Handling and Edge Cases', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
		});

		it('should handle Redis scan errors gracefully', async () => {
			(mockRedis.scan as jest.Mock).mockRejectedValue(new Error('SCAN command failed'));

			await expect(exporter.exportMetrics()).resolves.not.toThrow();

			const stats = exporter.getStats();
			expect(stats.initialized).toBe(true);
		});

		it('should handle pipeline execution errors', async () => {
			(mockRedis.scan as jest.Mock).mockResolvedValue(['0', ['bot:test:stats']]);
			mockPipeline.exec.mockRejectedValue(new Error('Pipeline execution failed'));

			await expect(exporter.exportMetrics()).resolves.not.toThrow();
		});

		it('should handle Redis disconnection during export', async () => {
			// Start export with working Redis
			setupMockRedisData();
			const exportPromise = exporter.exportMetrics();

			// Simulate disconnection
			(mockRedis.scan as jest.Mock).mockRejectedValue(new Error('Connection lost'));

			await expect(exportPromise).resolves.not.toThrow();
		});

		it('should handle memory parsing errors', async () => {
			mockPipeline.exec.mockResolvedValue([
				[null, { total_triggers: '10' }],
				[null, 1000],
				[null, 'invalid_memory_format'], // Invalid memory info
			]);

			await exporter.exportMetrics();

			const metrics = await registry.metrics();
			expect(metrics).toContain('bunkbot_redis_connection_status');
		});

		it('should handle export when not initialized', async () => {
			const uninitializedExporter = new RedisBotMetricsExporter(registry);

			await uninitializedExporter.exportMetrics();

			// Should complete without throwing
			expect(uninitializedExporter.getStats().initialized).toBe(false);

			await uninitializedExporter.shutdown();
		});
	});

	describe('Factory Function and Configuration', () => {
		it('should create exporter with default configuration', () => {
			const defaultExporter = createRedisBotMetricsExporter(registry);

			expect(defaultExporter).toBeInstanceOf(RedisBotMetricsExporter);
			expect(defaultExporter.getStats().initialized).toBe(false);
		});

		it('should create exporter with custom configuration', () => {
			const customExporter = createRedisBotMetricsExporter(registry, {
				cacheTTL: 5000,
				enableCircuitBreaker: true,
				circuitBreakerThreshold: 10,
				circuitBreakerResetTimeout: 30000,
				maxConcurrentOperations: 5,
				enablePerformanceTracking: false,
				exportTimeout: 2000,
				enableDetailedLabels: true,
				batchSize: 50,
				scanCount: 500,
			});

			expect(customExporter).toBeInstanceOf(RedisBotMetricsExporter);
		});
	});

	describe('Cleanup and Shutdown', () => {
		beforeEach(async () => {
			await exporter.initialize(mockRedis);
		});

		it('should reset all metrics and clear cache', async () => {
			setupMockRedisData();
			await exporter.exportMetrics();

			// Verify data exists
			let stats = exporter.getStats();
			expect(stats.cacheSize).toBeGreaterThan(0);

			// Reset
			exporter.reset();

			// Verify reset
			stats = exporter.getStats();
			expect(stats.cacheSize).toBe(0);
			expect(stats.cacheHitRate).toBe(0);

			// Verify metrics are reset
			const metrics = await registry.metrics();
			expect(metrics).toBe(''); // Should be empty after reset
		});

		it('should shutdown cleanly', async () => {
			setupMockRedisData();
			await exporter.exportMetrics();

			await exporter.shutdown();

			const stats = exporter.getStats();
			expect(stats.initialized).toBe(false);
			expect(stats.cacheSize).toBe(0);
		});

		it('should handle shutdown errors gracefully', async () => {
			// No setup needed - just test that shutdown doesn't throw
			await expect(exporter.shutdown()).resolves.not.toThrow();
		});
	});

	// Helper function to setup mock Redis data
	function setupMockRedisData() {
		(mockRedis.scan as jest.Mock)
			.mockResolvedValueOnce(['0', ['bot:testbot:stats']])
			.mockResolvedValueOnce(['0', ['channel:test-channel:activity']]);

		mockPipeline.exec.mockResolvedValue([
			// Bot metrics
			[
				null,
				{
					total_triggers: '100',
					total_responses: '95',
					total_failures: '5',
					avg_response_time: '150.5',
					p95_response_time: '250.0',
					unique_users: '25',
					unique_channels: '5',
					'condition:greeting': '50',
					'condition:farewell': '30',
					'condition:help': '20',
					last_activity: '1234567890',
				},
			],
			// Channel metrics
			[
				null,
				{
					bot_triggers: '200',
					unique_bots: '3',
					unique_users: '15',
					last_trigger: '1234567890',
					guild_id: 'test-guild',
				},
			],
			// System metrics
			[null, 5000], // dbsize
			[null, 'used_memory:2097152\r\nused_memory_human:2.00M\r\n'], // memory info
		]);
	}
});
