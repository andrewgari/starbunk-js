// Legacy MetricsService (maintain backward compatibility)
export { MetricsService, type MessageFlowMetrics, type ChannelActivity } from './MetricsService';

// Production-ready metrics service
export {
	ProductionMetricsService,
	initializeMetrics,
	getMetrics,
	type MetricsConfiguration,
} from './ProductionMetricsService';

export {
	StructuredLogger,
	initializeStructuredLogger,
	getStructuredLogger,
	type LogContext,
	type MessageFlowLog,
	type ChannelActivityLog,
	type SystemLog,
} from './StructuredLogger';

export { BotResponseLogger, getBotResponseLogger, type BotResponseLog } from './BotResponseLogger';

export { inferTriggerCondition } from './triggerConditionUtils';

export {
	ChannelActivityTracker,
	initializeChannelActivityTracker,
	getChannelActivityTracker,
} from './ChannelActivityTracker';

export {
	HttpEndpointsService,
	initializeHttpEndpoints,
	getHttpEndpoints,
	type EndpointsConfig,
	type HealthCheckFunction,
	type HealthCheckResult,
} from './HttpEndpointsService';

// Container-specific metrics exports
export {
	type BunkBotMetrics,
	type DJCovaMetrics,
	type StarbunkDNDMetrics,
	type CovaBotMetrics,
	type MessageContext,
	ContainerMetricsBase,
	type ContainerMetricsFactory,
	type ContainerMetricsConfig,
} from './ContainerMetrics';

export { _BunkBotMetricsCollector as BunkBotMetricsCollector, createBunkBotMetrics } from './BunkBotMetrics';

export { DJCovaMetricsCollector, createDJCovaMetrics } from './DJCovaMetrics';

export { StarbunkDNDMetricsCollector, createStarbunkDNDMetrics } from './StarbunkDNDMetrics';

export { CovaBotMetricsCollector, createCovaBotMetrics } from './CovaBotMetrics';

// Unified metrics system exports
export {
	UnifiedMetricsCollector,
	initializeUnifiedMetricsCollector,
	getUnifiedMetricsCollector,
	resetUnifiedMetricsCollector,
	type UnifiedMetricsConfig,
	type ServiceComponent,
	type HealthCheckResult as UnifiedHealthCheckResult,
	type ServiceHealthStatus,
} from './UnifiedMetricsCollector';

export {
	ServiceAwareMetricsService,
	createServiceMetrics,
	initializeServiceMetrics,
	getServiceMetrics,
	getAllServiceMetrics,
	type ServiceMetricsConfiguration,
	type ComponentTracker,
	type ServiceMetricContext,
	type ServiceMessageFlowMetrics,
} from './ServiceMetricsRegistry';

export {
	UnifiedMetricsEndpoint,
	initializeUnifiedMetricsEndpoint,
	getUnifiedMetricsEndpoint,
	resetUnifiedMetricsEndpoint,
	startUnifiedMetricsSystem,
	type UnifiedEndpointConfig,
	type ServiceRegistrationInfo,
	type ServiceHealthResult,
} from './UnifiedMetricsEndpoint';

// Bot Trigger Metrics Service
export {
	BotTriggerMetricsService,
	createBotTriggerMetricsService,
	initializeBotTriggerMetricsService,
	getBotTriggerMetricsService,
	createProductionConfig,
} from './BotTriggerMetricsService';

// Bot Trigger Integration
export {
	Enhanced_BunkBotMetricsCollector as EnhancedBunkBotMetricsCollector,
	createEnhancedBunkBotMetrics,
	BotTriggerTracker,
	createEnvironmentConfig,
	initializeBotMetricsSystem,
	type BotTriggerIntegrationConfig,
} from './BotTriggerIntegration';

// Redis Bot Metrics Exporter
export {
	RedisBotMetricsExporter,
	createRedisBotMetricsExporter,
	type RedisMetricsExporterConfig,
} from './RedisBotMetricsExporter';

// Import validation utilities
import { validateObservabilityEnvironment, type ObservabilityConfig } from '../../utils/envValidation';

// Import for internal use
import { initializeMetrics, ProductionMetricsService, type MetricsConfiguration } from './ProductionMetricsService';
import { initializeStructuredLogger } from './StructuredLogger';
import { initializeChannelActivityTracker } from './ChannelActivityTracker';
import { initializeHttpEndpoints, type EndpointsConfig } from './HttpEndpointsService';

interface ObservabilityComponents {
	metrics: ProductionMetricsService;
	logger: import('./StructuredLogger').StructuredLogger;
	channelTracker: import('./ChannelActivityTracker').ChannelActivityTracker;
	httpEndpoints: import('./HttpEndpointsService').HttpEndpointsService;
	config: ObservabilityConfig;
}

// Enhanced initialization with full production-ready observability stack
export async function initializeObservability(
	service: string,
	options?: {
		metricsConfig?: Partial<MetricsConfiguration>;
		endpointsConfig?: Partial<EndpointsConfig>;
		skipHttpEndpoints?: boolean;
	},
): Promise<ObservabilityComponents> {
	// Validate environment configuration
	const envConfig = validateObservabilityEnvironment();

	// Initialize metrics service with production features
	const metricsConfig: Partial<MetricsConfiguration> = {
		enableCollection: envConfig.metricsEnabled,
		enablePush: envConfig.pushEnabled,
		pushInterval: envConfig.pushInterval,
		pushGatewayUrl: envConfig.pushGatewayUrl,
		circuitBreakerThreshold: envConfig.circuitBreakerThreshold,
		enableRuntimeMetrics: envConfig.runtimeMetricsEnabled,
		...options?.metricsConfig,
	};

	const metrics = initializeMetrics(service, metricsConfig);

	// Initialize structured logger
	const structuredLogger = initializeStructuredLogger(service);

	// Initialize channel activity tracker
	const channelTracker = initializeChannelActivityTracker();

	// Initialize HTTP endpoints service (if not skipped)
	let httpEndpoints: import('./HttpEndpointsService').HttpEndpointsService;

	if (!options?.skipHttpEndpoints) {
		const endpointsConfig: Partial<EndpointsConfig> = {
			enableMetrics: envConfig.metricsEnabled,
			enableHealth: true,
			enableReady: true,
			enablePprof: process.env.NODE_ENV === 'development',
			...options?.endpointsConfig,
		};

		httpEndpoints = initializeHttpEndpoints(service, endpointsConfig);
		httpEndpoints.setMetricsService(metrics);

		// Start HTTP endpoints server in production mode
		if (envConfig.metricsEnabled || process.env.ENABLE_HTTP_ENDPOINTS !== 'false') {
			try {
				await httpEndpoints.start();
				console.log(`HTTP endpoints server started successfully for ${service}`);
			} catch (error) {
				// Log error but don't fail initialization
				console.error('Failed to start HTTP endpoints server::', error); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		}
	} else {
		// Create a minimal stub if HTTP endpoints are skipped
		httpEndpoints = {} as any;
	}

	return {
		metrics,
		logger: structuredLogger,
		channelTracker,
		httpEndpoints,
		config: envConfig,
	};
}

// Legacy initialization for backward compatibility
export async function initializeObservabilityLegacy(service: string) {
	const result = await initializeObservability(service, { skipHttpEndpoints: true });
	return {
		metrics: result.metrics,
		logger: result.logger,
		channelTracker: result.channelTracker,
	};
}

// Enhanced initialization with unified metrics support
interface UnifiedObservabilityComponents extends ObservabilityComponents {
	unifiedEndpoint?: import('./UnifiedMetricsEndpoint').UnifiedMetricsEndpoint;
	serviceMetrics?: import('./ServiceMetricsRegistry').ServiceAwareMetricsService;
}

export async function initializeUnifiedObservability(
	service: string,
	options?: {
		metricsConfig?: Partial<MetricsConfiguration>;
		endpointsConfig?: Partial<EndpointsConfig>;
		unifiedConfig?: Partial<import('./UnifiedMetricsEndpoint').UnifiedEndpointConfig>;
		enableUnified?: boolean;
		enableStructuredLogging?: boolean;
		skipHttpEndpoints?: boolean;
	},
): Promise<UnifiedObservabilityComponents> {
	// Start with standard observability
	const standardComponents = await initializeObservability(service, {
		metricsConfig: options?.metricsConfig,
		endpointsConfig: options?.endpointsConfig,
		skipHttpEndpoints: options?.skipHttpEndpoints,
	});

	const envConfig = validateObservabilityEnvironment();
	const enableUnified = options?.enableUnified ?? envConfig.unifiedMetricsEnabled ?? true;

	// Configure structured logging
	try {
		const { logger } = require('../logger');
		logger.setServiceName(service);
		if (options?.enableStructuredLogging ?? envConfig.structuredLoggingEnabled) {
			logger.enableStructuredLogging(true);
		}
	} catch (error) {
		// Logger import failed, continue without configuration
		console.warn('Failed to configure structured logging:', error);
	}

	let unifiedEndpoint: import('./UnifiedMetricsEndpoint').UnifiedMetricsEndpoint | undefined;
	let serviceMetrics: import('./ServiceMetricsRegistry').ServiceAwareMetricsService | undefined;

	if (enableUnified) {
		try {
			// Initialize unified metrics endpoint (this will create the collector)
			const { initializeUnifiedMetricsEndpoint } = require('./UnifiedMetricsEndpoint');
			unifiedEndpoint = initializeUnifiedMetricsEndpoint(options?.unifiedConfig);

			// Create service-aware metrics instance
			const { initializeServiceMetrics } = require('./ServiceMetricsRegistry');
			serviceMetrics = initializeServiceMetrics(service, {
				enableServiceLabels: true,
				enableComponentTracking: true,
				autoRegisterWithUnified: false, // Manual registration for better control
			});

			// Register service with unified endpoint
			if (unifiedEndpoint) {
				unifiedEndpoint
					.registerService(service, {
						enableServiceLabels: true,
						enableComponentTracking: true,
					})
					.catch((error) => {
						console.error(`Failed to register ${service} with unified metrics:`, error);
					});

				console.log(`Unified observability initialized for ${service}`, {
					unifiedEndpoint: unifiedEndpoint.getMetricsEndpoint(),
					healthEndpoint: unifiedEndpoint.getHealthEndpoint(),
				});
			}
		} catch (error) {
			console.error('Failed to initialize unified observability, falling back to standard:', error);
		}
	}

	return {
		...standardComponents,
		unifiedEndpoint,
		serviceMetrics,
	};
}

// Graceful shutdown helper
export async function shutdownObservability(): Promise<void> {
	try {
		// Get all global instances and shut them down
		const promises = [];

		// Shutdown unified metrics first
		try {
			const { getUnifiedMetricsEndpoint } = await import('./UnifiedMetricsEndpoint');
			const unifiedEndpoint = getUnifiedMetricsEndpoint();
			promises.push(unifiedEndpoint.shutdown());
		} catch (_error) {
			// Service not initialized, ignore
		}

		// Shutdown service metrics
		try {
			const { getAllServiceMetrics } = await import('./ServiceMetricsRegistry');
			const serviceMetrics = getAllServiceMetrics();
			for (const [service, metrics] of serviceMetrics) {
				promises.push(
					metrics.shutdown().catch((error) => {
						console.error(`Error shutting down metrics for ${service}:`, error);
					}),
				);
			}
		} catch (_error) {
			// Service not initialized, ignore
		}

		// Shutdown metrics service
		try {
			const metrics = await import('./ProductionMetricsService').then((m) => m.getMetrics());
			promises.push(metrics.shutdown());
		} catch (_error) {
			// Service not initialized, ignore
		}

		// Shutdown HTTP endpoints
		try {
			const httpEndpoints = await import('./HttpEndpointsService').then((m) => m.getHttpEndpoints());
			promises.push(httpEndpoints.stop());
		} catch (_error) {
			// Service not initialized, ignore
		}

		// Shutdown structured logger
		try {
			const structuredLogger = await import('./StructuredLogger').then((m) => m.getStructuredLogger());
			if (structuredLogger && typeof (structuredLogger as any).shutdown === 'function') {
				promises.push((structuredLogger as any).shutdown());
			}
		} catch (_error) {
			// Service not initialized, ignore
		}

		await Promise.allSettled(promises);
		console.log('Observability stack shutdown complete');
	} catch (error) {
		console.error('Error during observability shutdown::', error); // eslint-disable-line @typescript-eslint/no-unused-vars
	}
}
