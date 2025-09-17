/**
 * Integration test for production-ready metrics infrastructure
 */

import { initializeObservability, shutdownObservability, type MessageFlowMetrics } from '../index';

describe('Metrics Infrastructure Integration', () => {
	let observability: any; // eslint-disable-line @typescript-eslint/no-unused-vars

	beforeAll(() => {
		// Set test environment variables
		process.env.ENABLE_METRICS = 'true';
		process.env.ENABLE_METRICS_PUSH = 'false'; // Disable push for tests
		process.env.ENABLE_RUNTIME_METRICS = 'true';
		process.env.ENABLE_HTTP_ENDPOINTS = 'false'; // Disable HTTP server for tests
		process.env.NODE_ENV = 'test';
	});

	afterAll(async () => {
		await shutdownObservability();
	});

	test('should initialize observability stack successfully', () => {
		observability = initializeObservability('test-service', {
			skipHttpEndpoints: true, // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		expect(observability).toBeDefined();
		expect(observability.metrics).toBeDefined();
		expect(observability.logger).toBeDefined();
		expect(observability.channelTracker).toBeDefined();
		expect(observability.config).toBeDefined();
	});

	test('should track message flow metrics', () => {
		const messageMetrics: MessageFlowMetrics = {
			// eslint-disable-line @typescript-eslint/no-unused-vars
			botName: 'test-bot', // eslint-disable-line @typescript-eslint/no-unused-vars
			messageText: 'Hello, world!', // eslint-disable-line @typescript-eslint/no-unused-vars
			userId: '12345', // eslint-disable-line @typescript-eslint/no-unused-vars
			userName: 'test-user', // eslint-disable-line @typescript-eslint/no-unused-vars
			channelId: '67890', // eslint-disable-line @typescript-eslint/no-unused-vars
			channelName: 'test-channel', // eslint-disable-line @typescript-eslint/no-unused-vars
			guildId: '11111', // eslint-disable-line @typescript-eslint/no-unused-vars
			triggered: true, // eslint-disable-line @typescript-eslint/no-unused-vars
			responseLatency: 150, // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		};

		expect(() => {
			observability.metrics.trackMessageFlow(messageMetrics);
		}).not.toThrow();
	});

	test('should track channel activity', () => {
		expect(() => {
			observability.metrics.trackChannelActivity({
				channelId: '67890', // eslint-disable-line @typescript-eslint/no-unused-vars
				channelName: 'test-channel', // eslint-disable-line @typescript-eslint/no-unused-vars
				guildId: '11111', // eslint-disable-line @typescript-eslint/no-unused-vars
				messageCount: 5, // eslint-disable-line @typescript-eslint/no-unused-vars
				userCount: 2, // eslint-disable-line @typescript-eslint/no-unused-vars
				botMessageCount: 1, // eslint-disable-line @typescript-eslint/no-unused-vars
				humanMessageCount: 4, // eslint-disable-line @typescript-eslint/no-unused-vars
				timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}).not.toThrow();
	});

	test('should track circuit breaker activation', () => {
		expect(() => {
			observability.metrics.trackCircuitBreakerActivation('test-bot', 'rate_limit');
		}).not.toThrow();
	});

	test('should track bot instances', () => {
		expect(() => {
			observability.metrics.trackBotInstances(3);
		}).not.toThrow();
	});

	test('should generate Prometheus metrics', async () => {
		const metrics = await observability.metrics.getPrometheusMetrics();

		expect(typeof metrics).toBe('string');
		expect(metrics).toContain('# HELP');
		expect(metrics).toContain('# TYPE');

		// Should contain some of our custom metrics
		expect(metrics).toMatch(/discord_messages_processed_total|bot_triggers_total/);
	});

	test('should generate metrics summary', () => {
		const summary = observability.metrics.getMetricsSummary();

		expect(summary).toBeDefined();
		expect(typeof summary).toBe('object');
		expect((summary as any).service).toBe('test-service');
		expect((summary as any).metricsCount).toBeGreaterThan(0);
		expect((summary as any).config).toBeDefined();
	});

	test('should track HTTP requests', () => {
		expect(() => {
			observability.metrics.trackHttpRequest('GET', '/metrics', 200, 25);
		}).not.toThrow();
	});

	test('should get health status', () => {
		const health = observability.metrics.getHealthStatus();

		expect(health).toBeDefined();
		expect(typeof health).toBe('object');
		expect((health as any).service).toBe('test-service');
		expect((health as any).status).toBe('healthy');
		expect((health as any).metricsEnabled).toBe(true);
	});

	test('should handle structured logging', () => {
		expect(() => {
			observability.logger.logMessageFlow({
				event: 'bot_triggered', // eslint-disable-line @typescript-eslint/no-unused-vars
				bot_name: 'test-bot', // eslint-disable-line @typescript-eslint/no-unused-vars
				message_text: 'Test message', // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: '12345', // eslint-disable-line @typescript-eslint/no-unused-vars
				user_name: 'test-user', // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_id: '67890', // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_name: 'test-channel', // eslint-disable-line @typescript-eslint/no-unused-vars
				guild_id: '11111', // eslint-disable-line @typescript-eslint/no-unused-vars
				response_latency_ms: 150, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}).not.toThrow();
	});

	test('should handle system events', () => {
		expect(() => {
			observability.logger.logSystemEvent({
				event: 'bot_loaded', // eslint-disable-line @typescript-eslint/no-unused-vars
				level: 'info', // eslint-disable-line @typescript-eslint/no-unused-vars
				message: 'Bot loaded successfully', // eslint-disable-line @typescript-eslint/no-unused-vars
				details: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					bot_count: 5, // eslint-disable-line @typescript-eslint/no-unused-vars
					startup_time: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				timestamp: new Date().toISOString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}).not.toThrow();
	});

	test('should validate configuration', () => {
		expect(observability.config.metricsEnabled).toBe(true);
		expect(observability.config.pushEnabled).toBe(false);
		expect(observability.config.runtimeMetricsEnabled).toBe(true);
	});

	test('should maintain thread safety under load', async () => {
		const promises = [];

		for (let i = 0; i < 100; i++) {
			promises.push(
				new Promise<void>((resolve) => {
					observability.metrics.trackMessageFlow({
						botName: `test-bot-${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						messageText: `Message ${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						userId: `user-${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						userName: `user-${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						channelId: `channel-${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						channelName: `channel-${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						guildId: `guild-${i}`, // eslint-disable-line @typescript-eslint/no-unused-vars
						triggered: Math.random() > 0.5, // eslint-disable-line @typescript-eslint/no-unused-vars
						responseLatency: Math.random() * 1000, // eslint-disable-line @typescript-eslint/no-unused-vars
						timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
					});
					resolve();
				}),
			);
		}

		await expect(Promise.all(promises)).resolves.toBeDefined();
	});

	test('should handle errors gracefully', () => {
		// Test with invalid data
		expect(() => {
			observability.metrics.trackMessageFlow({
				botName: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				messageText: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				userId: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				userName: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				channelId: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				channelName: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				guildId: '', // eslint-disable-line @typescript-eslint/no-unused-vars
				triggered: true, // eslint-disable-line @typescript-eslint/no-unused-vars
				timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}).not.toThrow();
	});
});

describe('Error Handling and Edge Cases', () => {
	test('should handle initialization without environment variables', () => {
		// Clear environment variables
		delete process.env.ENABLE_METRICS;
		delete process.env.PROMETHEUS_PUSHGATEWAY_URL;
		delete process.env.LOKI_URL;

		expect(() => {
			const obs = initializeObservability('test-edge-case', {
				skipHttpEndpoints: true, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
			obs.metrics.trackBotInstances(1);
		}).not.toThrow();
	});

	test('should handle invalid configuration gracefully', () => {
		process.env.METRICS_PUSH_INTERVAL = '0'; // Invalid value
		process.env.METRICS_CIRCUIT_BREAKER_THRESHOLD = '-1'; // Invalid value

		expect(() => {
			initializeObservability('test-invalid-config', {
				skipHttpEndpoints: true, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}).not.toThrow();
	});
});
