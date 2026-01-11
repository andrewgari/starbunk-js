/**
 * Integration tests for BotTriggerIntegration
 *
 * Tests the integration layer between BotTriggerMetricsService and _BunkBotMetricsCollector:
 * - Enhanced_BunkBotMetricsCollector initialization and operation
 * - BotTriggerTracker functionality
 * - Environment detection and configuration
 * - Integration with existing metrics infrastructure
 * - Graceful fallback mechanisms
 * - Health monitoring and status reporting
 */

import { jest } from '@jest/globals';
import type { MessageContext } from '../container-metrics';
import type { ProductionMetricsService } from '../production-metrics-service';

// Mock initializeBotTriggerMetricsService function
jest.mock('../BotTriggerMetricsService', () => {
	const actual = jest.requireActual('../BotTriggerMetricsService');

	// Create mock service inside the factory to avoid hoisting issues
	const internalMockService = {
		initialize: jest.fn(),
		trackBotTrigger: jest.fn(),
		getBotMetrics: jest.fn(),
		getHealthStatus: jest.fn(),
		cleanup: jest.fn(),
	};

	// Mock initializeBotTriggerMetricsService to simulate real behavior
	const mockInitialize = jest.fn().mockImplementation(async (config) => {
		// Simulate the real function behavior: create instance and call initialize
		if (internalMockService.initialize) {
			await internalMockService.initialize();
		}
		return internalMockService;
	});

	return {
		...actual,
		BotTriggerMetricsService: jest.fn(() => internalMockService),
		initializeBotTriggerMetricsService: mockInitialize,
		// Export the mock service for test access
		__mockService: internalMockService,
	};
});

// Get the mock service from the mocked module
const { __mockService: mockBotTriggerService } = require('../bot-trigger-metrics-service');

// Import modules after mocks are set up
const {
	Enhanced_BunkBotMetricsCollector,
	BotTriggerTracker,
	createEnhancedBunkBotMetrics,
	createEnvironmentConfig,
	initializeBotMetricsSystem,
} = require('../bot-trigger-integration');
const { BotTriggerMetricsService, initializeBotTriggerMetricsService } = require('../bot-trigger-metrics-service');

// Mock dependencies
jest.mock('../../logger', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

// Mock ProductionMetricsService
const mockMetricsService = {
	getRegistry: jest.fn(),
	incrementCounter: jest.fn(),
	observeHistogram: jest.fn(),
} as unknown as ProductionMetricsService;

// Mock _BunkBotMetricsCollector with enhanced methods
const mock_BunkBotMetricsCollector = {
	// Base class methods
	trackBotTrigger: jest.fn(),
	trackBotResponse: jest.fn(),
	sanitizeLabel: jest.fn((label: string) => label),
	getHealthStatus: jest.fn(() => ({ status: 'healthy' })),
	cleanup: jest.fn(),

	// Enhanced methods added by Enhanced_BunkBotMetricsCollector
	initializeEnhancedTracking: jest.fn().mockResolvedValue(undefined),
	getEnhancedHealthStatus: jest.fn().mockResolvedValue({
		enhancedTracking: {
			enabled: true,
			redisHealth: {
				service: 'BotTriggerMetricsService',
				status: 'healthy',
				timestamp: Date.now(),
				checks: {
					redis: { status: 'connected', latency: 10 },
					circuitBreaker: { status: 'CLOSED', failureCount: 0 },
					memory: { usage: 100000, limit: 1000000 },
				},
				metrics: {
					operationsPerSecond: 10,
					avgResponseTime: 50,
					errorRate: 0.01,
				},
			},
		},
	}),
	getBotTriggerService: jest.fn(() => mockBotTriggerService),
};

jest.mock('../BunkBotMetrics', () => ({
	_BunkBotMetricsCollector: jest.fn(() => mock_BunkBotMetricsCollector),
}));

// Reference to the mocked initializeBotTriggerMetricsService function for test expectations

describe('BotTriggerIntegration', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		jest.clearAllMocks();

		// Save original environment
		originalEnv = { ...process.env };

		// Setup mock behavior (mocks are already configured in the jest.mock call)

		// Mock successful operations by default
		mockBotTriggerService.initialize.mockResolvedValue(undefined);
		(initializeBotTriggerMetricsService as jest.Mock).mockResolvedValue(mockBotTriggerService);
		mockBotTriggerService.trackBotTrigger.mockResolvedValue({ success: true });
		mockBotTriggerService.getBotMetrics.mockResolvedValue({
			success: true,
			data: {
				botName: 'testBot',
				timeRange: { start: 0, end: Date.now() },
				stats: {
					totalTriggers: 100,
					totalResponses: 95,
					successRate: 0.95,
					avgResponseTime: 150,
					medianResponseTime: 140,
					p95ResponseTime: 250,
					uniqueUsers: 25,
					uniqueChannels: 5,
					uniqueGuilds: 3,
				},
				trends: {
					triggersPerHour: [],
					avgResponseTimePerHour: [],
					successRatePerHour: [],
					timestamps: [],
				},
				topConditions: [],
				channelDistribution: [],
				userEngagement: [],
			},
		});
		mockBotTriggerService.getHealthStatus.mockResolvedValue({
			service: 'BotTriggerMetricsService',
			status: 'healthy',
			timestamp: Date.now(),
			checks: {
				redis: { status: 'connected', latency: 10 },
				circuitBreaker: { status: 'CLOSED', failureCount: 0 },
				memory: { usage: 100000, limit: 1000000 },
			},
			metrics: {
				operationsPerSecond: 10,
				avgResponseTime: 50,
				errorRate: 0.01,
			},
		});
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
	});

	describe('Enhanced_BunkBotMetricsCollector', () => {
		let collector: Enhanced_BunkBotMetricsCollector;

		beforeEach(() => {
			collector = createEnhancedBunkBotMetrics(mockMetricsService);
		});

		afterEach(async () => {
			try {
				await collector.cleanup();
			} catch (error) {
				// Ignore cleanup errors in tests
			}
		});

		describe('Initialization', () => {
			it('should initialize enhanced tracking successfully', async () => {
				await collector.initializeEnhancedTracking();

				expect(initializeBotTriggerMetricsService).toHaveBeenCalled();
				expect(mockBotTriggerService.initialize).toHaveBeenCalled();
			});

			it('should handle Redis connection failure gracefully', async () => {
				// Mock the function to reject
				(initializeBotTriggerMetricsService as jest.Mock).mockRejectedValueOnce(
					new Error('Redis connection failed'),
				);

				await collector.initializeEnhancedTracking();

				// Should not throw and fall back to standard metrics only
				expect(initializeBotTriggerMetricsService).toHaveBeenCalled();
			});

			it('should not initialize twice', async () => {
				await collector.initializeEnhancedTracking();
				await collector.initializeEnhancedTracking();

				expect(initializeBotTriggerMetricsService).toHaveBeenCalledTimes(1);
			});

			it('should use environment-based Redis configuration', async () => {
				process.env.REDIS_HOST = 'test-redis';
				process.env.REDIS_PORT = '6380';
				process.env.REDIS_PASSWORD = 'test-password';
				process.env.REDIS_DB = '2';

				await collector.initializeEnhancedTracking();

				expect(initializeBotTriggerMetricsService).toHaveBeenCalledWith(
					expect.objectContaining({
						redis: expect.objectContaining({
							host: 'test-redis',
							port: 6380,
							password: 'test-password',
							db: 2,
						}),
					}),
				);
			});
		});

		describe('Bot Trigger Tracking', () => {
			const messageContext: MessageContext = {
				messageId: 'message123',
				userId: 'user123',
				username: 'testuser',
				channelId: 'channel123',
				channelName: 'test-channel',
				guildId: 'guild123',
				messageLength: 20,
				timestamp: Date.now(),
			};

			beforeEach(async () => {
				await collector.initializeEnhancedTracking();
			});

			it('should track bot trigger with both base and enhanced metrics', () => {
				collector.trackBotTrigger('testBot', 'testCondition', messageContext);

				expect(mock_BunkBotMetricsCollector.trackBotTrigger).toHaveBeenCalledWith(
					'testBot',
					'testCondition',
					messageContext,
				);
			});

			it('should track bot response with timing and success metrics', () => {
				collector.trackBotResponse('testBot', 'testCondition', 150, messageContext, true, 'message');

				expect(mock_BunkBotMetricsCollector.trackBotResponse).toHaveBeenCalledWith(
					'testBot',
					'testCondition',
					150,
					messageContext,
					true,
					'message',
				);
			});

			it('should handle enhanced tracking when disabled', async () => {
				// Create collector without enhanced tracking
				const basicCollector = createEnhancedBunkBotMetrics(
					mockMetricsService,
					{},
					{
						enableEnhancedTracking: false,
					},
				);

				basicCollector.trackBotTrigger('testBot', 'testCondition', messageContext);

				expect(mock_BunkBotMetricsCollector.trackBotTrigger).toHaveBeenCalled();
				// Redis service should not be used
			});

			it('should continue working when Redis tracking fails', async () => {
				mockBotTriggerService.trackBotTrigger.mockRejectedValue(new Error('Redis failed'));

				// Should not throw
				collector.trackBotTrigger('testBot', 'testCondition', messageContext);

				expect(mock_BunkBotMetricsCollector.trackBotTrigger).toHaveBeenCalled();
			});
		});

		describe('Health Status', () => {
			it('should return enhanced health status with Redis metrics', async () => {
				await collector.initializeEnhancedTracking();

				const health = await collector.getEnhancedHealthStatus();

				expect(health.enhancedTracking.enabled).toBe(true);
				expect(health.enhancedTracking.redisHealth).toBeDefined();
				expect(health.enhancedTracking.redisHealth.service).toBe('BotTriggerMetricsService');
				expect(health.enhancedTracking.redisHealth.status).toBe('healthy');
			});

			it('should handle Redis health check failures', async () => {
				await collector.initializeEnhancedTracking();
				mockBotTriggerService.getHealthStatus.mockRejectedValue(new Error('Health check failed'));

				const health = await collector.getEnhancedHealthStatus();

				expect(health.enhancedTracking.enabled).toBe(true);
				expect(health.enhancedTracking.error).toBe('Health check failed');
			});

			it('should return basic health when enhanced tracking disabled', async () => {
				const health = await collector.getEnhancedHealthStatus();

				expect(health.enhancedTracking.enabled).toBe(false);
			});
		});

		describe('Resource Cleanup', () => {
			it('should cleanup both base and enhanced resources', async () => {
				await collector.initializeEnhancedTracking();
				await collector.cleanup();

				expect(mock_BunkBotMetricsCollector.cleanup).toHaveBeenCalled();
				expect(mockBotTriggerService.cleanup).toHaveBeenCalled();
			});

			it('should handle cleanup errors gracefully', async () => {
				await collector.initializeEnhancedTracking();
				mockBotTriggerService.cleanup.mockRejectedValue(new Error('Cleanup failed'));

				// Should not throw
				await collector.cleanup();

				expect(mock_BunkBotMetricsCollector.cleanup).toHaveBeenCalled();
			});
		});
	});

	describe('BotTriggerTracker', () => {
		let tracker: BotTriggerTracker;
		let collector: Enhanced_BunkBotMetricsCollector;

		beforeEach(async () => {
			collector = createEnhancedBunkBotMetrics(mockMetricsService);
			tracker = new BotTriggerTracker();
			await tracker.initialize(collector);
		});

		afterEach(async () => {
			try {
				await tracker.cleanup();
			} catch (error) {
				// Ignore cleanup errors
			}
		});

		describe('Initialization', () => {
			it('should initialize with enhanced tracking enabled by default', async () => {
				expect(mockBotTriggerService.initialize).toHaveBeenCalled();
			});

			it('should respect enhanced tracking configuration', async () => {
				const basicTracker = new BotTriggerTracker({ enableEnhancedTracking: false });
				const basicCollector = createEnhancedBunkBotMetrics(mockMetricsService);

				await basicTracker.initialize(basicCollector);

				// Should not initialize enhanced tracking
				expect(mockBotTriggerService.initialize).toHaveBeenCalledTimes(1); // From previous test
				await basicTracker.cleanup();
			});
		});

		describe('Trigger Tracking', () => {
			const messageContext: MessageContext = {
				messageId: 'message123',
				userId: 'user123',
				username: 'testuser',
				channelId: 'channel123',
				channelName: 'test-channel',
				guildId: 'guild123',
				messageLength: 20,
				timestamp: Date.now(),
			};

			it('should track triggers when initialized', () => {
				tracker.trackTrigger('testBot', 'testCondition', messageContext);

				expect(mock_BunkBotMetricsCollector.trackBotTrigger).toHaveBeenCalledWith(
					'testBot',
					'testCondition',
					messageContext,
				);
			});

			it('should track responses when initialized', () => {
				tracker.trackResponse('testBot', 'testCondition', 150, messageContext, true, 'message');

				expect(mock_BunkBotMetricsCollector.trackBotResponse).toHaveBeenCalledWith(
					'testBot',
					'testCondition',
					150,
					messageContext,
					true,
					'message',
				);
			});

			it('should handle tracking when not initialized', () => {
				const uninitializedTracker = new BotTriggerTracker();

				// Should not throw
				uninitializedTracker.trackTrigger('testBot', 'testCondition', messageContext);
				uninitializedTracker.trackResponse('testBot', 'testCondition', 150, messageContext);
			});
		});

		describe('Analytics', () => {
			it('should retrieve bot analytics when enhanced tracking is enabled', async () => {
				const _result = await tracker.getBotAnalytics('testBot', 24);

				expect(_result.success).toBe(true);
				expect(_result.data).toBeDefined();
				expect(mockBotTriggerService.getBotMetrics).toHaveBeenCalledWith(
					{ botName: 'testBot' },
					expect.objectContaining({
						period: 'hour',
					}),
				);
			});

			it('should handle analytics request when not initialized', async () => {
				const uninitializedTracker = new BotTriggerTracker();

				const _result = await uninitializedTracker.getBotAnalytics('testBot');

				expect(_result.success).toBe(false);
				expect(_result.error?.code).toBe('NOT_INITIALIZED');
			});

			it('should handle analytics when enhanced tracking disabled', async () => {
				const basicTracker = new BotTriggerTracker({ enableEnhancedTracking: false });
				const basicCollector = createEnhancedBunkBotMetrics(
					mockMetricsService,
					{},
					{
						enableEnhancedTracking: false,
					},
				);

				await basicTracker.initialize(basicCollector);

				const _result = await basicTracker.getBotAnalytics('testBot');

				expect(_result.success).toBe(false);
				expect(_result.error?.code).toBe('ENHANCED_TRACKING_DISABLED');

				await basicTracker.cleanup();
			});
		});

		describe('Health Status', () => {
			it('should return health status when initialized', async () => {
				const health = await tracker.getHealthStatus();

				expect(health.enhancedTracking.enabled).toBe(true);
				expect(health.enhancedTracking.redisHealth).toBeDefined();
			});

			it('should return not initialized status when not initialized', async () => {
				const uninitializedTracker = new BotTriggerTracker();

				const health = await uninitializedTracker.getHealthStatus();

				expect(health.status).toBe('not_initialized');
			});
		});
	});

	describe('Environment Configuration', () => {
		beforeEach(() => {
			// Reset environment
			delete process.env.NODE_ENV;
			delete process.env.DOCKER;
			delete process.env.CONTAINER_NAME;
			delete process.env.REDIS_HOST;
			delete process.env.REDIS_PORT;
			delete process.env.REDIS_PASSWORD;
			delete process.env.REDIS_DB;
			delete process.env.ENABLE_ENHANCED_BOT_TRACKING;
		});

		it('should create development configuration by default', () => {
			const config = createEnvironmentConfig();

			expect(config.environment).toBe('development');
			expect(config.redis?.host).toBe('localhost');
			expect(config.redis?.port).toBe(6379);
			expect(config.enableBatchOperations).toBe(false);
			expect(config.batchSize).toBe(10);
		});

		it('should create production configuration in production environment', () => {
			process.env.NODE_ENV = 'production';

			const config = createEnvironmentConfig();

			expect(config.environment).toBe('production');
			expect(config.enableBatchOperations).toBe(true);
			expect(config.batchSize).toBe(100);
		});

		it('should use Docker service names in Docker environment', () => {
			process.env.DOCKER = 'true';

			const config = createEnvironmentConfig();

			expect(config.redis?.host).toBe('redis');
		});

		it('should detect container environment from CONTAINER_NAME', () => {
			process.env.CONTAINER_NAME = 'bunkbot';

			const config = createEnvironmentConfig();

			expect(config.redis?.host).toBe('redis');
		});

		it('should respect Redis configuration from environment', () => {
			process.env.REDIS_HOST = 'custom-redis';
			process.env.REDIS_PORT = '6380';
			process.env.REDIS_PASSWORD = 'secret';
			process.env.REDIS_DB = '5';

			const config = createEnvironmentConfig();

			expect(config.redis?.host).toBe('custom-redis');
			expect(config.redis?.port).toBe(6380);
			expect(config.redis?.password).toBe('secret');
			expect(config.redis?.db).toBe(5);
		});

		it('should respect enhanced tracking configuration', () => {
			process.env.ENABLE_ENHANCED_BOT_TRACKING = 'false';

			const config = createEnvironmentConfig();

			expect(config.enableEnhancedTracking).toBe(false);
		});
	});

	describe('Complete System Integration', () => {
		it('should initialize complete bot metrics system', async () => {
			const system = await initializeBotMetricsSystem(mockMetricsService);

			expect(system.metricsCollector).toBeInstanceOf(Enhanced_BunkBotMetricsCollector);
			expect(system.tracker).toBeInstanceOf(BotTriggerTracker);
			expect(system.config).toBeDefined();
			expect(initializeBotTriggerMetricsService).toHaveBeenCalled();

			// Cleanup
			await system.tracker.cleanup();
		});

		it('should merge custom configuration with environment config', async () => {
			const customConfig = {
				redis: {
					host: 'override-redis',
					port: 7000,
				},
				batchSize: 250,
			};

			const system = await initializeBotMetricsSystem(mockMetricsService, customConfig);

			expect(system.config.redis?.host).toBe('override-redis');
			expect(system.config.redis?.port).toBe(7000);
			expect(system.config.batchSize).toBe(250);

			// Should still keep environment defaults for unspecified values
			expect(system.config.redis?.db).toBe(0); // Default from environment config

			// Cleanup
			await system.tracker.cleanup();
		});

		it('should handle system initialization failure gracefully', async () => {
			mockBotTriggerService.initialize.mockRejectedValue(new Error('System initialization failed'));

			// Should throw initialization error
			await expect(initializeBotMetricsSystem(mockMetricsService)).rejects.toThrow(
				'System initialization failed',
			);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle missing message context gracefully', async () => {
			const collector = createEnhancedBunkBotMetrics(mockMetricsService);
			await collector.initializeEnhancedTracking();

			const incompleteContext = {
				messageId: 'message123',
				userId: 'user123',
				username: 'testuser',
				channelId: 'channel123',
				channelName: 'test-channel',
				guildId: 'guild123',
				messageLength: 0,
				timestamp: Date.now(),
			} as MessageContext;

			// Should not throw
			collector.trackBotTrigger('testBot', 'testCondition', incompleteContext);
			collector.trackBotResponse('testBot', 'testCondition', 150, incompleteContext);

			await collector.cleanup();
		});

		it('should sanitize labels correctly', async () => {
			const collector = createEnhancedBunkBotMetrics(mockMetricsService);
			await collector.initializeEnhancedTracking();

			mock_BunkBotMetricsCollector.sanitizeLabel.mockImplementation((label: string) =>
				label.replace(/[^a-zA-Z0-9_]/g, '_'),
			);

			const messageContext: MessageContext = {
				messageId: 'message123',
				userId: 'user123',
				username: 'testuser',
				channelId: 'channel123',
				channelName: 'test-channel',
				guildId: 'guild123',
				messageLength: 20,
				timestamp: Date.now(),
			};

			collector.trackBotTrigger('test-bot!@#', 'test condition', messageContext);

			expect(mock_BunkBotMetricsCollector.sanitizeLabel).toHaveBeenCalledWith('test-bot!@#');
			expect(mock_BunkBotMetricsCollector.sanitizeLabel).toHaveBeenCalledWith('test condition');

			await collector.cleanup();
		});

		it('should handle concurrent initialization attempts', async () => {
			const collector = createEnhanced_BunkBotMetricsCollector(mockMetricsService);

			// Start multiple initializations concurrently
			const promises = Array.from({ length: 5 }, () => collector.initializeEnhancedTracking());
			await Promise.all(promises);

			// Should only initialize once
			expect(mockBotTriggerService.initialize).toHaveBeenCalledTimes(1);

			await collector.cleanup();
		});
	});
});

function createEnhanced_BunkBotMetricsCollector(metricsService: ProductionMetricsService) {
	return createEnhancedBunkBotMetrics(metricsService);
}
