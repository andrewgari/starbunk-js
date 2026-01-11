import { logger } from '../logger';
import { ensureError } from '../../utils/error-utils';
import { ProductionMetricsService, type MetricsConfiguration } from './production-metrics-service';
import { UnifiedMetricsCollector } from './unified-metrics-collector';
import * as promClient from 'prom-client';
import { EventEmitter as _EventEmitter } from 'events';

// Enhanced service-aware metrics configuration
interface ServiceMetricsConfiguration extends MetricsConfiguration {
	serviceName: string;
	enableServiceLabels: boolean;
	enableComponentTracking: boolean;
	autoRegisterWithUnified: boolean;
	unifiedCollectorEndpoint?: string;
	componentMappings?: Record<string, string[]>;
}

// Component tracking interface
interface ComponentTracker {
	component: string;
	lastActivity: number;
	operationCount: number;
	errorCount: number;
	averageLatency: number;
	healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

// Service-aware metric context
interface ServiceMetricContext {
	service: string;
	component: string;
	operation?: string;
	metadata?: Record<string, string | number>;
}

// Enhanced message flow metrics with service context
interface ServiceMessageFlowMetrics {
	service: string;
	component: string;
	botName: string;
	conditionName?: string;
	messageText: string;
	userId: string;
	userName: string;
	channelId: string;
	channelName: string;
	guildId: string;
	triggered: boolean;
	responseText?: string;
	responseLatency?: number;
	skipReason?: string;
	percentageChance?: number;
	circuitBreakerOpen?: boolean;
	timestamp: number;
	metadata?: Record<string, string | number>;
}

/**
 * Enhanced ProductionMetricsService with service/component awareness
 * Maintains backward compatibility while adding unified collection capabilities
 */
export class ServiceAwareMetricsService extends ProductionMetricsService {
	private readonly serviceConfig: ServiceMetricsConfiguration;
	private readonly componentTrackers = new Map<string, ComponentTracker>();
	private unifiedCollector?: UnifiedMetricsCollector;
	private serviceMetricsRegistry: promClient.Registry;

	// Service-specific metrics
	private serviceOperationsCounter!: promClient.Counter<string>;
	private serviceLatencyHistogram!: promClient.Histogram<string>;
	private serviceErrorsCounter!: promClient.Counter<string>;
	private componentHealthGauge!: promClient.Gauge<string>;
	private componentActivityGauge!: promClient.Gauge<string>;

	constructor(service: string, userConfig?: Partial<ServiceMetricsConfiguration>) {
		// Initialize base metrics service
		super(service, userConfig);

		// Get base configuration from parent class
		const baseConfig = {
			enableCollection: process.env.ENABLE_METRICS !== 'false',
			enablePush: process.env.ENABLE_METRICS_PUSH === 'true',
			pushInterval: parseInt(process.env.METRICS_PUSH_INTERVAL || '30000'),
			pushGatewayUrl: process.env.PROMETHEUS_PUSHGATEWAY_URL,
			maxBatchSize: parseInt(process.env.METRICS_BATCH_SIZE || '1000'),
			circuitBreakerThreshold: parseInt(process.env.METRICS_CIRCUIT_BREAKER_THRESHOLD || '5'),
			resourcePoolSize: parseInt(process.env.METRICS_RESOURCE_POOL_SIZE || '10'),
			enableRuntimeMetrics: process.env.ENABLE_RUNTIME_METRICS !== 'false',
			defaultLabels: {
				service: service,
				environment: process.env.NODE_ENV || 'development',
				version: process.env.APP_VERSION || 'unknown',
				instance: process.env.INSTANCE_ID || process.pid.toString(),
			},
		};

		this.serviceConfig = {
			...baseConfig,
			serviceName: service,
			enableServiceLabels: userConfig?.enableServiceLabels !== false,
			enableComponentTracking: userConfig?.enableComponentTracking !== false,
			autoRegisterWithUnified: userConfig?.autoRegisterWithUnified !== false,
			unifiedCollectorEndpoint: userConfig?.unifiedCollectorEndpoint || 'http://192.168.50.3:3001',
			componentMappings: userConfig?.componentMappings || this.getDefaultComponentMappings(service),
			...userConfig,
		} as ServiceMetricsConfiguration;

		// Create separate registry for service-specific metrics
		this.serviceMetricsRegistry = new promClient.Registry();
		this.serviceMetricsRegistry.setDefaultLabels({
			service: this.serviceConfig.serviceName,
			environment: process.env.NODE_ENV || 'development',
			version: process.env.APP_VERSION || 'unknown',
			instance: process.env.INSTANCE_ID || process.pid.toString(),
		});

		// Initialize service-specific metrics
		this.initializeServiceMetrics();

		// Initialize component trackers
		this.initializeComponentTrackers();

		// Auto-register with unified collector if enabled
		if (this.serviceConfig.autoRegisterWithUnified) {
			this.registerWithUnifiedCollector().catch((error) => {
				logger.warn(`Failed to auto-register ${service} with unified collector:`, ensureError(error));
			});
		}

		logger.info(`Service-aware metrics initialized for ${service}`, {
			enableServiceLabels: this.serviceConfig.enableServiceLabels,
			enableComponentTracking: this.serviceConfig.enableComponentTracking,
			autoRegisterWithUnified: this.serviceConfig.autoRegisterWithUnified,
			components: Object.keys(this.serviceConfig.componentMappings || {}),
		});
	}

	private getDefaultComponentMappings(service: string): Record<string, string[]> {
		const mappings: Record<string, Record<string, string[]>> = {
			bunkbot: {
				reply_bot: ['bot_triggers', 'bot_responses', 'bot_skips'],
				message_processor: ['messages_processed', 'processing_duration'],
				webhook_delivery: ['webhook_delivery', 'delivery_latency'],
				admin_commands: ['admin_commands', 'command_execution'],
			},
			djcova: {
				voice_connection: ['voice_connection', 'connection_latency'],
				audio_processing: ['audio_processing', 'audio_duration'],
				music_session: ['music_session', 'session_duration'],
				queue_management: ['queue_operations', 'queue_size'],
			},
			covabot: {
				personality_ai: ['personality_triggers', 'ai_responses'],
				conversation_context: ['context_retrieval', 'context_updates'],
				llm_inference: ['llm_requests', 'llm_latency'],
				memory_system: ['memory_operations', 'memory_size'],
			},
			'starbunk-dnd': {
				campaign_management: ['campaign_operations', 'player_actions'],
				llm_integration: ['llm_requests', 'llm_responses'],
				vector_embedding: ['embedding_generation', 'similarity_search'],
				cross_server_bridge: ['bridge_messages', 'bridge_latency'],
			},
			shared: {
				discord_client: ['discord_events', 'client_operations'],
				database: ['database_queries', 'query_duration'],
				webhook_manager: ['webhook_operations', 'webhook_latency'],
				message_filter: ['filter_operations', 'filter_results'],
			},
		};

		return mappings[service] || {};
	}

	private sanitizeServiceNameForMetrics(serviceName: string): string {
		// Convert dashes to underscores to make valid Prometheus metric names
		return serviceName.replace(/-/g, '_');
	}

	private initializeServiceMetrics(): void {
		const sanitizedServiceName = this.sanitizeServiceNameForMetrics(this.serviceConfig.serviceName);

		// Service operations counter with component labels
		this.serviceOperationsCounter = new promClient.Counter({
			name: `discord_bot_${sanitizedServiceName}_operations_total`,
			help: `Total operations for ${this.serviceConfig.serviceName} service`,
			labelNames: ['service', 'component', 'operation', 'status'],
			registers: [this.serviceMetricsRegistry],
		});

		// Service latency histogram with component labels
		this.serviceLatencyHistogram = new promClient.Histogram({
			name: `discord_bot_${sanitizedServiceName}_operation_duration_ms`,
			help: `Operation duration for ${this.serviceConfig.serviceName} service`,
			labelNames: ['service', 'component', 'operation'],
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
			registers: [this.serviceMetricsRegistry],
		});

		// Service errors counter
		this.serviceErrorsCounter = new promClient.Counter({
			name: `discord_bot_${sanitizedServiceName}_errors_total`,
			help: `Total errors for ${this.serviceConfig.serviceName} service`,
			labelNames: ['service', 'component', 'operation', 'error_type'],
			registers: [this.serviceMetricsRegistry],
		});

		// Component health gauge
		this.componentHealthGauge = new promClient.Gauge({
			name: `discord_bot_${sanitizedServiceName}_component_health`,
			help: `Component health status (1=healthy, 0.5=degraded, 0=unhealthy)`,
			labelNames: ['service', 'component'],
			registers: [this.serviceMetricsRegistry],
		});

		// Component activity gauge
		this.componentActivityGauge = new promClient.Gauge({
			name: `discord_bot_${sanitizedServiceName}_component_activity`,
			help: `Component activity level (operations per minute)`,
			labelNames: ['service', 'component'],
			registers: [this.serviceMetricsRegistry],
		});
	}

	private initializeComponentTrackers(): void {
		const components = Object.keys(this.serviceConfig.componentMappings || {});
		components.forEach((component) => {
			this.componentTrackers.set(component, {
				component,
				lastActivity: Date.now(),
				operationCount: 0,
				errorCount: 0,
				averageLatency: 0,
				healthStatus: 'healthy',
			});

			// Initialize component health to healthy
			this.componentHealthGauge.set(
				{
					service: this.serviceConfig.serviceName,
					component,
				},
				1,
			);
		});

		logger.debug(`Initialized ${components.length} component trackers for ${this.serviceConfig.serviceName}`);
	}

	/**
	 * Track a service operation with component context
	 */
	trackServiceOperation(context: ServiceMetricContext, duration?: number, success: boolean = true): void {
		if (!this.serviceConfig.enableComponentTracking) {
			return;
		}

		try {
			const { service, component, operation = 'unknown' } = context;
			const status = success ? 'success' : 'error';

			// Update base metrics
			this.serviceOperationsCounter.inc({
				service,
				component,
				operation,
				status,
			});

			if (duration !== undefined) {
				this.serviceLatencyHistogram.observe(
					{
						service,
						component,
						operation,
					},
					duration,
				);
			}

			if (!success) {
				this.serviceErrorsCounter.inc({
					service,
					component,
					operation,
					error_type: (context.metadata?.error_type as string) || 'unknown',
				});
			}

			// Update component tracker
			this.updateComponentTracker(component, duration, success);

			// Emit event for unified collector
			this.emit('service_operation', {
				...context,
				duration,
				success,
				timestamp: Date.now(),
			});
		} catch (error) {
			logger.error('Error tracking service operation:', ensureError(error));
		}
	}

	/**
	 * Enhanced message flow tracking with service context
	 */
	trackServiceMessageFlow(metrics: ServiceMessageFlowMetrics): void {
		// Call base message flow tracking for backward compatibility
		super.trackMessageFlow(metrics);

		// Add service-specific tracking
		if (this.serviceConfig.enableServiceLabels) {
			const context: ServiceMetricContext = {
				service: metrics.service,
				component: metrics.component,
				operation: metrics.triggered ? 'bot_response' : 'bot_skip',
				metadata: {
					bot_name: metrics.botName,
					condition: metrics.conditionName || 'unknown',
					...(metrics.metadata || {}),
				},
			};

			this.trackServiceOperation(context, metrics.responseLatency, metrics.triggered);
		}
	}

	/**
	 * Track component health status
	 */
	updateComponentHealth(component: string, status: 'healthy' | 'degraded' | 'unhealthy'): void {
		const tracker = this.componentTrackers.get(component);
		if (tracker) {
			tracker.healthStatus = status;

			const healthValue = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
			this.componentHealthGauge.set(
				{
					service: this.serviceConfig.serviceName,
					component,
				},
				healthValue,
			);

			logger.debug(`Updated component health: ${component} = ${status}`);
		}
	}

	private updateComponentTracker(component: string, duration?: number, success: boolean = true): void {
		const tracker = this.componentTrackers.get(component);
		if (!tracker) return;

		tracker.lastActivity = Date.now();
		tracker.operationCount++;

		if (!success) {
			tracker.errorCount++;
		}

		if (duration !== undefined) {
			// Update rolling average latency
			tracker.averageLatency = (tracker.averageLatency + duration) / 2;
		}

		// Update activity gauge (operations per minute approximation)
		const _now = Date.now();
		const oneMinuteAgo = _now - 60000;
		const recentActivity = tracker.lastActivity > oneMinuteAgo ? tracker.operationCount : 0;

		this.componentActivityGauge.set(
			{
				service: this.serviceConfig.serviceName,
				component,
			},
			recentActivity,
		);

		// Auto-update health based on error rate and latency
		this.autoUpdateComponentHealth(tracker);
	}

	private autoUpdateComponentHealth(tracker: ComponentTracker): void {
		const errorRate = tracker.operationCount > 0 ? tracker.errorCount / tracker.operationCount : 0;
		const highLatency = tracker.averageLatency > 5000; // 5 seconds

		let newStatus: 'healthy' | 'degraded' | 'unhealthy';

		if (errorRate > 0.1 || highLatency) {
			// > 10% error rate or high latency
			newStatus = 'unhealthy';
		} else if (errorRate > 0.05 || tracker.averageLatency > 2000) {
			// > 5% error rate or 2s latency
			newStatus = 'degraded';
		} else {
			newStatus = 'healthy';
		}

		if (newStatus !== tracker.healthStatus) {
			this.updateComponentHealth(tracker.component, newStatus);
		}
	}

	/**
	 * Register this service with the unified metrics collector
	 */
	async registerWithUnifiedCollector(): Promise<void> {
		try {
			// Try to get existing unified collector instance
			let collector: UnifiedMetricsCollector;
			try {
				const { getUnifiedMetricsCollector } = await import('./unified-metrics-collector');
				collector = getUnifiedMetricsCollector();
			} catch {
				// If no global instance, try to create one
				const { initializeUnifiedMetricsCollector } = await import('./unified-metrics-collector');
				collector = initializeUnifiedMetricsCollector();
			}

			// Register this service
			collector.registerServiceMetrics(this.serviceConfig.serviceName, this);
			this.unifiedCollector = collector;

			logger.info(`Successfully registered ${this.serviceConfig.serviceName} with unified metrics collector`);
		} catch (error) {
			logger.warn(
				`Failed to register ${this.serviceConfig.serviceName} with unified collector:`,
				ensureError(error),
			);
			throw error;
		}
	}

	/**
	 * Get service-specific metrics registry
	 */
	getServiceRegistry(): promClient.Registry {
		return this.serviceMetricsRegistry;
	}

	/**
	 * Get service-specific metrics in Prometheus format
	 */
	async getServiceMetrics(): Promise<string> {
		return await this.serviceMetricsRegistry.metrics();
	}

	/**
	 * Get component tracker information
	 */
	getComponentTrackers(): Map<string, ComponentTracker> {
		return new Map(this.componentTrackers);
	}

	/**
	 * Get service configuration
	 */
	getServiceConfig(): ServiceMetricsConfiguration {
		return { ...this.serviceConfig };
	}

	/**
	 * Get base configuration (override parent method)
	 */
	getConfig(): ServiceMetricsConfiguration {
		return this.getServiceConfig();
	}

	/**
	 * Enhanced health status including component information
	 */
	getServiceHealthStatus(): object {
		const baseHealth = super.getHealthStatus();

		const components: Record<string, any> = {};
		this.componentTrackers.forEach((tracker, component) => {
			components[component] = {
				status: tracker.healthStatus,
				lastActivity: tracker.lastActivity,
				operationCount: tracker.operationCount,
				errorCount: tracker.errorCount,
				averageLatency: tracker.averageLatency,
				errorRate: tracker.operationCount > 0 ? tracker.errorCount / tracker.operationCount : 0,
			};
		});

		return {
			...baseHealth,
			service: this.serviceConfig.serviceName,
			components,
			serviceMetrics: {
				enableServiceLabels: this.serviceConfig.enableServiceLabels,
				enableComponentTracking: this.serviceConfig.enableComponentTracking,
				registeredWithUnified: !!this.unifiedCollector,
			},
		};
	}

	/**
	 * Enhanced metrics summary with service context
	 */
	getServiceMetricsSummary(): object {
		const baseSummary = super.getMetricsSummary();
		const serviceMetrics = this.serviceMetricsRegistry.getMetricsAsArray();

		const componentSummary: Record<string, any> = {};
		this.componentTrackers.forEach((tracker, component) => {
			componentSummary[component] = {
				healthStatus: tracker.healthStatus,
				operationCount: tracker.operationCount,
				errorCount: tracker.errorCount,
				averageLatency: tracker.averageLatency,
				lastActivity: new Date(tracker.lastActivity).toISOString(),
			};
		});

		return {
			...baseSummary,
			service: this.serviceConfig.serviceName,
			serviceMetricsCount: serviceMetrics.length,
			components: componentSummary,
			unifiedCollector: {
				registered: !!this.unifiedCollector,
				endpoint: this.serviceConfig.unifiedCollectorEndpoint,
			},
		};
	}

	/**
	 * Enhanced shutdown with service cleanup
	 */
	async shutdown(): Promise<void> {
		logger.info(`Shutting down service-aware metrics for ${this.serviceConfig.serviceName}...`);

		try {
			// Clear component trackers
			this.componentTrackers.clear();

			// Clear service registry
			this.serviceMetricsRegistry.clear();

			// Notify unified collector of shutdown
			if (this.unifiedCollector) {
				this.emit('service_shutdown', {
					service: this.serviceConfig.serviceName,
					timestamp: Date.now(),
				});
			}

			// Call base shutdown
			await super.shutdown();

			logger.info(`Service-aware metrics shutdown complete for ${this.serviceConfig.serviceName}`);
		} catch (error) {
			logger.error(
				`Error during service-aware metrics shutdown for ${this.serviceConfig.serviceName}:`,
				ensureError(error),
			);
			throw error;
		}
	}
}

// Factory function for creating service-aware metrics
export function createServiceMetrics(
	service: string,
	config?: Partial<ServiceMetricsConfiguration>,
): ServiceAwareMetricsService {
	return new ServiceAwareMetricsService(service, config);
}

// Global registry for service instances
const serviceMetricsInstances = new Map<string, ServiceAwareMetricsService>();

export function initializeServiceMetrics(
	service: string,
	config?: Partial<ServiceMetricsConfiguration>,
): ServiceAwareMetricsService {
	if (serviceMetricsInstances.has(service)) {
		logger.warn(`Service metrics already initialized for ${service}, returning existing instance`);
		return serviceMetricsInstances.get(service)!;
	}

	const instance = new ServiceAwareMetricsService(service, config);
	serviceMetricsInstances.set(service, instance);

	logger.info(`Service metrics initialized for ${service}`);
	return instance;
}

export function getServiceMetrics(service: string): ServiceAwareMetricsService {
	const instance = serviceMetricsInstances.get(service);
	if (!instance) {
		throw new Error(`Service metrics not initialized for ${service}. Call initializeServiceMetrics() first.`);
	}
	return instance;
}

export function getAllServiceMetrics(): Map<string, ServiceAwareMetricsService> {
	return new Map(serviceMetricsInstances);
}

// Export types
export type { ServiceMetricsConfiguration, ComponentTracker, ServiceMetricContext, ServiceMessageFlowMetrics };
