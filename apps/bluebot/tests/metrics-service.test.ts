import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsService, createMetricsService } from '../src/observability/metrics-service';

// Mock prom-client to avoid global registry conflicts in unit tests
vi.mock('prom-client', () => {
	class MockCounter {
		inc = vi.fn();
	}

	class MockHistogram {
		observe = vi.fn();
	}

	class MockGauge {
		set = vi.fn();
		inc = vi.fn();
	}

	class MockRegistry {
		metrics = vi.fn().mockResolvedValue('# HELP bluebot_messages_processed_total\n# TYPE bluebot_messages_processed_total counter\n');
		clear = vi.fn();
	}

	return {
		Counter: MockCounter,
		Histogram: MockHistogram,
		Gauge: MockGauge,
		Registry: MockRegistry,
		collectDefaultMetrics: vi.fn(),
	};
});

describe('MetricsService', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Save original env
		originalEnv = { ...process.env };
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore original env
		process.env = originalEnv;
	});

	describe('Constructor', () => {
		it('should initialize with metrics enabled by default', () => {
			delete process.env.ENABLE_METRICS;
			const service = new MetricsService();

			expect(service).toBeDefined();
			expect(service.getRegistry()).toBeDefined();
		});

		it('should respect ENABLE_METRICS=false environment variable', () => {
			process.env.ENABLE_METRICS = 'false';
			const service = new MetricsService();

			expect(service).toBeDefined();
		});

		it('should enable metrics when ENABLE_METRICS is not false', () => {
			process.env.ENABLE_METRICS = 'true';
			const service = new MetricsService();

			expect(service).toBeDefined();
		});
	});

	describe('Tracking methods when enabled', () => {
		let service: MetricsService;

		beforeEach(() => {
			process.env.ENABLE_METRICS = 'true';
			service = createMetricsService();
		});

		it('should track message processed', () => {
			expect(() => {
				service.trackMessageProcessed('guild-123', 'channel-456');
			}).not.toThrow();
		});

		it('should track bot trigger', () => {
			expect(() => {
				service.trackBotTrigger('bluebot', 'blue-mention', 'guild-123', 'channel-456');
			}).not.toThrow();
		});

		it('should track bot response with success status', () => {
			expect(() => {
				service.trackBotResponse('bluebot', 'guild-123', 'channel-456', 'success');
			}).not.toThrow();
		});

		it('should track bot response with error status', () => {
			expect(() => {
				service.trackBotResponse('bluebot', 'guild-123', 'channel-456', 'error');
			}).not.toThrow();
		});

		it('should track bot response duration', () => {
			expect(() => {
				service.trackBotResponseDuration('bluebot', 'guild-123', 150);
			}).not.toThrow();
		});

		it('should track bot error', () => {
			expect(() => {
				service.trackBotError('bluebot', 'llm_error', 'guild-123');
			}).not.toThrow();
		});

		it('should set active bots count', () => {
			expect(() => {
				service.setActiveBots(5);
			}).not.toThrow();
		});

		it('should track unique user', () => {
			expect(() => {
				service.trackUniqueUser('bluebot', 'guild-123', 'user-789');
			}).not.toThrow();
		});
	});

	describe('Tracking methods when disabled', () => {
		let service: MetricsService;

		beforeEach(() => {
			process.env.ENABLE_METRICS = 'false';
			service = createMetricsService();
		});

		it('should not throw when tracking message processed', () => {
			expect(() => {
				service.trackMessageProcessed('guild-123', 'channel-456');
			}).not.toThrow();
		});

		it('should not throw when tracking bot trigger', () => {
			expect(() => {
				service.trackBotTrigger('bluebot', 'blue-mention', 'guild-123', 'channel-456');
			}).not.toThrow();
		});

		it('should not throw when tracking bot response', () => {
			expect(() => {
				service.trackBotResponse('bluebot', 'guild-123', 'channel-456', 'success');
			}).not.toThrow();
		});

		it('should not throw when setting active bots', () => {
			expect(() => {
				service.setActiveBots(3);
			}).not.toThrow();
		});
	});

	describe('getMetrics', () => {
		let service: MetricsService;

		beforeEach(() => {
			process.env.ENABLE_METRICS = 'true';
			service = createMetricsService();
		});

		it('should return metrics as a string', async () => {
			const metrics = await service.getMetrics();

			expect(typeof metrics).toBe('string');
		});

		it('should return Prometheus format metrics', async () => {
			const metrics = await service.getMetrics();

			// Should contain Prometheus format markers
			expect(metrics).toContain('# HELP');
		});
	});

	describe('getRegistry', () => {
		let service: MetricsService;

		beforeEach(() => {
			process.env.ENABLE_METRICS = 'true';
			service = createMetricsService();
		});

		it('should return the registry instance', () => {
			const registry = service.getRegistry();

			expect(registry).toBeDefined();
		});
	});

	describe('Factory pattern', () => {
		it('should create independent instances', () => {
			const instance1 = createMetricsService();
			const instance2 = createMetricsService();

			expect(instance1).not.toBe(instance2);
		});
	});
});

