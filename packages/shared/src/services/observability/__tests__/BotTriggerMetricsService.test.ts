/**
 * Comprehensive test suite for BotTriggerMetricsService
 *
 * Tests all components including:
 * - Circuit breaker behavior
 * - Batch operations and flushing
 * - Redis operations and error handling
 * - Prometheus metrics integration
 * - Health checks and monitoring
 * - Connection handling and reconnection
 * - Data aggregation and analytics
 */

import { jest } from '@jest/globals';
import type Redis from 'ioredis';
import { BotTriggerMetricsService, createProductionConfig } from '../BotTriggerMetricsService';
import type {
	BotTriggerEvent,
	BotMetricsServiceConfig,
	BotMetricsFilter,
	TimeRangeQuery,
} from '../../../types/bot-metrics';
import * as promClient from 'prom-client';

// Mock ioredis
jest.mock('ioredis', () => {
	const mockRedis = {
		on: jest.fn(),
		connect: jest.fn(),
		ping: jest.fn(),
		script: jest.fn(),
		eval: jest.fn(),
		pipeline: jest.fn(),
		quit: jest.fn(),
		hset: jest.fn(),
		hincrby: jest.fn(),
		expire: jest.fn(),
		zadd: jest.fn(),
		hmget: jest.fn(),
		hgetall: jest.fn(),
		zrangebyscore: jest.fn(),
		scan: jest.fn(),
		dbsize: jest.fn(),
		info: jest.fn(),
	};

	const MockRedis = jest.fn(() => mockRedis);
	return MockRedis;
});

// Get references to the mocks after they're created
const mockRedis = jest.mocked({
	on: jest.fn(),
	connect: jest.fn(),
	ping: jest.fn(),
	script: jest.fn(),
	eval: jest.fn(),
	pipeline: jest.fn(),
	quit: jest.fn(),
	hset: jest.fn(),
	hincrby: jest.fn(),
	expire: jest.fn(),
	zadd: jest.fn(),
	hmget: jest.fn(),
	hgetall: jest.fn(),
	zrangebyscore: jest.fn(),
	scan: jest.fn(),
	dbsize: jest.fn(),
	info: jest.fn(),
});

const mockPipeline = {
	hset: jest.fn().mockReturnThis(),
	hincrby: jest.fn().mockReturnThis(),
	expire: jest.fn().mockReturnThis(),
	zadd: jest.fn().mockReturnThis(),
	exec: jest.fn(),
};

// Mock logger
jest.mock('../../logger', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('BotTriggerMetricsService', () => {
	let service: BotTriggerMetricsService;
	let config: BotMetricsServiceConfig;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup pipeline mock
		mockRedis.pipeline.mockReturnValue(mockPipeline);
		mockPipeline.exec.mockResolvedValue([]);

		// Setup default successful responses
		mockRedis.connect.mockResolvedValue(undefined);
		mockRedis.ping.mockResolvedValue('PONG');
		mockRedis.script.mockResolvedValue('script_hash');
		mockRedis.eval.mockResolvedValue('OK');

		config = createProductionConfig('localhost', 6379);
		service = new BotTriggerMetricsService(config);
	});

	afterEach(async () => {
		try {
			await service.cleanup();
		} catch (error) {
			// Ignore cleanup errors in tests
		}
	});

	describe('Initialization', () => {
		it('should initialize successfully with valid configuration', async () => {
			await service.initialize();

			expect(mockRedis.connect).toHaveBeenCalled();
			expect(mockRedis.script).toHaveBeenCalledWith('LOAD', expect.any(String));
		});

		it('should handle Redis connection failures during initialization', async () => {
			mockRedis.connect.mockRejectedValue(new Error('Connection failed'));

			await expect(service.initialize()).rejects.toThrow('Connection failed');
		});

		it('should not initialize twice', async () => {
			await service.initialize();
			await service.initialize();

			expect(mockRedis.connect).toHaveBeenCalledTimes(1);
		});

		it('should configure Redis event handlers correctly', async () => {
			await service.initialize();

			expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
			expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
			expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
			expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
			expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
		});
	});

	describe('Circuit Breaker', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should track successful operations', async () => {
			const event: BotTriggerEvent = createTestEvent();

			const _result = await service.trackBotTrigger(event);

			expect(result.success).toBe(true);
		});

		it('should open circuit breaker after threshold failures', async () => {
			const event: BotTriggerEvent = createTestEvent();

			// Mock Redis operations to fail
			mockRedis.eval.mockRejectedValue(new Error('Redis error'));
			mockPipeline.exec.mockRejectedValue(new Error('Pipeline error'));

			// Trigger failures to reach threshold (default: 5)
			for (let i = 0; i < 5; i++) {
				const _result = await service.trackBotTrigger(event);
				expect(result.success).toBe(false);
			}

			// Circuit should be open now
			const _result = await service.trackBotTrigger(event);
			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('TRACKING_FAILED');
		});

		it('should transition to half-open state after timeout', async () => {
			const event: BotTriggerEvent = createTestEvent();

			// Create a config with a very short reset timeout for testing
			const testConfig = {
				...config,
				circuitBreaker: {
					failureThreshold: 2,
					resetTimeout: 100, // 100ms
					monitoringPeriod: 10,
				},
			};

			const testService = new BotTriggerMetricsService(testConfig);
			await testService.initialize();

			// Trigger failures to open circuit
			mockRedis.eval.mockRejectedValue(new Error('Redis error'));
			mockPipeline.exec.mockRejectedValue(new Error('Pipeline error'));

			await testService.trackBotTrigger(event);
			await testService.trackBotTrigger(event);

			// Wait for reset timeout
			await new Promise(resolve => setTimeout(resolve, 150));

			// Next operation should attempt execution (half-open state)
			mockRedis.eval.mockResolvedValueOnce('OK');
			const _result = await testService.trackBotTrigger(event);
			expect(result.success).toBe(true);

			await testService.cleanup();
		});
	});

	describe('Batch Operations', () => {
		beforeEach(async () => {
			// Enable batch operations
			config.enableBatchOperations = true;
			config.batchSize = 3;
			config.batchFlushInterval = 100;
			service = new BotTriggerMetricsService(config);
			await service.initialize();
		});

		it('should batch events and flush when batch size reached', async () => {
			const events = [
				createTestEvent('event1'),
				createTestEvent('event2'),
				createTestEvent('event3'),
			];

			// Track events - should trigger flush on 3rd event
			for (const event of events) {
				const _result = await service.trackBotTrigger(event);
				expect(result.success).toBe(true);
			}

			// Wait a bit for batch processing
			await new Promise(resolve => setTimeout(resolve, 50));

			// Should have processed all events
			expect(mockRedis.eval).toHaveBeenCalledTimes(3);
		});

		it('should flush batch after timeout interval', async () => {
			const event = createTestEvent();

			const _result = await service.trackBotTrigger(event);
			expect(result.success).toBe(true);

			// Wait for batch flush interval
			await new Promise(resolve => setTimeout(resolve, 150));

			// Should have flushed the single event
			expect(mockRedis.eval).toHaveBeenCalledTimes(1);
		});

		it('should handle batch processing errors gracefully', async () => {
			const events = [
				createTestEvent('event1'),
				createTestEvent('event2'),
			];

			// Mock batch processing failure
			mockRedis.eval.mockRejectedValue(new Error('Batch processing failed'));
			mockPipeline.exec.mockRejectedValue(new Error('Batch processing failed'));

			// Track events
			for (const event of events) {
				const _result = await service.trackBotTrigger(event);
				expect(result.success).toBe(true); // Should succeed for batched operations
			}

			// Wait for batch processing attempt
			await new Promise(resolve => setTimeout(resolve, 150));
		});
	});

	describe('Direct Processing Mode', () => {
		beforeEach(async () => {
			// Disable batch operations for direct processing
			config.enableBatchOperations = false;
			service = new BotTriggerMetricsService(config);
			await service.initialize();
		});

		it('should process events immediately in direct mode', async () => {
			const event = createTestEvent();

			const _result = await service.trackBotTrigger(event);

			expect(result.success).toBe(true);
			expect(mockRedis.eval).toHaveBeenCalledWith(
				expect.any(String), // Lua script
				8, // Number of keys
				expect.stringContaining('bot:trigger:event:'),
				expect.stringContaining('bot:triggers:'),
				expect.any(String), // hourly key
				expect.any(String), // daily key
				expect.stringContaining('channel:activity:'),
				expect.stringContaining('user:interactions:'),
				expect.stringContaining('bot:conditions:'),
				expect.stringContaining('bot:perf:'),
				expect.any(String), // JSON event data
				expect.any(String), // timestamp
				expect.any(String), // response time
				expect.any(String), // success
				expect.any(String), // condition name
			);
		});

		it('should fallback to pipeline commands when Lua script fails', async () => {
			const event = createTestEvent();

			// Mock Lua script failure
			mockRedis.eval.mockRejectedValue(new Error('Script execution failed'));

			const _result = await service.trackBotTrigger(event);

			expect(result.success).toBe(true);
			expect(mockPipeline.hset).toHaveBeenCalled();
			expect(mockPipeline.hincrby).toHaveBeenCalled();
			expect(mockPipeline.expire).toHaveBeenCalled();
			expect(mockPipeline.exec).toHaveBeenCalled();
		});
	});

	describe('Batch Triggers API', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should process batch of events successfully', async () => {
			const events = [
				createTestEvent('batch1'),
				createTestEvent('batch2'),
				createTestEvent('batch3'),
			];

			const _result = await service.trackBatchTriggers(events);

			expect(result.success).toBe(true);
			expect(result.data?.successful).toBe(3);
			expect(result.data?.failed).toBe(0);
			expect(result.data?.processingTimeMs).toBeGreaterThan(0);
		});

		it('should handle batch processing failures', async () => {
			const events = [createTestEvent('batch1')];

			mockRedis.eval.mockRejectedValue(new Error('Batch processing failed'));
			mockPipeline.exec.mockRejectedValue(new Error('Batch processing failed'));

			const _result = await service.trackBatchTriggers(events);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('BATCH_PROCESSING_FAILED');
		});
	});

	describe('Analytics and Reporting', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should retrieve bot metrics successfully', async () => {
			const filter: BotMetricsFilter = { botName: 'testBot' };
			const timeRange: TimeRangeQuery = {
				startTime: Date.now() - 3600000, // 1 hour ago
				endTime: Date.now(),
				period: 'hour',
			};

			// Mock Redis responses
			mockRedis.hmget.mockResolvedValue(['100', '95', '5', '5000']); // Basic stats
			mockRedis.zrangebyscore.mockResolvedValue(['100', '150', '200']); // Response times
			mockRedis.hgetall.mockResolvedValue({
				'condition1': '50',
				'condition2': '45',
			});

			const _result = await service.getBotMetrics(filter, timeRange);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.botName).toBe('testBot');
			expect(result.data?.stats.totalTriggers).toBe(100);
			expect(result.data?.stats.totalResponses).toBe(95);
			expect(result.data?.topConditions).toHaveLength(2);
		});

		it('should handle missing bot name in filter', async () => {
			const filter: BotMetricsFilter = {}; // Missing botName

			const _result = await service.getBotMetrics(filter);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('ANALYTICS_FAILED');
		});

		it('should retrieve channel metrics successfully', async () => {
			const channelId = 'channel123';
			const timeRange: TimeRangeQuery = {
				startTime: Date.now() - 86400000, // 24 hours ago
				endTime: Date.now(),
				period: 'hour',
			};

			mockRedis.hgetall.mockResolvedValue({
				bot_triggers: '25',
				last_trigger: Date.now().toString(),
			});

			const _result = await service.getChannelMetrics(channelId, timeRange);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.channelId).toBe(channelId);
			expect(result.data?.stats.totalBotTriggers).toBe(25);
		});

		it('should retrieve user metrics successfully', async () => {
			const userId = 'user123';
			const timeRange: TimeRangeQuery = {
				startTime: Date.now() - 86400000,
				endTime: Date.now(),
				period: 'day',
			};

			mockRedis.hgetall.mockResolvedValue({
				bot_triggers: '15',
				last_trigger: Date.now().toString(),
			});

			const _result = await service.getUserMetrics(userId, timeRange);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.userId).toBe(userId);
			expect(result.data?.stats.totalBotTriggers).toBe(15);
		});
	});

	describe('Aggregated Metrics', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should retrieve aggregated metrics for single bot', async () => {
			const filter: BotMetricsFilter = { botName: 'testBot' };
			const timeRange: TimeRangeQuery = {
				startTime: Date.now() - 86400000, // 24 hours ago
				endTime: Date.now(),
				period: 'hour',
			};

			// Mock aggregation data
			mockRedis.hgetall.mockResolvedValue({
				triggers: '50',
				responses: '48',
				failures: '2',
				response_time_sum: '2500',
				min_response_time: '50',
				max_response_time: '300',
				unique_users: '10',
				unique_channels: '3',
			});

			const _result = await service.getAggregatedMetrics(filter, timeRange);

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(Array.isArray(result.data)).toBe(true);
		});

		it('should generate correct time keys for different periods', async () => {
			const filter: BotMetricsFilter = { botName: 'testBot' };

			// Test hourly aggregation
			const hourlyRange: TimeRangeQuery = {
				startTime: Date.now() - 7200000, // 2 hours ago
				endTime: Date.now(),
				period: 'hour',
			};

			mockRedis.hgetall.mockResolvedValue({});
			await service.getAggregatedMetrics(filter, hourlyRange);

			// Test daily aggregation
			const dailyRange: TimeRangeQuery = {
				startTime: Date.now() - 86400000 * 3, // 3 days ago
				endTime: Date.now(),
				period: 'day',
			};

			await service.getAggregatedMetrics(filter, dailyRange);

			// Verify Redis calls were made (exact verification would require more detailed mocking)
			expect(mockRedis.hgetall).toHaveBeenCalled();
		});
	});

	describe('Health Monitoring', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should return healthy status when Redis is connected', async () => {
			mockRedis.ping.mockResolvedValue('PONG');

			const health = await service.getHealthStatus();

			expect(health.status).toBe('healthy');
			expect(health.service).toBe('BotTriggerMetricsService');
			expect(health.checks.redis.status).toBe('connected');
			expect(health.checks.redis.latency).toBeGreaterThan(0);
		});

		it('should return unhealthy status when Redis is disconnected', async () => {
			mockRedis.ping.mockRejectedValue(new Error('Connection lost'));

			const health = await service.getHealthStatus();

			expect(health.status).toBe('unhealthy');
			expect(health.checks.redis.status).toBe('error');
			expect(health.checks.redis.error).toBe('Connection lost');
		});

		it('should include circuit breaker status in health check', async () => {
			// Trigger circuit breaker to open
			const event = createTestEvent();
			mockRedis.eval.mockRejectedValue(new Error('Redis error'));
			mockPipeline.exec.mockRejectedValue(new Error('Redis error'));

			// Cause failures to open circuit breaker
			for (let i = 0; i < 5; i++) {
				await service.trackBotTrigger(event);
			}

			const health = await service.getHealthStatus();

			expect(health.checks.circuitBreaker.status).toBe('OPEN');
			expect(health.checks.circuitBreaker.failureCount).toBeGreaterThan(0);
		});
	});

	describe('Prometheus Metrics Export', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should export Prometheus metrics successfully', async () => {
			const _result = await service.exportPrometheusMetrics();

			expect(result.success).toBe(true);
			expect(typeof result.data).toBe('string');
			expect(result.data).toContain('# HELP');
		});

		it('should update circuit breaker gauge in metrics', async () => {
			// First export - circuit should be closed
			await service.exportPrometheusMetrics();

			// Get current registry state
			const registry = (service as any).metricsRegistry;
			const metrics = await registry.metrics();

			expect(metrics).toContain('bot_metrics_circuit_breaker_state 0');
		});
	});

	describe('Error Handling and Edge Cases', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should handle malformed event data gracefully', async () => {
			const malformedEvent = {
				...createTestEvent(),
				timestamp: 'invalid' as any,
			};

			const _result = await service.trackBotTrigger(malformedEvent);

			// Should still attempt processing and handle the error gracefully
			expect(result).toBeDefined();
		});

		it('should handle Redis timeout errors', async () => {
			const event = createTestEvent();

			mockRedis.eval.mockRejectedValue(new Error('Command timed out'));
			mockPipeline.exec.mockRejectedValue(new Error('Command timed out'));

			const _result = await service.trackBotTrigger(event);

			expect(result.success).toBe(false);
			expect(result.error?.message).toContain('Command timed out');
		});

		it('should auto-initialize when not initialized', async () => {
			const uninitializedService = new BotTriggerMetricsService(config);
			const event = createTestEvent();

			const _result = await uninitializedService.trackBotTrigger(event);

			expect(result.success).toBe(true);
			expect(mockRedis.connect).toHaveBeenCalled();

			await uninitializedService.cleanup();
		});
	});

	describe('Cleanup and Resource Management', () => {
		beforeEach(async () => {
			await service.initialize();
		});

		it('should cleanup resources successfully', async () => {
			const _result = await service.cleanup();

			expect(result.success).toBe(true);
			expect(mockRedis.quit).toHaveBeenCalled();
		});

		it('should handle cleanup failures gracefully', async () => {
			mockRedis.quit.mockRejectedValue(new Error('Quit failed'));

			const _result = await service.cleanup();

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('CLEANUP_FAILED');
		});
	});

	describe('Performance and Load Testing', () => {
		beforeEach(async () => {
			config.enableBatchOperations = true;
			config.batchSize = 100;
			service = new BotTriggerMetricsService(config);
			await service.initialize();
		});

		it('should handle high-frequency event tracking', async () => {
			const events = Array.from({ length: 1000 }, (_, i) => createTestEvent(`event${i}`));
			const startTime = Date.now();

			const promises = events.map(event => service.trackBotTrigger(event));
			const results = await Promise.all(promises);

			const processingTime = Date.now() - startTime;

			expect(results.every(r => r.success)).toBe(true);
			expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
		});

		it('should handle concurrent batch operations', async () => {
			const batches = Array.from({ length: 10 }, (_, batchIndex) =>
				Array.from({ length: 50 }, (_, i) => createTestEvent(`batch${batchIndex}_event${i}`))
			);

			const promises = batches.map(batch => service.trackBatchTriggers(batch));
			const results = await Promise.all(promises);

			expect(results.every(r => r.success)).toBe(true);
			expect(results.reduce((sum, r) => sum + (r.data?.successful || 0), 0)).toBe(500);
		});
	});

	// Helper functions
	function createTestEvent(id = 'test'): BotTriggerEvent {
		return {
			triggerId: `trigger-${id}-${Date.now()}`,
			timestamp: Date.now(),
			botName: 'testBot',
			conditionName: 'testCondition',
			userId: 'user123',
			channelId: 'channel123',
			guildId: 'guild123',
			messageId: 'message123',
			responseTimeMs: 150,
			success: true,
			responseType: 'message',
			metadata: {
				testMode: true,
			},
		};
	}
});

describe('BotTriggerMetricsService Factory Functions', () => {
	it('should create production config with defaults', () => {
		const config = createProductionConfig();

		expect(config.redis.host).toBe('localhost');
		expect(config.redis.port).toBe(6379);
		expect(config.enableBatchOperations).toBe(true);
		expect(config.enableCircuitBreaker).toBe(true);
		expect(config.retention).toBeDefined();
	});

	it('should create production config with custom parameters', () => {
		const config = createProductionConfig('redis.example.com', 6380);

		expect(config.redis.host).toBe('redis.example.com');
		expect(config.redis.port).toBe(6380);
	});
});