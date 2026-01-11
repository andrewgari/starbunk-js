import { logger } from '../logger';
import { ensureError } from '../../utils/error-utils';
import {
	UnifiedMetricsCollector,
	initializeUnifiedMetricsCollector,
	type UnifiedMetricsConfig,
} from './unified-metrics-collector';
import {
	ServiceAwareMetricsService,
	initializeServiceMetrics,
	type ServiceMetricsConfiguration,
} from './service-metrics-registry';
import { validateObservabilityEnvironment, type ObservabilityConfig } from '../../utils/env-validation';
import { EventEmitter } from 'events';

// Configuration for the unified metrics endpoint
interface UnifiedEndpointConfig {
	// Unified collector settings
	collectorConfig?: Partial<UnifiedMetricsConfig>;

	// Service registration settings
	autoDiscoverServices?: boolean;
	enableAutoRegistration?: boolean;
	registrationTimeout?: number;

	// Health monitoring settings
	enableServiceHealthChecks?: boolean;
	healthCheckInterval?: number;
	healthCheckTimeout?: number;

	// Production settings
	enableCircuitBreaker?: boolean;
	enableGracefulShutdown?: boolean;
	shutdownTimeout?: number;

	// Development settings
	enableMetricsLogging?: boolean;
	enablePerformanceMonitoring?: boolean;
}

// Service discovery and registration information
interface ServiceRegistrationInfo {
	service: string;
	instance: ServiceAwareMetricsService;
	registeredAt: number;
	lastActivity: number;
	healthStatus: 'healthy' | 'degraded' | 'unhealthy';
	componentCount: number;
	metricsCount: number;
}

// Health check result for services
interface ServiceHealthResult {
	service: string;
	status: 'healthy' | 'degraded' | 'unhealthy';
	components: Array<{
		component: string;
		status: 'pass' | 'warn' | 'fail';
		lastActivity: number;
		operationCount: number;
		errorRate: number;
	}>;
	registrationInfo: {
		registeredAt: number;
		lastActivity: number;
		metricsCount: number;
	};
	timestamp: number;
}

/**
 * Unified Metrics Endpoint orchestrates the entire metrics collection system
 * Provides the single endpoint at http://192.168.50.3:3001/metrics
 * Coordinates service registration, health monitoring, and metric aggregation
 */
export class UnifiedMetricsEndpoint extends EventEmitter {
	private readonly config: Required<UnifiedEndpointConfig>;
	private readonly envConfig: ObservabilityConfig;
	private collector: UnifiedMetricsCollector;
	private readonly serviceRegistrations = new Map<string, ServiceRegistrationInfo>();
	private healthCheckInterval?: NodeJS.Timeout;
	private isInitialized = false;
	private isShuttingDown = false;
	private readonly startTime = Date.now();

	// Known services in the monorepo
	private readonly knownServices = ['bunkbot', 'djcova', 'covabot', 'starbunk-dnd', 'shared'];

	constructor(userConfig?: Partial<UnifiedEndpointConfig>) {
		super();

		// Validate environment configuration
		this.envConfig = validateObservabilityEnvironment();

		// Merge configuration with environment defaults
		const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
		this.config = {
			collectorConfig: {
				// In tests, bind to an ephemeral port and loopback to avoid conflicts across workers
				port: isTestEnv ? 0 : parseInt(process.env.UNIFIED_METRICS_PORT || '3001'),
				host: isTestEnv ? '127.0.0.1' : process.env.UNIFIED_METRICS_HOST || '192.168.50.3',
				enableMetrics: this.envConfig.metricsEnabled,
				enableHealth: true,
				enableServiceInfo: true,
				corsEnabled: process.env.ENABLE_UNIFIED_CORS === 'true',
				authToken: process.env.UNIFIED_METRICS_AUTH_TOKEN,
				timeout: 30000,
				maxConcurrentRequests: 100,
				circuitBreakerThreshold: 5,
				healthCheckTimeout: 5000,
				...userConfig?.collectorConfig,
			},
			autoDiscoverServices: userConfig?.autoDiscoverServices !== false,
			enableAutoRegistration: userConfig?.enableAutoRegistration !== false,
			registrationTimeout: userConfig?.registrationTimeout || 30000,
			enableServiceHealthChecks: userConfig?.enableServiceHealthChecks !== false,
			healthCheckInterval: userConfig?.healthCheckInterval || 30000,
			healthCheckTimeout: userConfig?.healthCheckTimeout || 5000,
			enableCircuitBreaker: userConfig?.enableCircuitBreaker !== false,
			enableGracefulShutdown: userConfig?.enableGracefulShutdown ?? !isTestEnv,
			// Shorter shutdown in tests prevents open-handle warnings and speeds up teardown
			shutdownTimeout: userConfig?.shutdownTimeout ?? (isTestEnv ? 1000 : 30000),
			enableMetricsLogging: userConfig?.enableMetricsLogging === true,
			enablePerformanceMonitoring: userConfig?.enablePerformanceMonitoring !== false,
		};

		// Initialize unified collector
		this.collector = initializeUnifiedMetricsCollector(this.config.collectorConfig);

		// Set up event handlers
		this.setupEventHandlers();

		logger.info('Unified metrics endpoint initialized', {
			host: this.config.collectorConfig.host,
			port: this.config.collectorConfig.port,
			endpoint: `http://${this.config.collectorConfig.host}:${this.config.collectorConfig.port}/metrics`,
			autoDiscovery: this.config.autoDiscoverServices,
			autoRegistration: this.config.enableAutoRegistration,
		});
	}

	private setupEventHandlers(): void {
		// Handle collector events
		this.collector.on('server_started', (info) => {
			logger.info('Unified metrics server started', info);
			this.emit('endpoint_ready', {
				...info,
				metricsUrl: `http://${info.host}:${info.port}/metrics`,
				healthUrl: `http://${info.host}:${info.port}/health`,
			});
		});

		this.collector.on('server_stopped', () => {
			logger.info('Unified metrics server stopped');
			this.emit('endpoint_stopped');
		});

		this.collector.on('service_registered', (info) => {
			logger.info('Service registered with unified collector', info);
			this.emit('service_registered', info);
		});

		// Handle process signals for graceful shutdown
		if (this.config.enableGracefulShutdown) {
			process.on('SIGINT', this.handleShutdown.bind(this));
			process.on('SIGTERM', this.handleShutdown.bind(this));
			process.on('beforeExit', this.handleShutdown.bind(this));
		}
	}

	/**
	 * Initialize the unified metrics endpoint system
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			logger.warn('Unified metrics endpoint already initialized');
			return;
		}

		try {
			logger.info('Initializing unified metrics endpoint system...');

			// Start the unified collector server
			await this.collector.start();

			// Auto-discover and register services if enabled
			if (this.config.autoDiscoverServices) {
				await this.discoverAndRegisterServices();
			}

			// Start health monitoring if enabled
			if (this.config.enableServiceHealthChecks) {
				this.startHealthMonitoring();
			}

			this.isInitialized = true;

			logger.info('Unified metrics endpoint system initialized successfully', {
				endpoint: `http://${this.config.collectorConfig.host}:${this.config.collectorConfig.port}/metrics`,
				registeredServices: this.serviceRegistrations.size,
				healthMonitoring: this.config.enableServiceHealthChecks,
			});

			this.emit('initialized', {
				endpoint: `http://${this.config.collectorConfig.host}:${this.config.collectorConfig.port}/metrics`,
				registeredServices: Array.from(this.serviceRegistrations.keys()),
			});
		} catch (error) {
			logger.error('Failed to initialize unified metrics endpoint:', ensureError(error));
			throw error;
		}
	}

	/**
	 * Register a service with the unified metrics system
	 */
	async registerService(
		serviceName: string,
		serviceConfig?: Partial<ServiceMetricsConfiguration>,
	): Promise<ServiceAwareMetricsService> {
		try {
			logger.info(`Registering service: ${serviceName}`);

			// Validate service name before proceeding
			if (!this.knownServices.includes(serviceName)) {
				throw new Error(`Unknown service: ${serviceName}. Must be one of: ${this.knownServices.join(', ')}`);
			}

			// Create or get service-aware metrics instance
			const serviceMetrics = initializeServiceMetrics(serviceName, {
				autoRegisterWithUnified: false, // We'll handle registration manually
				enableServiceLabels: true,
				enableComponentTracking: true,
				...serviceConfig,
			});

			// Register with unified collector
			await this.collector.registerServiceMetrics(serviceName, serviceMetrics);

			// Track registration information
			const registrationInfo: ServiceRegistrationInfo = {
				service: serviceName,
				instance: serviceMetrics,
				registeredAt: Date.now(),
				lastActivity: Date.now(),
				healthStatus: 'healthy',
				componentCount: serviceMetrics.getComponentTrackers().size,
				metricsCount: 0, // Will be updated during health checks
			};

			this.serviceRegistrations.set(serviceName, registrationInfo);

			// Add service-specific health checks to the unified collector
			this.addServiceHealthChecks(serviceName, serviceMetrics);

			// Initialize Redis metrics export for BunkBot
			if (serviceName === 'bunkbot') {
				await this.initializeBunkBotRedisExport(serviceMetrics);
			}

			logger.info(`Service ${serviceName} registered successfully`, {
				componentCount: registrationInfo.componentCount,
				hasUnifiedCollector: true,
			});

			this.emit('service_registered', {
				service: serviceName,
				componentCount: registrationInfo.componentCount,
			});

			return serviceMetrics;
		} catch (error) {
			logger.error(`Failed to register service ${serviceName}:`, ensureError(error));
			throw error;
		}
	}

	/**
	 * Auto-discover and register known services
	 */
	private async discoverAndRegisterServices(): Promise<void> {
		logger.info('Auto-discovering services...');

		const registrationPromises = this.knownServices.map(async (serviceName) => {
			try {
				// Check if service is already running/available
				const isServiceAvailable = await this.checkServiceAvailability(serviceName);

				if (isServiceAvailable || this.config.enableAutoRegistration) {
					await this.registerService(serviceName);
					logger.debug(`Auto-registered service: ${serviceName}`);
				} else {
					logger.debug(`Service ${serviceName} not available for auto-registration`);
				}
			} catch (error) {
				logger.warn(`Failed to auto-register service ${serviceName}:`, ensureError(error));
			}
		});

		// Wait for all registrations with timeout
		await Promise.allSettled(registrationPromises);

		logger.info('Service auto-discovery completed', {
			discoveredServices: this.serviceRegistrations.size,
			totalKnownServices: this.knownServices.length,
		});
	}

	/**
	 * Check if a service is available for registration
	 */
	private async checkServiceAvailability(serviceName: string): Promise<boolean> {
		// For now, assume services are available if their environment is configured
		// In a real implementation, you might check for service-specific environment variables
		// or attempt to connect to service-specific health endpoints

		const serviceEnvVars: Record<string, string[]> = {
			bunkbot: ['DISCORD_TOKEN'],
			djcova: ['DISCORD_TOKEN'],
			covabot: ['DISCORD_TOKEN', 'OPENAI_API_KEY'],
			'starbunk-dnd': ['DISCORD_TOKEN', 'OPENAI_API_KEY'],
			shared: [], // Always available
		};

		const requiredVars = serviceEnvVars[serviceName] || [];
		return requiredVars.every((varName) => !!process.env[varName]);
	}

	/**
	 * Initialize Redis metrics export for BunkBot
	 */
	private async initializeBunkBotRedisExport(serviceMetrics: ServiceAwareMetricsService): Promise<void> {
		try {
			// Check if Redis is configured
			const redisHost = process.env.REDIS_HOST || process.env.BOT_METRICS_REDIS_HOST;
			const redisPort = process.env.REDIS_PORT || process.env.BOT_METRICS_REDIS_PORT || '6379';

			if (!redisHost) {
				logger.info('Redis not configured for BunkBot, skipping Redis metrics export');
				return;
			}

			logger.info('Initializing Redis metrics export for BunkBot', {
				redisHost,
				redisPort,
			});

			// Attempt to import and initialize Redis components
			try {
				const Redis = (await import('ioredis')).default;
				const { BotTriggerMetricsService } = await import('./BotTriggerMetricsService');
				const { _BunkBotMetricsCollector } = await import('./BunkBotMetrics');

				// Create Redis connection
				const redis = new Redis({
					host: redisHost,
					port: parseInt(redisPort, 10),
					password: process.env.REDIS_PASSWORD || process.env.BOT_METRICS_REDIS_PASSWORD,
					db: parseInt(process.env.REDIS_DB || '0', 10),
					lazyConnect: true,
					enableOfflineQueue: false,
					maxRetriesPerRequest: 1,
				});

				// Test connection
				await redis.connect();
				await redis.ping();

				// Initialize bot trigger metrics service if needed
				let triggerMetricsService: any;
				if (process.env.ENABLE_BOT_TRIGGER_METRICS === 'true') {
					triggerMetricsService = new BotTriggerMetricsService({
						redis: {
							host: redisHost,
							port: parseInt(redisPort, 10),
							password: process.env.REDIS_PASSWORD,
							db: parseInt(process.env.REDIS_DB || '0', 10),
						},
						enableBatchOperations: true,
						enableCircuitBreaker: true,
					});
					await triggerMetricsService.initialize();
				}

				// Get BunkBot metrics collector from service metrics
				// The serviceMetrics might have a reference to the actual collector
				const registry = (serviceMetrics as any).registry || (this.collector as any).registry;

				// Check if we can get the BunkBot collector instance
				if (typeof (serviceMetrics as any).getBunkBotCollector === 'function') {
					const bunkBotCollector = (serviceMetrics as any).getBunkBotCollector();
					if (bunkBotCollector && typeof bunkBotCollector.initializeRedisExport === 'function') {
						await bunkBotCollector.initializeRedisExport(redis, triggerMetricsService, {
							cacheTTL: 15000,
							enableCircuitBreaker: true,
							exportTimeout: 5000,
						});
						logger.info('Redis metrics export initialized for BunkBot collector');
					}
				} else {
					// Create a standalone Redis exporter and register with the collector
					const { createRedisBotMetricsExporter } = await import('./RedisBotMetricsExporter');
					const redisExporter = createRedisBotMetricsExporter(registry, {
						cacheTTL: 15000,
						enableCircuitBreaker: true,
						exportTimeout: 5000,
					});
					await redisExporter.initialize(redis, triggerMetricsService);

					// Start periodic export
					setInterval(() => {
						redisExporter.exportMetrics().catch((error) => {
							logger.error('Redis metrics export failed:', error);
						});
					}, 15000);

					logger.info('Standalone Redis metrics exporter initialized for BunkBot');
				}
			} catch (error) {
				logger.error('Failed to initialize Redis metrics export for BunkBot:', ensureError(error));
				// Don't throw - allow service to continue without Redis export
			}
		} catch (error) {
			logger.warn('Redis metrics export initialization skipped:', ensureError(error));
		}
	}

	/**
	 * Add service-specific health checks to the unified collector
	 */
	private addServiceHealthChecks(serviceName: string, serviceMetrics: ServiceAwareMetricsService): void {
		const componentTrackers = serviceMetrics.getComponentTrackers();

		// Add health check for each component
		componentTrackers.forEach((tracker, componentName) => {
			this.collector.addHealthCheck(serviceName, componentName, 'component_health', async () => {
				const healthStatus = serviceMetrics.getServiceHealthStatus() as any;
				const componentHealth = healthStatus.components[componentName];

				if (!componentHealth) {
					return {
						status: 'warn',
						output: `Component ${componentName} not found`,
						timestamp: new Date().toISOString(),
					};
				}

				const status =
					componentHealth.status === 'healthy'
						? 'pass'
						: componentHealth.status === 'degraded'
							? 'warn'
							: 'fail';

				return {
					status,
					output: `Component ${componentName}: ${componentHealth.status} (${componentHealth.operationCount} ops, ${Math.round(componentHealth.errorRate * 100)}% errors)`,
					timestamp: new Date().toISOString(),
				};
			});
		});

		// Add overall service health check using the first component
		const firstComponent = serviceMetrics.getComponentTrackers().keys().next().value;
		if (firstComponent) {
			this.collector.addHealthCheck(serviceName, firstComponent, 'overall_health', async () => {
				try {
					const healthStatus = serviceMetrics.getServiceHealthStatus() as any;
					const status =
						healthStatus.status === 'healthy'
							? 'pass'
							: healthStatus.status === 'shutting_down'
								? 'warn'
								: 'fail';

					return {
						status,
						output: `Service ${serviceName}: ${healthStatus.status} (uptime: ${Math.round(healthStatus.uptime)}s)`,
						timestamp: new Date().toISOString(),
					};
				} catch (error) {
					return {
						status: 'fail',
						output: `Service ${serviceName} health check failed: ${ensureError(error).message}`,
						timestamp: new Date().toISOString(),
					};
				}
			});
		}
	}

	/**
	 * Start periodic health monitoring of registered services
	 */
	private startHealthMonitoring(): void {
		if (this.healthCheckInterval) {
			return; // Already started
		}

		this.healthCheckInterval = setInterval(async () => {
			if (this.isShuttingDown) {
				return;
			}

			try {
				await this.performServiceHealthChecks();
			} catch (error) {
				logger.error('Error during periodic health checks:', ensureError(error));
			}
		}, this.config.healthCheckInterval);

		logger.info('Started periodic health monitoring', {
			interval: this.config.healthCheckInterval,
			timeout: this.config.healthCheckTimeout,
		});
	}

	/**
	 * Perform health checks on all registered services
	 */
	private async performServiceHealthChecks(): Promise<ServiceHealthResult[]> {
		const results: ServiceHealthResult[] = [];

		for (const [serviceName, registrationInfo] of this.serviceRegistrations) {
			try {
				const healthCheck = await this.checkServiceHealth(serviceName, registrationInfo);
				results.push(healthCheck);

				// Update registration info
				registrationInfo.healthStatus = healthCheck.status;
				registrationInfo.lastActivity = Date.now();
			} catch (error) {
				logger.warn(`Health check failed for service ${serviceName}:`, ensureError(error));
				registrationInfo.healthStatus = 'unhealthy';
			}
		}

		if (this.config.enableMetricsLogging && results.length > 0) {
			const healthySvcs = results.filter((r) => r.status === 'healthy').length;
			const degradedSvcs = results.filter((r) => r.status === 'degraded').length;
			const unhealthySvcs = results.filter((r) => r.status === 'unhealthy').length;

			logger.debug('Service health summary', {
				total: results.length,
				healthy: healthySvcs,
				degraded: degradedSvcs,
				unhealthy: unhealthySvcs,
			});
		}

		return results;
	}

	/**
	 * Check health of a specific service
	 */
	private async checkServiceHealth(
		serviceName: string,
		registrationInfo: ServiceRegistrationInfo,
	): Promise<ServiceHealthResult> {
		const _startTime = Date.now(); // TODO: Add timing metrics if needed

		try {
			const healthStatus = registrationInfo.instance.getServiceHealthStatus() as any;
			const metricsSummary = registrationInfo.instance.getServiceMetricsSummary() as any;

			// Convert component health information
			const components = Object.entries(healthStatus.components || {}).map(
				([component, info]: [string, any]) => ({
					component,
					status:
						info.status === 'healthy'
							? ('pass' as const)
							: info.status === 'degraded'
								? ('warn' as const)
								: ('fail' as const),
					lastActivity: info.lastActivity,
					operationCount: info.operationCount,
					errorRate: info.errorRate,
				}),
			);

			// Determine overall service status
			const hasFailures = components.some((c) => c.status === 'fail');
			const hasWarnings = components.some((c) => c.status === 'warn');

			let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
			if (hasFailures || healthStatus.status === 'unhealthy') {
				overallStatus = 'unhealthy';
			} else if (hasWarnings || healthStatus.status === 'degraded') {
				overallStatus = 'degraded';
			} else {
				overallStatus = 'healthy';
			}

			// Update metrics count
			registrationInfo.metricsCount = metricsSummary.serviceMetricsCount || 0;

			return {
				service: serviceName,
				status: overallStatus,
				components,
				registrationInfo: {
					registeredAt: registrationInfo.registeredAt,
					lastActivity: registrationInfo.lastActivity,
					metricsCount: registrationInfo.metricsCount,
				},
				timestamp: Date.now(),
			};
		} catch (error) {
			logger.error(`Error checking health for service ${serviceName}:`, ensureError(error));
			return {
				service: serviceName,
				status: 'unhealthy',
				components: [],
				registrationInfo: {
					registeredAt: registrationInfo.registeredAt,
					lastActivity: registrationInfo.lastActivity,
					metricsCount: registrationInfo.metricsCount,
				},
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Get the unified metrics endpoint URL
	 */
	getMetricsEndpoint(): string {
		return `http://${this.config.collectorConfig.host}:${this.config.collectorConfig.port}/metrics`;
	}

	/**
	 * Get the health endpoint URL
	 */
	getHealthEndpoint(): string {
		return `http://${this.config.collectorConfig.host}:${this.config.collectorConfig.port}/health`;
	}

	/**
	 * Get system information
	 */
	getSystemInfo(): object {
		return {
			unifiedEndpoint: {
				metricsUrl: this.getMetricsEndpoint(),
				healthUrl: this.getHealthEndpoint(),
				uptime: Date.now() - this.startTime,
				initialized: this.isInitialized,
				shuttingDown: this.isShuttingDown,
			},
			services: Array.from(this.serviceRegistrations.entries()).map(([service, info]) => ({
				service,
				status: info.healthStatus,
				registeredAt: new Date(info.registeredAt).toISOString(),
				lastActivity: new Date(info.lastActivity).toISOString(),
				componentCount: info.componentCount,
				metricsCount: info.metricsCount,
			})),
			collector: this.collector.getCollectorStats(),
			config: {
				autoDiscovery: this.config.autoDiscoverServices,
				autoRegistration: this.config.enableAutoRegistration,
				healthMonitoring: this.config.enableServiceHealthChecks,
				circuitBreaker: this.config.enableCircuitBreaker,
				gracefulShutdown: this.config.enableGracefulShutdown,
			},
		};
	}

	/**
	 * Get a registered service metrics instance
	 */
	getServiceMetrics(serviceName: string): ServiceAwareMetricsService | undefined {
		return this.serviceRegistrations.get(serviceName)?.instance;
	}

	/**
	 * Get all registered services
	 */
	getRegisteredServices(): string[] {
		return Array.from(this.serviceRegistrations.keys());
	}

	/**
	 * Graceful shutdown handler
	 */
	private async handleShutdown(): Promise<void> {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		logger.info('Starting graceful shutdown of unified metrics endpoint...');

		try {
			// Stop health monitoring
			if (this.healthCheckInterval) {
				clearInterval(this.healthCheckInterval);
				this.healthCheckInterval = undefined;
			}

			// Shutdown all registered services
			const shutdownPromises = Array.from(this.serviceRegistrations.values()).map(async (info) => {
				try {
					await info.instance.shutdown();
					logger.debug(`Service ${info.service} metrics shutdown complete`);
				} catch (error) {
					logger.warn(`Error shutting down service ${info.service}:`, ensureError(error));
				}
			});

			// Wait for service shutdowns with timeout
			await Promise.race([
				Promise.allSettled(shutdownPromises),
				new Promise((resolve) => setTimeout(resolve, this.config.shutdownTimeout)),
			]);

			// Stop unified collector
			await this.collector.stop();

			// Clear registrations
			this.serviceRegistrations.clear();

			logger.info('Unified metrics endpoint shutdown complete');
			this.emit('shutdown_complete');
		} catch (error) {
			logger.error('Error during unified metrics endpoint shutdown:', ensureError(error));
			throw error;
		}
	}

	/**
	 * Manual shutdown
	 */
	async shutdown(): Promise<void> {
		await this.handleShutdown();
	}
}

// Global instance management
let globalUnifiedEndpoint: UnifiedMetricsEndpoint | undefined;

export function initializeUnifiedMetricsEndpoint(config?: Partial<UnifiedEndpointConfig>): UnifiedMetricsEndpoint {
	if (globalUnifiedEndpoint) {
		logger.warn('Unified metrics endpoint already initialized, returning existing instance');
		return globalUnifiedEndpoint;
	}

	globalUnifiedEndpoint = new UnifiedMetricsEndpoint(config);
	logger.info('Unified metrics endpoint initialized');
	return globalUnifiedEndpoint;
}

export function getUnifiedMetricsEndpoint(): UnifiedMetricsEndpoint {
	if (!globalUnifiedEndpoint) {
		throw new Error('Unified metrics endpoint not initialized. Call initializeUnifiedMetricsEndpoint() first.');
	}
	return globalUnifiedEndpoint;
}

/**
 * Reset the global unified metrics endpoint - FOR TESTING ONLY
 */
export function resetUnifiedMetricsEndpoint(): void {
	globalUnifiedEndpoint = undefined;
}

// Convenience function to start the entire unified metrics system
export async function startUnifiedMetricsSystem(
	config?: Partial<UnifiedEndpointConfig>,
): Promise<UnifiedMetricsEndpoint> {
	const endpoint = initializeUnifiedMetricsEndpoint(config);
	await endpoint.initialize();
	return endpoint;
}

// Export types
export type { UnifiedEndpointConfig, ServiceRegistrationInfo, ServiceHealthResult };
