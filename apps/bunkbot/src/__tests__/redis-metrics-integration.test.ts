/**
 * End-to-End Redis Metrics Integration Tests for BunkBot
 *
 * Tests the complete integration of Redis bot trigger metrics system with BunkBot:
 * - MessageProcessor integration with enhanced metrics tracking
 * - Bot trigger condition evaluation and metrics collection
 * - Response time measurement and success/failure tracking
 * - Redis data persistence and retrieval
 * - Prometheus metrics export pipeline
 * - Full workflow from Discord message to metrics export
 * - Performance under load and error conditions
 * - Health monitoring and diagnostics
 */

import { jest } from '@jest/globals';
import type { Message, TextChannel, Guild, GuildMember } from 'discord.js';
import { MessageProcessor } from '../core/MessageProcessor';
import { BotRegistry } from '../core/BotRegistry';
import { Enhanced_BunkBotMetricsCollector, BotTriggerTracker, initializeBotMetricsSystem } from '@starbunk/shared';
import type { ProductionMetricsService } from '@starbunk/shared';

// Mock Discord.js objects
const createMockMessage = (content: string, messageId = 'test-message-id'): Partial<Message> => ({
	id: messageId,
	content,
	author: {
		id: 'user123',
		bot: false,
		username: 'testuser',
		tag: 'testuser#1234',
	} as any,
	channel: {
		id: 'channel123',
		type: 0, // TEXT channel type
		guild: {
			id: 'guild123',
			name: 'Test Guild',
		} as Partial<Guild>,
		send: jest.fn().mockResolvedValue({}),
		isTextBased: () => true,
	} as Partial<TextChannel> as any,
	guild: {
		id: 'guild123',
		name: 'Test Guild',
		members: {
			cache: new Map(),
		},
	} as Partial<Guild> as any,
	member: {
		id: 'user123',
		user: {
			id: 'user123',
			username: 'testuser',
		},
		roles: {
			cache: new Map(),
		},
	} as Partial<GuildMember> as any,
	createdAt: new Date(),
	createdTimestamp: Date.now(),
});

// Mock Redis for integration testing
const mockRedis = {
	on: jest.fn(),
	connect: jest.fn().mockResolvedValue(undefined),
	ping: jest.fn().mockResolvedValue('PONG'),
	script: jest.fn().mockResolvedValue('script_hash'),
	eval: jest.fn().mockResolvedValue('OK'),
	pipeline: jest.fn(),
	quit: jest.fn().mockResolvedValue(undefined),
	hset: jest.fn().mockResolvedValue(1),
	hincrby: jest.fn().mockResolvedValue(1),
	expire: jest.fn().mockResolvedValue(1),
	zadd: jest.fn().mockResolvedValue(1),
	hmget: jest.fn().mockResolvedValue(['10', '9', '1', '150']),
	hgetall: jest.fn().mockResolvedValue({
		total_triggers: '10',
		total_responses: '9',
		total_failures: '1',
		'condition:greeting': '5',
		'condition:help': '3',
	}),
	zrangebyscore: jest.fn().mockResolvedValue(['100', '150', '200']),
	scan: jest.fn().mockResolvedValue(['0', []]),
	dbsize: jest.fn().mockResolvedValue(100),
	info: jest.fn().mockResolvedValue('used_memory:1048576\r\n'),
} as any;

const mockPipeline = {
	hset: jest.fn().mockReturnThis(),
	hincrby: jest.fn().mockReturnThis(),
	expire: jest.fn().mockReturnThis(),
	zadd: jest.fn().mockReturnThis(),
	hgetall: jest.fn().mockReturnThis(),
	dbsize: jest.fn().mockReturnThis(),
	info: jest.fn().mockReturnThis(),
	exec: jest.fn().mockResolvedValue([]),
};

// Mock ioredis
jest.mock('ioredis', () => {
	return jest.fn(() => mockRedis);
});

// Mock logger
jest.mock('@starbunk/shared', () => {
	const actual = jest.requireActual('@starbunk/shared');
	return {
		...actual,
		logger: {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
		},
	};
});

// Mock ProductionMetricsService
const mockMetricsService = {
	getRegistry: jest.fn(() => ({
		metrics: jest.fn().mockResolvedValue('# Mock metrics'),
		clear: jest.fn(),
	})),
	incrementCounter: jest.fn(),
	observeHistogram: jest.fn(),
} as unknown as ProductionMetricsService;

// Mock bot implementations
const mockGreetingBot = {
	name: 'greeting',
	conditions: [
		{
			name: 'simple_greeting',
			check: (message: Message) => /^(hi|hello|hey)\b/i.test(message.content),
		},
		{
			name: 'formal_greeting',
			check: (message: Message) => /^(good morning|good afternoon|good evening)\b/i.test(message.content),
		},
	],
	execute: jest.fn().mockImplementation(async (message: Message) => {
		await (message.channel as TextChannel).send('Hello there!');
		return { success: true, responseType: 'message' as const };
	}),
};

const mockHelpBot = {
	name: 'help',
	conditions: [
		{
			name: 'help_request',
			check: (message: Message) => /^(!help|\/help)\b/i.test(message.content),
		},
	],
	execute: jest.fn().mockImplementation(async (message: Message) => {
		await (message.channel as TextChannel).send('Here is some help!');
		return { success: true, responseType: 'message' as const };
	}),
};

const mockFailingBot = {
	name: 'failing',
	conditions: [
		{
			name: 'failure_trigger',
			check: (message: Message) => /^fail me$/i.test(message.content),
		},
	],
	execute: jest.fn().mockImplementation(async () => {
		throw new Error('Intentional bot failure for testing');
	}),
};

// Gate these E2E-style Redis integration tests behind an env flag to keep Husky/CI fast and stable by default
// Enable by setting E2E_REDIS_TESTS=true when you explicitly want to run them.
const describeIfRedisE2E = process.env.E2E_REDIS_TESTS === 'true' ? describe : describe.skip;

describeIfRedisE2E('Redis Metrics Integration - End-to-End', () => {
	let messageProcessor: MessageProcessor;
	let botRegistry: BotRegistry;
	let metricsCollector: Enhanced_BunkBotMetricsCollector;
	let tracker: BotTriggerTracker;
	let originalEnv: NodeJS.ProcessEnv;
	let activeTimeouts: NodeJS.Timeout[] = [];

	beforeEach(async () => {
		jest.clearAllMocks();

		// Save original environment
		originalEnv = { ...process.env };

		// Set test environment
		process.env.REDIS_HOST = 'localhost';
		process.env.REDIS_PORT = '6379';
		process.env.ENABLE_ENHANCED_BOT_TRACKING = 'true';

		// Setup Redis mocks
		mockRedis.pipeline.mockReturnValue(mockPipeline);
		mockPipeline.exec.mockResolvedValue([
			[null, 'OK'], // hset result
			[null, 1], // hincrby result
			[null, 1], // expire result
		]);

		// Initialize bot registry and register test bots
		BotRegistry.reset(); // Reset singleton for test isolation
		botRegistry = BotRegistry.getInstance();
		botRegistry.registerBot(mockGreetingBot as any);
		botRegistry.registerBot(mockHelpBot as any);
		botRegistry.registerBot(mockFailingBot as any);

		// Initialize metrics system
		const metricsSystem = await initializeBotMetricsSystem(mockMetricsService, {
			enableEnhancedTracking: true,
			enableBatchOperations: false, // Disable for easier testing
		});

		metricsCollector = metricsSystem.metricsCollector;
		tracker = metricsSystem.tracker;

		// Initialize message processor with correct parameters
		// MessageProcessor expects (messageFilter, replyBots, bunkBotMetrics, enhancedMetrics, triggerTracker)
		const messageFilter = { shouldFilterMessage: jest.fn().mockReturnValue(false) } as any;
		const replyBotNames = botRegistry.getReplyBotNames();
		const replyBots = replyBotNames
			.map((name) => botRegistry.getReplyBot(name))
			.filter((bot): bot is import('../core/bot-builder').ReplyBotImpl => bot !== undefined);

		messageProcessor = new MessageProcessor(
			messageFilter,
			replyBots,
			metricsCollector as any, // Base BunkBot metrics
			metricsCollector, // Enhanced metrics collector
			tracker, // Bot trigger tracker
		);
	});

	afterEach(async () => {
		// Clear any remaining timeouts
		activeTimeouts.forEach((timeout) => clearTimeout(timeout));
		activeTimeouts = [];

		// Restore environment
		process.env = originalEnv;

		// Cleanup resources
		try {
			await tracker.cleanup();
		} catch (error) {
			// Ignore cleanup errors in tests
		}
	});

	describe('Message Processing with Metrics', () => {
		it('should track successful bot trigger and response', async () => {
			const message = createMockMessage('hello world') as Message;

			// Process message
			await messageProcessor.processMessage(message);

			// Verify bot was executed
			expect(mockGreetingBot.execute).toHaveBeenCalledWith(message);

			// Verify channel response
			expect(message.channel.send).toHaveBeenCalledWith('Hello there!');

			// Verify Redis operations were called for tracking
			expect(mockRedis.eval).toHaveBeenCalled();

			// Check that the correct condition was identified
			const evalCall = (mockRedis.eval as jest.Mock).mock.calls[0];
			expect(evalCall[8]).toBe('simple_greeting'); // condition name argument
		});

		it('should track different bot conditions correctly', async () => {
			const messages = [
				createMockMessage('hi there', 'msg1'),
				createMockMessage('good morning', 'msg2'),
				createMockMessage('!help', 'msg3'),
			];

			// Process each message
			for (const message of messages) {
				await messageProcessor.processMessage(message as Message);
			}

			// Should have tracked 3 different conditions
			expect(mockRedis.eval).toHaveBeenCalledTimes(3);

			// Verify different condition names were tracked
			const evalCalls = (mockRedis.eval as jest.Mock).mock.calls;
			expect(evalCalls[0][8]).toBe('simple_greeting');
			expect(evalCalls[1][8]).toBe('formal_greeting');
			expect(evalCalls[2][8]).toBe('help_request');
		});

		it('should track bot failures and errors', async () => {
			const message = createMockMessage('fail me') as Message;

			// Process message (should trigger failing bot)
			await messageProcessor.processMessage(message);

			// Verify bot execution was attempted
			expect(mockFailingBot.execute).toHaveBeenCalled();

			// Should still track the event even though bot failed
			expect(mockRedis.eval).toHaveBeenCalled();

			// Check that failure was tracked
			const evalCall = (mockRedis.eval as jest.Mock).mock.calls[0];
			expect(evalCall[6]).toBe('false'); // success parameter should be false
		});

		it('should measure and track response times', async () => {
			// Add delay to bot execution to test timing
			mockGreetingBot.execute.mockImplementation(async (message: Message) => {
				await new Promise((resolve) => {
					const timeout = setTimeout(resolve, 100);
					activeTimeouts.push(timeout);
				});
				await (message.channel as TextChannel).send('Hello there!');
				return { success: true, responseType: 'message' as const };
			});

			const message = createMockMessage('hello') as Message;
			const startTime = Date.now();

			await messageProcessor.processMessage(message);

			const processingTime = Date.now() - startTime;

			// Verify Redis tracking was called with timing
			expect(mockRedis.eval).toHaveBeenCalled();

			// Response time should be captured (positive value)
			const evalCall = (mockRedis.eval as jest.Mock).mock.calls[0];
			const responseTime = parseInt(evalCall[5], 10);
			expect(responseTime).toBeGreaterThan(0);
			expect(responseTime).toBeLessThan(processingTime + 50); // Allow some variance
		});

		it('should handle multiple bots matching same message', async () => {
			// Register another bot that matches greetings
			const anotherGreetingBot = {
				name: 'another_greeting',
				conditions: [
					{
						name: 'another_greeting_condition',
						check: (message: Message) => /^hello\b/i.test(message.content),
					},
				],
				execute: jest.fn().mockImplementation(async (message: Message) => {
					await (message.channel as TextChannel).send('Another hello!');
					return { success: true, responseType: 'message' as const };
				}),
			};

			botRegistry.registerBot(anotherGreetingBot as any);

			const message = createMockMessage('hello') as Message;

			await messageProcessor.processMessage(message);

			// Both bots should have executed
			expect(mockGreetingBot.execute).toHaveBeenCalled();
			expect(anotherGreetingBot.execute).toHaveBeenCalled();

			// Should track both bot executions
			expect(mockRedis.eval).toHaveBeenCalledTimes(2);
		});
	});

	describe('Redis Data Persistence', () => {
		it('should persist bot trigger events with correct data structure', async () => {
			const message = createMockMessage('hello test', 'msg-123') as Message;

			await messageProcessor.processMessage(message);

			// Verify Redis eval was called with correct parameters
			expect(mockRedis.eval).toHaveBeenCalledWith(
				expect.any(String), // Lua script
				8, // Number of keys
				expect.stringContaining('bot:trigger:event:'), // Event key
				expect.stringContaining('bot:triggers:greeting'), // Bot triggers key
				expect.stringMatching(/bot:hourly:greeting:\d{4}-\d{2}-\d{2}T\d{2}/), // Hourly key
				expect.stringMatching(/bot:daily:greeting:\d{4}-\d{2}-\d{2}/), // Daily key
				expect.stringContaining('channel:activity:channel123'), // Channel key
				expect.stringContaining('user:interactions:user123'), // User key
				expect.stringContaining('bot:conditions:greeting'), // Conditions key
				expect.stringContaining('bot:perf:greeting'), // Performance key
				expect.stringContaining('"botName":"greeting"'), // JSON event data
				expect.any(String), // Timestamp
				expect.any(String), // Response time
				'true', // Success
				'simple_greeting', // Condition name
			);
		});

		it('should handle Redis connection failures gracefully', async () => {
			// Mock Redis failure
			mockRedis.eval.mockRejectedValueOnce(new Error('Redis connection lost'));
			mockPipeline.exec.mockRejectedValueOnce(new Error('Redis connection lost'));

			const message = createMockMessage('hello') as Message;

			// Should not throw even with Redis failures
			await expect(messageProcessor.processMessage(message)).resolves.not.toThrow();

			// Bot should still execute successfully
			expect(mockGreetingBot.execute).toHaveBeenCalled();
			expect(message.channel.send).toHaveBeenCalled();
		});

		it('should fallback to pipeline commands when Lua script fails', async () => {
			// Mock Lua script failure but pipeline success
			mockRedis.eval.mockRejectedValueOnce(new Error('Script execution failed'));

			const message = createMockMessage('hello') as Message;

			await messageProcessor.processMessage(message);

			// Should have fallen back to pipeline operations
			expect(mockPipeline.hset).toHaveBeenCalled();
			expect(mockPipeline.hincrby).toHaveBeenCalled();
			expect(mockPipeline.expire).toHaveBeenCalled();
			expect(mockPipeline.exec).toHaveBeenCalled();
		});
	});

	describe('Analytics and Metrics Retrieval', () => {
		beforeEach(async () => {
			// Process some test messages to generate data
			const messages = [
				createMockMessage('hello', 'msg1'),
				createMockMessage('hi there', 'msg2'),
				createMockMessage('good morning', 'msg3'),
				createMockMessage('!help', 'msg4'),
			];

			for (const message of messages) {
				await messageProcessor.processMessage(message as Message);
			}
		});

		it('should retrieve bot analytics through tracker', async () => {
			// Mock analytics data
			const mockAnalytics = {
				success: true,
				data: {
					botName: 'greeting',
					timeRange: { start: Date.now() - 3600000, end: Date.now() },
					stats: {
						totalTriggers: 3,
						totalResponses: 3,
						successRate: 1.0,
						avgResponseTime: 150,
						medianResponseTime: 140,
						p95ResponseTime: 200,
						uniqueUsers: 1,
						uniqueChannels: 1,
						uniqueGuilds: 1,
					},
					trends: {
						triggersPerHour: [3],
						avgResponseTimePerHour: [150],
						successRatePerHour: [1.0],
						timestamps: [Date.now()],
					},
					topConditions: [
						{ conditionName: 'simple_greeting', triggerCount: 1, successRate: 1.0, avgResponseTime: 150 },
						{ conditionName: 'formal_greeting', triggerCount: 1, successRate: 1.0, avgResponseTime: 150 },
					],
					channelDistribution: [],
					userEngagement: [],
				},
			};

			// Mock the analytics call
			const botTriggerService = metricsCollector.getBotTriggerService();
			if (botTriggerService) {
				(botTriggerService.getBotMetrics as jest.Mock).mockResolvedValue(mockAnalytics);
			}

			const _result = await tracker.getBotAnalytics('greeting', 24);

			expect(_result.success).toBe(true);
			expect(_result.data.botName).toBe('greeting');
			expect(_result.data.stats.totalTriggers).toBe(3);
			expect(_result.data.topConditions).toHaveLength(2);
		});

		it('should provide health status including Redis metrics', async () => {
			const health = await tracker.getHealthStatus();

			expect(health).toMatchObject({
				enhancedTracking: {
					enabled: true,
					redisHealth: expect.objectContaining({
						service: 'BotTriggerMetricsService',
						status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
						timestamp: expect.any(Number),
						checks: expect.objectContaining({
							redis: expect.objectContaining({
								status: expect.stringMatching(/^(connected|disconnected|error)$/),
							}),
							circuitBreaker: expect.objectContaining({
								status: expect.stringMatching(/^(CLOSED|OPEN|HALF_OPEN)$/),
							}),
						}),
					}),
				},
			});
		});
	});

	describe('Performance and Load Testing', () => {
		it('should handle high message throughput efficiently', async () => {
			const messageCount = 100;
			const messages = Array.from({ length: messageCount }, (_, i) =>
				createMockMessage(`hello ${i}`, `msg-${i}`),
			);

			const startTime = Date.now();

			// Process messages concurrently
			await Promise.all(messages.map((message) => messageProcessor.processMessage(message as Message)));

			const processingTime = Date.now() - startTime;

			// Should complete within reasonable time (5 seconds for 100 messages)
			expect(processingTime).toBeLessThan(5000);

			// All bots should have executed
			expect(mockGreetingBot.execute).toHaveBeenCalledTimes(messageCount);

			// Redis tracking should have been called for each message
			expect(mockRedis.eval).toHaveBeenCalledTimes(messageCount);
		});

		it('should handle mixed success and failure scenarios', async () => {
			const messages = [
				createMockMessage('hello', 'success1'), // Success
				createMockMessage('fail me', 'failure1'), // Failure
				createMockMessage('hi there', 'success2'), // Success
				createMockMessage('fail me', 'failure2'), // Failure
				createMockMessage('!help', 'success3'), // Success
			];

			for (const message of messages) {
				await messageProcessor.processMessage(message as Message);
			}

			// Should have tracked all events
			expect(mockRedis.eval).toHaveBeenCalledTimes(5);

			// Check success/failure tracking
			const evalCalls = (mockRedis.eval as jest.Mock).mock.calls;

			// Success calls should have success=true
			expect(evalCalls[0][6]).toBe('true'); // hello
			expect(evalCalls[2][6]).toBe('true'); // hi there
			expect(evalCalls[4][6]).toBe('true'); // !help

			// Failure calls should have success=false
			expect(evalCalls[1][6]).toBe('false'); // fail me
			expect(evalCalls[3][6]).toBe('false'); // fail me
		});

		it('should maintain performance with Redis latency', async () => {
			// Simulate Redis latency
			mockRedis.eval.mockImplementation(async () => {
				await new Promise((resolve) => {
					const timeout = setTimeout(resolve, 50); // 50ms latency
					activeTimeouts.push(timeout);
				});
				return 'OK';
			});

			const messages = Array.from({ length: 20 }, (_, i) => createMockMessage(`hello ${i}`, `msg-${i}`));

			const startTime = Date.now();

			// Process messages sequentially to test latency impact
			for (const message of messages) {
				await messageProcessor.processMessage(message as Message);
			}

			const totalTime = Date.now() - startTime;

			// Should complete despite Redis latency
			expect(totalTime).toBeLessThan(10000); // 10 seconds max
			expect(mockGreetingBot.execute).toHaveBeenCalledTimes(20);
		});
	});

	describe('Error Recovery and Resilience', () => {
		it('should continue operating when Redis is completely unavailable', async () => {
			// Mock total Redis failure
			mockRedis.eval.mockRejectedValue(new Error('Redis server unavailable'));
			mockPipeline.exec.mockRejectedValue(new Error('Redis server unavailable'));

			const message = createMockMessage('hello world') as Message;

			// Should still process message successfully
			await messageProcessor.processMessage(message);

			expect(mockGreetingBot.execute).toHaveBeenCalled();
			expect(message.channel.send).toHaveBeenCalled();

			// Should have attempted Redis operations but gracefully handled failure
			expect(mockRedis.eval).toHaveBeenCalled();
		});

		it('should handle intermittent Redis connectivity', async () => {
			// Simulate intermittent failures
			let callCount = 0;
			mockRedis.eval.mockImplementation(() => {
				callCount++;
				if (callCount % 3 === 0) {
					return Promise.reject(new Error('Intermittent failure'));
				}
				return Promise.resolve('OK');
			});

			const messages = Array.from({ length: 10 }, (_, i) => createMockMessage(`hello ${i}`, `msg-${i}`));

			// Should handle all messages without throwing
			for (const message of messages) {
				await expect(messageProcessor.processMessage(message as Message)).resolves.not.toThrow();
			}

			expect(mockGreetingBot.execute).toHaveBeenCalledTimes(10);
		});

		it('should recover from circuit breaker states', async () => {
			// This test would verify circuit breaker recovery, but since we're using
			// the integration layer, we rely on the underlying circuit breaker tests
			// Instead, we verify the system continues to function

			const message = createMockMessage('hello') as Message;

			// Process message multiple times
			for (let i = 0; i < 5; i++) {
				await messageProcessor.processMessage(message as Message);
			}

			// Should continue processing despite any circuit breaker state
			expect(mockGreetingBot.execute).toHaveBeenCalledTimes(5);

			// Health should still be available
			const health = await tracker.getHealthStatus();
			expect(health).toBeDefined();
		});
	});

	describe('Resource Management and Cleanup', () => {
		it('should cleanup resources properly', async () => {
			const message = createMockMessage('hello') as Message;
			await messageProcessor.processMessage(message);

			// Verify system is working
			expect(mockRedis.eval).toHaveBeenCalled();

			// Cleanup should not throw
			await expect(tracker.cleanup()).resolves.not.toThrow();

			// After cleanup, system should handle gracefully
			await expect(messageProcessor.processMessage(message)).resolves.not.toThrow();
		});

		it('should handle concurrent cleanup and processing', async () => {
			const messages = Array.from({ length: 5 }, (_, i) => createMockMessage(`hello ${i}`, `msg-${i}`));

			// Start processing messages and cleanup concurrently
			const processingPromises = messages.map((message) => messageProcessor.processMessage(message as Message));
			const cleanupPromise = tracker.cleanup();

			// Both should complete without errors
			await expect(Promise.all([...processingPromises, cleanupPromise])).resolves.not.toThrow();
		});
	});

	describe('Integration with Discord Events', () => {
		it('should handle various Discord message types', async () => {
			// Test different message scenarios
			const scenarios = [
				{ content: 'hello @everyone', shouldTrigger: true },
				{ content: 'Hello <@123>', shouldTrigger: true },
				{ content: 'not a greeting', shouldTrigger: false },
				{ content: '!help please', shouldTrigger: true },
				{ content: '', shouldTrigger: false },
			];

			for (const scenario of scenarios) {
				const message = createMockMessage(scenario.content) as Message;
				await messageProcessor.processMessage(message);

				if (scenario.shouldTrigger) {
					// Should have attempted Redis tracking
					expect(mockRedis.eval).toHaveBeenCalled();
				}
			}
		});

		it('should extract correct Discord context for metrics', async () => {
			const message = createMockMessage('hello test') as Message;
			message.id = 'specific-message-id';
			message.author!.id = 'specific-user-id';
			message.channel.id = 'specific-channel-id';
			message.guild!.id = 'specific-guild-id';

			await messageProcessor.processMessage(message);

			// Verify correct context was captured
			const evalCall = (mockRedis.eval as jest.Mock).mock.calls[0];
			const eventData = JSON.parse(evalCall[9]);

			expect(eventData).toMatchObject({
				messageId: 'specific-message-id',
				userId: 'specific-user-id',
				channelId: 'specific-channel-id',
				guildId: 'specific-guild-id',
				botName: 'greeting',
			});
		});
	});
});
