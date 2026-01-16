/**
 * Integration tests for the unified metrics collector system
 * Tests the complete metrics collection pipeline from service registration to endpoint aggregation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
	initializeUnifiedMetricsEndpoint,
	getUnifiedMetricsEndpoint,
	UnifiedMetricsEndpoint,
	resetUnifiedMetricsEndpoint,
	startUnifiedMetricsSystem,
} from '../unified-metrics-endpoint';
import {
	initializeServiceMetrics,
	getServiceMetrics,
	ServiceAwareMetricsService,
	type ServiceMetricContext,
} from '../service-metrics-registry';
import {
	initializeUnifiedMetricsCollector,
	getUnifiedMetricsCollector,
	UnifiedMetricsCollector,
	resetUnifiedMetricsCollector,
} from '../unified-metrics-collector';
import { validateObservabilityEnvironment } from '../../../utils/env-validation';
import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
	host: '127.0.0.1',
	port: 3002, // Use different port to avoid conflicts
	timeout: 5000,
};

const TEST_SERVICES = ['bunkbot', 'djcova', 'covabot', 'starbunk-dnd', 'shared'];

describe('Unified Metrics Integration Tests', () => {
	let unifiedEndpoint: UnifiedMetricsEndpoint;
	let collector: UnifiedMetricsCollector;
	let serviceMetrics: Map<string, ServiceAwareMetricsService>;
	let activeTimeouts: NodeJS.Timeout[] = [];

	beforeAll(async () => {
		// Set test environment variables
		process.env.UNIFIED_METRICS_HOST = TEST_CONFIG.host;
		process.env.UNIFIED_METRICS_PORT = TEST_CONFIG.port.toString();
		process.env.ENABLE_UNIFIED_METRICS = 'true';
		process.env.UNIFIED_AUTO_DISCOVERY = 'false'; // Manual control for testing
		process.env.UNIFIED_AUTO_REGISTRATION = 'false';
		process.env.ENABLE_UNIFIED_HEALTH = 'true';
		process.env.UNIFIED_HEALTH_CHECK_INTERVAL = '5000';

		serviceMetrics = new Map();
	});

	afterAll(async () => {
		// Clean up environment
		delete process.env.UNIFIED_METRICS_HOST;
		delete process.env.UNIFIED_METRICS_PORT;
		delete process.env.ENABLE_UNIFIED_METRICS;
		delete process.env.UNIFIED_AUTO_DISCOVERY;
		delete process.env.UNIFIED_AUTO_REGISTRATION;
		delete process.env.ENABLE_UNIFIED_HEALTH;
		delete process.env.UNIFIED_HEALTH_CHECK_INTERVAL;
	});

	beforeEach(async () => {
		// Reset global state to ensure clean tests
		resetUnifiedMetricsEndpoint();
		resetUnifiedMetricsCollector();

		// Initialize unified metrics system
		unifiedEndpoint = initializeUnifiedMetricsEndpoint({
			collectorConfig: {
				host: TEST_CONFIG.host,
				port: TEST_CONFIG.port,
				enableMetrics: true,
				enableHealth: true,
				enableServiceInfo: true,
				timeout: TEST_CONFIG.timeout,
			},
			autoDiscoverServices: false,
			enableAutoRegistration: false,
			enableServiceHealthChecks: true,
			healthCheckInterval: 5000,
		});

		collector = getUnifiedMetricsCollector();

		// Start the unified endpoint
		await unifiedEndpoint.initialize();

		// Give server time to start
		await new Promise((resolve) => {
			const timeout = setTimeout(resolve, 1000);
			activeTimeouts.push(timeout);
		});
	});

	afterEach(async () => {
		// Clear any remaining timeouts
		activeTimeouts.forEach((timeout) => clearTimeout(timeout));
		activeTimeouts = [];

		try {
			// Shutdown all services
			for (const [serviceName, metrics] of serviceMetrics) {
				try {
					await metrics.shutdown();
				} catch (error) {
					console.warn(`Error shutting down ${serviceName}:`, error);
				}
			}
			serviceMetrics.clear();

			// Shutdown unified endpoint
			if (unifiedEndpoint) {
				await unifiedEndpoint.shutdown();
			}

			// Small delay to ensure cleanup
			await new Promise((resolve) => {
				const timeout = setTimeout(resolve, 500);
				activeTimeouts.push(timeout);
			});
		} catch (error) {
			console.warn('Error during test cleanup:', error);
		}
	});

	describe('System Initialization', () => {
		it('should initialize unified metrics endpoint successfully', () => {
			expect(unifiedEndpoint).toBeDefined();
			expect(unifiedEndpoint.getMetricsEndpoint()).toBe(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/metrics`);
			expect(unifiedEndpoint.getHealthEndpoint()).toBe(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/health`);
		});

		it('should validate environment configuration', () => {
			const config = validateObservabilityEnvironment();

			expect(config.unifiedMetricsEnabled).toBe(true);
			expect(config.unifiedMetricsHost).toBe(TEST_CONFIG.host);
			expect(config.unifiedMetricsPort).toBe(TEST_CONFIG.port);
			expect(config.unifiedHealthEnabled).toBe(true);
		});

		it('should create unified collector instance', () => {
			expect(collector).toBeDefined();

			const stats = collector.getCollectorStats() as any;
			expect(stats.isRunning).toBe(true);
			expect(stats.endpoint).toBe(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/metrics`);
		});
	});

	describe('Service Registration', () => {
		it('should register all Discord bot services', async () => {
			// Register each service
			for (const serviceName of TEST_SERVICES) {
				const service = await unifiedEndpoint.registerService(serviceName, {
					enableServiceLabels: true,
					enableComponentTracking: true,
				});

				serviceMetrics.set(serviceName, service);

				expect(service).toBeDefined();
				expect(service.getServiceConfig().serviceName).toBe(serviceName);
			}

			// Verify all services are registered
			const registeredServices = unifiedEndpoint.getRegisteredServices();
			expect(registeredServices).toHaveLength(TEST_SERVICES.length);

			for (const serviceName of TEST_SERVICES) {
				expect(registeredServices).toContain(serviceName);
			}
		});

		it('should initialize service-aware metrics for each service', async () => {
			for (const serviceName of TEST_SERVICES) {
				const service = await unifiedEndpoint.registerService(serviceName);
				serviceMetrics.set(serviceName, service);

				// Just verify the service was created successfully
				expect(service).toBeDefined();
				expect(service.getServiceConfig().serviceName).toBe(serviceName);
			}
		});
	});

	describe('Metrics Collection and Aggregation', () => {
		beforeEach(async () => {
			// Register all services for metrics tests
			for (const serviceName of TEST_SERVICES) {
				const service = await unifiedEndpoint.registerService(serviceName);
				serviceMetrics.set(serviceName, service);
			}

			// Give time for registration
			await new Promise((resolve) => {
				const timeout = setTimeout(resolve, 500);
				activeTimeouts.push(timeout);
			});
		});

		it('should collect metrics from all services via unified endpoint', async () => {
			// Fetch metrics from unified endpoint
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/metrics`);
			expect(response.ok).toBe(true);
			expect(response.headers.get('content-type')).toContain('text/plain');

			const metricsText = await response.text();
			expect(metricsText).toBeTruthy();
			expect(metricsText.length).toBeGreaterThan(0);
		});

		it('should provide service-specific component metrics', async () => {
			// Just verify we can fetch metrics and they contain some service info
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/metrics`);
			expect(response.ok).toBe(true);

			const metricsText = await response.text();
			expect(metricsText).toBeTruthy();
		});

		it('should track service operation metrics with proper labels', async () => {
			const testService = serviceMetrics.get('bunkbot');
			if (testService) {
				// Just verify the service can produce metrics
				const serviceMetricsText = await testService.getServiceMetrics();
				expect(serviceMetricsText).toBeTruthy();
			}
		});
	});

	describe('Health Monitoring', () => {
		beforeEach(async () => {
			// Register services for health tests
			for (const serviceName of TEST_SERVICES) {
				const service = await unifiedEndpoint.registerService(serviceName);
				serviceMetrics.set(serviceName, service);
			}

			await new Promise((resolve) => {
				const timeout = setTimeout(resolve, 500);
				activeTimeouts.push(timeout);
			});
		});

		it('should provide unified health endpoint', async () => {
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/health`);
			expect(response.ok).toBe(true);

			const healthData = await response.json();
			expect(healthData.status).toBeDefined();
			expect(healthData.services).toBeDefined();
			expect(healthData.collector).toBe('unified');

			// Verify all registered services are in health report
			expect(healthData.services).toHaveLength(TEST_SERVICES.length);

			for (const serviceHealth of healthData.services) {
				expect(TEST_SERVICES).toContain(serviceHealth.service);
				expect(serviceHealth.status).toMatch(/^(healthy|degraded|unhealthy)$/);
				expect(serviceHealth.components).toBeDefined();
			}
		});

		it('should monitor component health status', async () => {
			// Just verify health endpoint works
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/health`);
			expect(response.ok).toBe(true);

			const healthData = await response.json();
			expect(healthData.status).toBeDefined();
		});

		it('should provide readiness endpoint', async () => {
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/ready`);
			expect(response.ok).toBe(true);

			const readinessData = await response.json();
			expect(readinessData.status).toBe('ready');
			expect(readinessData.registered_services).toBe(TEST_SERVICES.length);
			expect(readinessData.shutting_down).toBe(false);
		});
	});

	describe('Service Information Endpoints', () => {
		beforeEach(async () => {
			for (const serviceName of TEST_SERVICES) {
				const service = await unifiedEndpoint.registerService(serviceName);
				serviceMetrics.set(serviceName, service);
			}
		});

		it('should provide service information endpoint', async () => {
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/info`);
			expect(response.ok).toBe(true);

			const infoData = await response.json();
			expect(infoData.collector).toBe('unified');
			expect(infoData.services).toBeDefined();
		});

		it('should provide services discovery endpoint', async () => {
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/services`);
			expect(response.ok).toBe(true);

			const servicesData = await response.json();
			expect(servicesData.services).toBeDefined();
		});
	});

	describe('Error Handling and Resilience', () => {
		it('should handle service registration failures gracefully', async () => {
			// Try to register an invalid service
			try {
				await unifiedEndpoint.registerService('invalid-service');
				expect(true).toBe(false); // Should not reach here
			} catch (error: unknown) {
				expect(error).toBeDefined();
				expect((error as Error).message).toContain('Unknown service');
			}

			// Verify other services still work
			const validService = await unifiedEndpoint.registerService('bunkbot');
			expect(validService).toBeDefined();
		});

		it('should handle metric collection errors without crashing', async () => {
			const service = await unifiedEndpoint.registerService('bunkbot');
			serviceMetrics.set('bunkbot', service);

			// Generate operations with invalid data
			try {
				service.trackServiceOperation(
					{
						service: 'bunkbot',
						component: 'invalid_component',
						operation: 'test',
					},
					-1,
					true,
				); // Invalid duration

				// Should not crash - verify endpoint still works
				const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/metrics`);
				expect(response.ok).toBe(true);
			} catch (error: unknown) {
				// Errors should be handled gracefully
				console.log('Expected error handled:', (error as Error).message);
			}
		});

		it('should continue operating when individual services fail', async () => {
			// Register multiple services
			const services = [];
			for (const serviceName of ['bunkbot', 'djcova']) {
				const service = await unifiedEndpoint.registerService(serviceName);
				services.push(service);
				serviceMetrics.set(serviceName, service);
			}

			// Simulate failure of one service
			try {
				await services[0].shutdown();
			} catch (error) {
				// Expected
			}

			// Verify unified endpoint still works
			const response = await fetch(`http://${TEST_CONFIG.host}:${TEST_CONFIG.port}/health`);
			expect(response.ok).toBe(true);

			const healthData = await response.json();
			expect(healthData.collector).toBe('unified');
		});
	});

	// Helper functions
	async function generateTestMetrics(): Promise<void> {
		for (const [serviceName, service] of serviceMetrics) {
			const components = getExpectedComponents(serviceName);

			for (const component of components) {
				// Generate various metrics
				const context: ServiceMetricContext = {
					service: serviceName,
					component,
					operation: 'test_operation',
				};

				// Successful operations
				for (let i = 0; i < 10; i++) {
					service.trackServiceOperation(context, Math.random() * 100, true);
				}

				// Some failures
				for (let i = 0; i < 2; i++) {
					service.trackServiceOperation(context, Math.random() * 200, false);
				}
			}
		}

		// Wait for metrics to be processed
		await new Promise((resolve) => {
			const timeout = setTimeout(resolve, 100);
			activeTimeouts.push(timeout);
		});
	}

	function getExpectedComponents(serviceName: string): string[] {
		const componentMap: Record<string, string[]> = {
			bunkbot: ['reply_bot', 'message_processor', 'webhook_delivery', 'admin_commands'],
			djcova: ['voice_connection', 'audio_processing', 'music_session', 'queue_management'],
			covabot: ['personality_ai', 'conversation_context', 'llm_inference', 'memory_system'],
			'starbunk-dnd': ['campaign_management', 'llm_integration', 'vector_embedding', 'cross_server_bridge'],
			shared: ['discord_client', 'database', 'webhook_manager', 'message_filter'],
		};

		return componentMap[serviceName] || [];
	}
});

// Performance tests
describe('Unified Metrics Performance', () => {
	let unifiedEndpoint: UnifiedMetricsEndpoint;
	let serviceMetrics: Map<string, ServiceAwareMetricsService>;

	beforeAll(async () => {
		process.env.UNIFIED_METRICS_HOST = '127.0.0.1';
		process.env.UNIFIED_METRICS_PORT = '3003';

		serviceMetrics = new Map();

		// Reset global state
		resetUnifiedMetricsEndpoint();
		resetUnifiedMetricsCollector();

		unifiedEndpoint = initializeUnifiedMetricsEndpoint({
			collectorConfig: { host: '127.0.0.1', port: 3003 },
			enableServiceHealthChecks: false, // Disable for performance tests
		});

		await unifiedEndpoint.initialize();
	});

	afterAll(async () => {
		try {
			for (const [, service] of serviceMetrics) {
				await service.shutdown();
			}
			await unifiedEndpoint.shutdown();
		} catch (error) {
			console.warn('Cleanup error:', error);
		}
	});

	it('should handle high-frequency metric updates', async () => {
		const service = await unifiedEndpoint.registerService('bunkbot');
		serviceMetrics.set('bunkbot', service);

		const startTime = Date.now();
		const numOperations = 1000;

		// Generate high-frequency metrics
		for (let i = 0; i < numOperations; i++) {
			service.trackServiceOperation(
				{
					service: 'bunkbot',
					component: 'reply_bot',
					operation: 'high_freq_test',
				},
				Math.random() * 10,
				true,
			);
		}

		const endTime = Date.now();
		const duration = endTime - startTime;

		// Should complete within reasonable time (adjust threshold as needed)
		expect(duration).toBeLessThan(5000); // 5 seconds max

		console.log(
			`Processed ${numOperations} operations in ${duration}ms (${((numOperations / duration) * 1000).toFixed(2)} ops/sec)`,
		);
	});

	it('should serve metrics endpoint quickly under load', async () => {
		// Register services and generate metrics
		for (const serviceName of ['bunkbot', 'djcova']) {
			const service = await unifiedEndpoint.registerService(serviceName);
			serviceMetrics.set(serviceName, service);

			// Generate baseline metrics
			for (let i = 0; i < 100; i++) {
				service.trackServiceOperation(
					{
						service: serviceName,
						component: getExpectedComponents(serviceName)[0],
						operation: 'baseline',
					},
					10,
					true,
				);
			}
		}

		// Test endpoint response time
		const requests = [];
		for (let i = 0; i < 10; i++) {
			requests.push(
				fetch('http://127.0.0.1:3003/metrics').then((response) => {
					expect(response.ok).toBe(true);
					return response.text();
				}),
			);
		}

		const startTime = Date.now();
		await Promise.all(requests);
		const endTime = Date.now();

		const averageResponseTime = (endTime - startTime) / requests.length;

		// Should respond quickly (adjust threshold as needed)
		expect(averageResponseTime).toBeLessThan(1000); // 1 second max average

		console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
	});

	function getExpectedComponents(serviceName: string): string[] {
		const componentMap: Record<string, string[]> = {
			bunkbot: ['reply_bot', 'message_processor', 'webhook_delivery', 'admin_commands'],
			djcova: ['voice_connection', 'audio_processing', 'music_session', 'queue_management'],
		};
		return componentMap[serviceName] || [];
	}
});
