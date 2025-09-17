import { EventEmitter } from 'events';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { ProductionMetricsService } from './ProductionMetricsService';
import * as promClient from 'prom-client';
import { performance } from 'perf_hooks';

// Service and component definitions for the Discord bot monorepo
interface ServiceComponent {
	service: string;
	component: string;
	description: string;
}

// Define the service/component structure as per requirements
const SERVICE_COMPONENTS: ServiceComponent[] = [
	// BunkBot service components
	{ service: 'bunkbot', component: 'reply_bot', description: 'Reply bot trigger and response handling' },
	{ service: 'bunkbot', component: 'message_processor', description: 'Message processing pipeline' },
	{ service: 'bunkbot', component: 'webhook_delivery', description: 'Webhook delivery system' },
	{ service: 'bunkbot', component: 'admin_commands', description: 'Administrative command handling' },

	// DJCova service components
	{ service: 'djcova', component: 'voice_connection', description: 'Discord voice connection management' },
	{ service: 'djcova', component: 'audio_processing', description: 'Audio processing and streaming' },
	{ service: 'djcova', component: 'music_session', description: 'Music session lifecycle management' },
	{ service: 'djcova', component: 'queue_management', description: 'Music queue operations' },

	// CovaBot service components
	{ service: 'covabot', component: 'personality_ai', description: 'AI personality response system' },
	{ service: 'covabot', component: 'conversation_context', description: 'Conversation context management' },
	{ service: 'covabot', component: 'llm_inference', description: 'LLM inference operations' },
	{ service: 'covabot', component: 'memory_system', description: 'User memory and context storage' },

	// Starbunk-DND service components
	{ service: 'starbunk-dnd', component: 'campaign_management', description: 'D&D campaign management' },
	{ service: 'starbunk-dnd', component: 'llm_integration', description: 'LLM integration for D&D operations' },
	{ service: 'starbunk-dnd', component: 'vector_embedding', description: 'Vector embedding processing' },
	{ service: 'starbunk-dnd', component: 'cross_server_bridge', description: 'Cross-server communication bridge' },

	// Shared service components
	{ service: 'shared', component: 'discord_client', description: 'Discord client factory and management' },
	{ service: 'shared', component: 'database', description: 'Database service operations' },
	{ service: 'shared', component: 'webhook_manager', description: 'Webhook management system' },
	{ service: 'shared', component: 'message_filter', description: 'Message filtering utilities' },
];

interface UnifiedMetricsConfig {
	port: number;
	host: string;
	basePath: string;
	enableMetrics: boolean;
	enableHealth: boolean;
	enableServiceInfo: boolean;
	corsEnabled: boolean;
	authToken?: string;
	timeout: number;
	maxConcurrentRequests: number;
	circuitBreakerThreshold: number;
	healthCheckTimeout: number;
}

interface ServiceMetricsRegistry {
	service: string;
	components: Map<string, ComponentMetrics>;
	healthChecks: Map<string, () => Promise<HealthCheckResult>>;
	lastActivity: number;
}

interface ComponentMetrics {
	component: string;
	counters: Map<string, promClient.Counter<string>>;
	gauges: Map<string, promClient.Gauge<string>>;
	histograms: Map<string, promClient.Histogram<string>>;
	lastUpdate: number;
}

interface HealthCheckResult {
	status: 'pass' | 'warn' | 'fail';
	output?: string;
	duration_ms?: number;
	timestamp: string;
}

interface ServiceHealthStatus {
	service: string;
	status: 'healthy' | 'degraded' | 'unhealthy';
	components: Array<{
		component: string;
		status: 'pass' | 'warn' | 'fail';
		checks: HealthCheckResult[];
	}>;
	uptime: number;
	lastActivity: number;
}

// Circuit breaker implementation for reliability
class MetricsCircuitBreaker {
	private failures = 0;
	private lastFailureTime = 0;
	private state: 'closed' | 'open' | 'half-open' = 'closed';
	private readonly threshold: number;
	private readonly timeout: number;

	constructor(threshold = 5, timeout = 60000) {
		this.threshold = threshold;
		this.timeout = timeout;
	}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === 'open') {
			if (Date.now() - this.lastFailureTime > this.timeout) {
				this.state = 'half-open';
				logger.info('Unified metrics circuit breaker transitioning to half-open');
			} else {
				throw new Error('Circuit breaker is open - operation blocked');
			}
		}

		try {
			const _result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		this.failures = 0;
		if (this.state === 'half-open') {
			this.state = 'closed';
			logger.info('Unified metrics circuit breaker closed after successful operation');
		}
	}

	private onFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.threshold) {
			this.state = 'open';
			logger.warn(`Unified metrics circuit breaker opened after ${this.failures} failures`);
		}
	}

	getState(): string {
		return this.state;
	}

	getFailures(): number {
		return this.failures;
	}
}

export class UnifiedMetricsCollector extends EventEmitter {
	private readonly config: UnifiedMetricsConfig;
	private readonly globalRegistry: promClient.Registry;
	private readonly serviceRegistries = new Map<string, ServiceMetricsRegistry>();
	private readonly circuitBreaker: MetricsCircuitBreaker;
	private server?: any;
	private isShuttingDown = false;
	private requestCount = 0;
	private readonly startTime = Date.now();

	// Unified metrics for monitoring the collector itself
	private collectorMetrics!: {
		requestsTotal: promClient.Counter<string>;
		requestDuration: promClient.Histogram<string>;
		serviceRegistrations: promClient.Gauge<string>;
		circuitBreakerState: promClient.Gauge<string>;
		healthCheckDuration: promClient.Histogram<string>;
		errorCount: promClient.Counter<string>;
	};

	constructor(userConfig?: Partial<UnifiedMetricsConfig>) {
		super();

		this.config = {
			port: parseInt(process.env.UNIFIED_METRICS_PORT || '3001'),
			host: process.env.UNIFIED_METRICS_HOST || '192.168.50.3',
			basePath: process.env.UNIFIED_METRICS_BASE_PATH || '',
			enableMetrics: process.env.ENABLE_UNIFIED_METRICS !== 'false',
			enableHealth: process.env.ENABLE_UNIFIED_HEALTH !== 'false',
			enableServiceInfo: process.env.ENABLE_UNIFIED_SERVICE_INFO !== 'false',
			corsEnabled: process.env.ENABLE_UNIFIED_CORS === 'true',
			authToken: process.env.UNIFIED_METRICS_AUTH_TOKEN,
			timeout: parseInt(process.env.UNIFIED_METRICS_TIMEOUT || '30000'),
			maxConcurrentRequests: parseInt(process.env.UNIFIED_MAX_CONCURRENT_REQUESTS || '100'),
			circuitBreakerThreshold: parseInt(process.env.UNIFIED_CIRCUIT_BREAKER_THRESHOLD || '5'),
			healthCheckTimeout: parseInt(process.env.UNIFIED_HEALTH_CHECK_TIMEOUT || '5000'),
			...userConfig,
		};

		// Initialize global registry for unified metrics
		this.globalRegistry = new promClient.Registry();

		// Set default labels for the unified collector
		this.globalRegistry.setDefaultLabels({
			collector: 'unified',
			environment: process.env.NODE_ENV || 'development',
			version: process.env.APP_VERSION || 'unknown',
			instance: process.env.INSTANCE_ID || process.pid.toString(),
		});

		// Initialize circuit breaker
		this.circuitBreaker = new MetricsCircuitBreaker(this.config.circuitBreakerThreshold, 60000);

		// Initialize collector's own metrics
		this.initializeCollectorMetrics();

		// Initialize service component registries
		this.initializeServiceRegistries();

		logger.info('Unified metrics collector initialized', {
			port: this.config.port,
			host: this.config.host,
			services: Array.from(this.serviceRegistries.keys()),
			components: SERVICE_COMPONENTS.length,
		});
	}

	private initializeCollectorMetrics(): void {
		this.collectorMetrics = {
			requestsTotal: new promClient.Counter({
				name: 'unified_metrics_requests_total',
				help: 'Total number of requests to unified metrics collector',
				labelNames: ['method', 'endpoint', 'status_code'],
				registers: [this.globalRegistry],
			}),

			requestDuration: new promClient.Histogram({
				name: 'unified_metrics_request_duration_ms',
				help: 'Request duration in milliseconds',
				labelNames: ['method', 'endpoint', 'status_code'],
				buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
				registers: [this.globalRegistry],
			}),

			serviceRegistrations: new promClient.Gauge({
				name: 'unified_metrics_service_registrations',
				help: 'Number of registered services',
				labelNames: ['service'],
				registers: [this.globalRegistry],
			}),

			circuitBreakerState: new promClient.Gauge({
				name: 'unified_metrics_circuit_breaker_state',
				help: 'Circuit breaker state (0=closed, 1=open, 0.5=half-open)',
				registers: [this.globalRegistry],
			}),

			healthCheckDuration: new promClient.Histogram({
				name: 'unified_metrics_health_check_duration_ms',
				help: 'Health check duration in milliseconds',
				labelNames: ['service', 'component', 'status'],
				buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
				registers: [this.globalRegistry],
			}),

			errorCount: new promClient.Counter({
				name: 'unified_metrics_errors_total',
				help: 'Total number of errors in unified metrics collector',
				labelNames: ['operation', 'error_type', 'service'],
				registers: [this.globalRegistry],
			}),
		};
	}

	private initializeServiceRegistries(): void {
		// Group components by service
		const serviceComponentMap = new Map<string, string[]>();
		SERVICE_COMPONENTS.forEach(({ service, component }) => {
			if (!serviceComponentMap.has(service)) {
				serviceComponentMap.set(service, []);
			}
			serviceComponentMap.get(service)!.push(component);
		});

		// Initialize registry for each service
		serviceComponentMap.forEach((components, service) => {
			const serviceRegistry: ServiceMetricsRegistry = {
				service,
				components: new Map(),
				healthChecks: new Map(),
				lastActivity: Date.now(),
			};

			// Initialize component metrics for each service
			components.forEach((component) => {
				const componentMetrics: ComponentMetrics = {
					component,
					counters: new Map(),
					gauges: new Map(),
					histograms: new Map(),
					lastUpdate: Date.now(),
				};
				serviceRegistry.components.set(component, componentMetrics);
			});

			this.serviceRegistries.set(service, serviceRegistry);
			this.collectorMetrics.serviceRegistrations.set({ service }, 1);
		});

		logger.info('Service registries initialized', {
			services: Array.from(serviceComponentMap.keys()),
			totalComponents: SERVICE_COMPONENTS.length,
		});
	}

	/**
	 * Register a service's metrics with the unified collector
	 */
	registerServiceMetrics(service: string, metricsService: ProductionMetricsService): void {
		try {
			const serviceRegistry = this.serviceRegistries.get(service);
			if (!serviceRegistry) {
				throw new Error(
					`Unknown service: ${service}. Must be one of: ${Array.from(this.serviceRegistries.keys()).join(', ')}`,
				);
			}

			// Extract metrics from the service's registry and re-register with unified labels
			const serviceMetricsRegistry = (metricsService as any).registry as promClient.Registry;
			const metrics = serviceMetricsRegistry.getMetricsAsArray();

			metrics.forEach((metric) => {
				try {
					// Clone metric with service/component labels
					this.addServiceMetricToUnified(service, metric);
				} catch (error) {
					logger.warn(`Failed to register metric ${metric.name} for service ${service}:`, ensureError(error));
					this.collectorMetrics.errorCount.inc({
						operation: 'register_metric',
						error_type: 'metric_registration_error',
						service,
					});
				}
			});

			serviceRegistry.lastActivity = Date.now();

			logger.info(`Registered metrics for service ${service}`, {
				metricsCount: metrics.length,
				components: Array.from(serviceRegistry.components.keys()),
			});

			this.emit('service_registered', { service, metricsCount: metrics.length });
		} catch (error) {
			logger.error(`Failed to register service metrics for ${service}:`, ensureError(error));
			this.collectorMetrics.errorCount.inc({
				operation: 'register_service',
				error_type: 'service_registration_error',
				service,
			});
			throw error;
		}
	}

	private addServiceMetricToUnified(service: string, metric: any): void {
		// Get component from metric name or default to first component
		const serviceRegistry = this.serviceRegistries.get(service);
		if (!serviceRegistry) return;

		// Determine component based on metric name patterns
		let component = this.determineComponentFromMetricName(service, metric.name);
		if (!component) {
			component = Array.from(serviceRegistry.components.keys())[0];
		}

		// Create unified metric name with proper naming convention
		const unifiedMetricName = this.createUnifiedMetricName(metric.name, service, component);

		// Add service and component labels to existing label names
		const unifiedLabelNames = [...(metric.labelNames || []), 'service', 'component'];

		try {
			// Clone the metric with unified labels
			let unifiedMetric;
			const metricConfig = {
				name: unifiedMetricName,
				help: metric.help || `${service} ${component} metric`,
				labelNames: unifiedLabelNames,
				registers: [this.globalRegistry],
			};

			if (metric.type === 'counter') {
				unifiedMetric = new promClient.Counter(metricConfig);
			} else if (metric.type === 'gauge') {
				unifiedMetric = new promClient.Gauge(metricConfig);
			} else if (metric.type === 'histogram') {
				unifiedMetric = new promClient.Histogram({
					...metricConfig,
					buckets: (metric as any).buckets || [0.1, 0.5, 1, 2.5, 5, 10],
				});
			} else {
				logger.debug(`Skipping unsupported metric type: ${metric.type} for ${metric.name}`);
				return;
			}

			// Store reference to unified metric
			const componentMetrics = serviceRegistry.components.get(component);
			if (componentMetrics) {
				if (metric.type === 'counter') {
					componentMetrics.counters.set(metric.name, unifiedMetric as promClient.Counter<string>);
				} else if (metric.type === 'gauge') {
					componentMetrics.gauges.set(metric.name, unifiedMetric as promClient.Gauge<string>);
				} else if (metric.type === 'histogram') {
					componentMetrics.histograms.set(metric.name, unifiedMetric as promClient.Histogram<string>);
				}
				componentMetrics.lastUpdate = Date.now();
			}
		} catch (error) {
			// Metric might already exist - this is expected for shared metrics
			logger.debug(`Metric ${unifiedMetricName} already exists or failed to create:`, ensureError(error));
		}
	}

	private determineComponentFromMetricName(service: string, metricName: string): string | null {
		const serviceComponents = this.serviceRegistries.get(service)?.components.keys();
		if (!serviceComponents) return null;

		// Component determination logic based on metric name patterns
		const componentPatterns: Record<string, RegExp[]> = {
			// BunkBot patterns
			reply_bot: [/bot_.*_(total|duration|count)/, /reply_/, /trigger_/],
			message_processor: [/message_.*_processed/, /processing_/],
			webhook_delivery: [/webhook_/, /delivery_/],
			admin_commands: [/admin_/, /command_/],

			// DJCova patterns
			voice_connection: [/voice_/, /connection_/, /latency/],
			audio_processing: [/audio_/, /processing_/, /buffer/],
			music_session: [/music_/, /session_/],
			queue_management: [/queue_/, /track_/],

			// CovaBot patterns
			personality_ai: [/personality_/, /ai_/, /llm_inference/],
			conversation_context: [/context_/, /conversation_/],
			llm_inference: [/llm_/, /inference_/, /model_/],
			memory_system: [/memory_/, /storage_/],

			// Starbunk-DND patterns
			campaign_management: [/campaign_/, /player_/],
			llm_integration: [/llm_/, /openai_/, /ollama_/],
			vector_embedding: [/vector_/, /embedding_/, /similarity/],
			cross_server_bridge: [/bridge_/, /cross_server/],

			// Shared patterns
			discord_client: [/discord_/, /client_/],
			database: [/database_/, /db_/, /sql_/],
			webhook_manager: [/webhook_/],
			message_filter: [/filter_/, /spam_/],
		};

		// Find matching component
		for (const [component, patterns] of Object.entries(componentPatterns)) {
			if (Array.from(serviceComponents).includes(component)) {
				if (patterns.some((pattern) => pattern.test(metricName))) {
					return component;
				}
			}
		}

		return null;
	}

	private createUnifiedMetricName(originalName: string, _service: string, _component: string): string {
		// If already follows the convention, return as-is
		if (originalName.startsWith('discord_bot_')) {
			return originalName;
		}

		// Create unified naming convention: discord_bot_{metric_name}_{total|duration_ms|...}
		const baseName = originalName
			.replace(/^(bot_|discord_|metrics_|http_)/, '') // Remove common prefixes
			.replace(/_total$|_count$/, '') // Remove common suffixes temporarily
			.replace(/[^a-z0-9_]/g, '_') // Sanitize
			.replace(/_+/g, '_') // Remove duplicate underscores
			.replace(/^_|_$/g, ''); // Remove leading/trailing underscores

		// Determine appropriate suffix
		let suffix = 'total';
		if (originalName.includes('duration') || originalName.includes('latency') || originalName.includes('time')) {
			suffix = 'duration_ms';
		} else if (
			originalName.includes('ratio') ||
			originalName.includes('percentage') ||
			originalName.includes('utilization')
		) {
			suffix = 'ratio';
		} else if (originalName.includes('size') || originalName.includes('bytes') || originalName.includes('memory')) {
			suffix = 'bytes';
		}

		return `discord_bot_${baseName}_${suffix}`;
	}

	/**
	 * Add a health check for a service component
	 */
	addHealthCheck(
		service: string,
		component: string,
		name: string,
		checkFunction: () => Promise<HealthCheckResult>,
	): void {
		const serviceRegistry = this.serviceRegistries.get(service);
		if (!serviceRegistry) {
			throw new Error(`Unknown service: ${service}`);
		}

		if (!serviceRegistry.components.has(component)) {
			throw new Error(`Unknown component: ${component} for service ${service}`);
		}

		const healthCheckKey = `${service}.${component}.${name}`;
		serviceRegistry.healthChecks.set(healthCheckKey, checkFunction);

		logger.debug(`Added health check: ${healthCheckKey}`);
	}

	/**
	 * Start the unified metrics HTTP server
	 */
	async start(): Promise<void> {
		if (this.server) {
			logger.warn('Unified metrics server already started');
			return;
		}

		try {
			this.server = createServer((req, res) => {
				this.handleRequest(req, res).catch((error) => {
					logger.error('Unhandled error in unified metrics request:', ensureError(error));
					this.sendErrorResponse(res, 500, 'Internal server error');
				});
			});

			this.server.timeout = this.config.timeout;

			await new Promise<void>((resolve, reject) => {
				this.server.listen(this.config.port, this.config.host, (error?: Error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			logger.info(`Unified metrics server started`, {
				endpoint: `http://${this.config.host}:${this.config.port}/metrics`,
				services: Array.from(this.serviceRegistries.keys()),
				health_endpoint: `http://${this.config.host}:${this.config.port}/health`,
			});

			this.emit('server_started', {
				host: this.config.host,
				port: this.config.port,
			});
		} catch (error) {
			logger.error('Failed to start unified metrics server:', ensureError(error));
			throw error;
		}
	}

	private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const startTime = performance.now();
		const method = req.method || 'GET';
		const url = new URL(req.url || '/', `http://${req.headers.host}`);
		const path = url.pathname;

		// Rate limiting
		if (this.requestCount >= this.config.maxConcurrentRequests) {
			this.sendErrorResponse(res, 429, 'Too many concurrent requests');
			return;
		}

		this.requestCount++;

		try {
			// CORS handling
			if (this.config.corsEnabled) {
				this.setCorsHeaders(res);
				if (method === 'OPTIONS') {
					res.writeHead(204);
					res.end();
					return;
				}
			}

			// Authentication check
			if (this.config.authToken && !this.isAuthenticated(req)) {
				this.sendErrorResponse(res, 401, 'Unauthorized');
				return;
			}

			const basePath = this.config.basePath;
			const routePath = path.replace(basePath, '').replace(/\/+/g, '/');

			let handled = false;
			let statusCode = 200;

			// Route requests
			if (this.config.enableMetrics && routePath === '/metrics' && method === 'GET') {
				await this.handleMetrics(res);
				handled = true;
			} else if (this.config.enableHealth && routePath === '/health' && method === 'GET') {
				const healthResult = await this.handleHealth(res);
				statusCode = healthResult.overallStatus === 'healthy' ? 200 : 503;
				handled = true;
			} else if (this.config.enableServiceInfo && routePath === '/info' && method === 'GET') {
				await this.handleServiceInfo(res);
				handled = true;
			} else if (routePath === '/ready' && method === 'GET') {
				await this.handleReadiness(res);
				handled = true;
			} else if (routePath === '/services' && method === 'GET') {
				await this.handleServicesInfo(res);
				handled = true;
			}

			if (!handled) {
				this.sendErrorResponse(res, 404, 'Not found', {
					available_endpoints: ['/metrics', '/health', '/info', '/ready', '/services'],
				});
				statusCode = 404;
			}

			// Track metrics
			this.collectorMetrics.requestsTotal.inc({
				method,
				endpoint: routePath,
				status_code: statusCode.toString(),
			});
		} catch (error) {
			logger.error(`Error handling ${method} ${path}:`, ensureError(error));
			this.sendErrorResponse(res, 500, 'Internal server error');
			this.collectorMetrics.errorCount.inc({
				operation: 'handle_request',
				error_type: 'request_error',
				service: 'unified',
			});
		} finally {
			this.requestCount--;
			const duration = performance.now() - startTime;

			this.collectorMetrics.requestDuration.observe(
				{
					method,
					endpoint: path,
					status_code: (res.statusCode || 500).toString(),
				},
				duration,
			);

			// Update circuit breaker state metric
			const cbState = this.circuitBreaker.getState();
			this.collectorMetrics.circuitBreakerState.set(cbState === 'open' ? 1 : cbState === 'half-open' ? 0.5 : 0);
		}
	}

	private async handleMetrics(res: ServerResponse): Promise<void> {
		try {
			await this.circuitBreaker.execute(async () => {
				const metrics = await this.globalRegistry.metrics();

				res.writeHead(200, {
					'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'X-Unified-Services': Array.from(this.serviceRegistries.keys()).join(','),
					'X-Unified-Components': SERVICE_COMPONENTS.length.toString(),
				});
				res.end(metrics);
			});
		} catch (error) {
			logger.error('Error getting unified metrics:', ensureError(error));
			this.collectorMetrics.errorCount.inc({
				operation: 'get_metrics',
				error_type: 'metrics_error',
				service: 'unified',
			});
			this.sendErrorResponse(res, 500, 'Failed to get metrics');
		}
	}

	private async handleHealth(res: ServerResponse): Promise<{ overallStatus: string }> {
		try {
			const healthResults = await this.performHealthChecks();

			const overallStatus = this.determineOverallHealth(healthResults);
			const statusCode = overallStatus === 'healthy' ? 200 : 503;

			const response = {
				status: overallStatus,
				timestamp: new Date().toISOString(),
				collector: 'unified',
				uptime: Date.now() - this.startTime,
				services: healthResults,
				circuit_breaker: {
					state: this.circuitBreaker.getState(),
					failures: this.circuitBreaker.getFailures(),
				},
				server_info: {
					active_requests: this.requestCount,
					registered_services: this.serviceRegistries.size,
					total_components: SERVICE_COMPONENTS.length,
				},
			};

			res.writeHead(statusCode, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
			});
			res.end(JSON.stringify(response, null, 2));

			return { overallStatus };
		} catch (error) {
			logger.error('Error performing health checks:', ensureError(error));
			this.collectorMetrics.errorCount.inc({
				operation: 'health_check',
				error_type: 'health_error',
				service: 'unified',
			});
			this.sendErrorResponse(res, 500, 'Health check failed');
			return { overallStatus: 'unhealthy' };
		}
	}

	private async performHealthChecks(): Promise<ServiceHealthStatus[]> {
		const results: ServiceHealthStatus[] = [];

		for (const [service, registry] of this.serviceRegistries) {
			const serviceHealth: ServiceHealthStatus = {
				service,
				status: 'healthy',
				components: [],
				uptime: Date.now() - this.startTime,
				lastActivity: registry.lastActivity,
			};

			// Check each component's health
			for (const component of registry.components.keys()) {
				const componentChecks: HealthCheckResult[] = [];

				// Run health checks for this component
				for (const [checkKey, checkFunction] of registry.healthChecks) {
					if (checkKey.startsWith(`${service}.${component}.`)) {
						const checkStart = performance.now();
						try {
							const _result = await Promise.race([
								checkFunction(),
								new Promise<HealthCheckResult>((_, reject) =>
									setTimeout(
										() => reject(new Error('Health check timeout')),
										this.config.healthCheckTimeout,
									),
								),
							]);

							const duration = Math.round(performance.now() - checkStart);
							componentChecks.push({
								...result,
								duration_ms: duration,
								timestamp: new Date().toISOString(),
							});

							this.collectorMetrics.healthCheckDuration.observe(
								{
									service,
									component,
									status: result.status,
								},
								duration,
							);
						} catch (error) {
							const duration = Math.round(performance.now() - checkStart);
							componentChecks.push({
								status: 'fail',
								output: ensureError(error).message,
								duration_ms: duration,
								timestamp: new Date().toISOString(),
							});

							this.collectorMetrics.healthCheckDuration.observe(
								{
									service,
									component,
									status: 'fail',
								},
								duration,
							);
						}
					}
				}

				// Determine component status
				const hasFailures = componentChecks.some((check) => check.status === 'fail');
				const hasWarnings = componentChecks.some((check) => check.status === 'warn');

				let componentStatus: 'pass' | 'warn' | 'fail';
				if (hasFailures) {
					componentStatus = 'fail';
				} else if (hasWarnings) {
					componentStatus = 'warn';
				} else {
					componentStatus = 'pass';
				}

				serviceHealth.components.push({
					component,
					status: componentStatus,
					checks: componentChecks,
				});
			}

			// Determine service status
			const hasFailedComponents = serviceHealth.components.some((c) => c.status === 'fail');
			const hasDegradedComponents = serviceHealth.components.some((c) => c.status === 'warn');

			if (hasFailedComponents) {
				serviceHealth.status = 'unhealthy';
			} else if (hasDegradedComponents) {
				serviceHealth.status = 'degraded';
			} else {
				serviceHealth.status = 'healthy';
			}

			results.push(serviceHealth);
		}

		return results;
	}

	private determineOverallHealth(serviceResults: ServiceHealthStatus[]): string {
		const hasUnhealthy = serviceResults.some((s) => s.status === 'unhealthy');
		const hasDegraded = serviceResults.some((s) => s.status === 'degraded');

		if (hasUnhealthy) return 'unhealthy';
		if (hasDegraded) return 'degraded';
		return 'healthy';
	}

	private async handleServiceInfo(res: ServerResponse): Promise<void> {
		const info = {
			collector: 'unified',
			version: process.env.APP_VERSION || 'unknown',
			environment: process.env.NODE_ENV || 'development',
			uptime: Date.now() - this.startTime,
			timestamp: new Date().toISOString(),
			endpoint: `http://${this.config.host}:${this.config.port}/metrics`,
			services: Object.fromEntries(
				Array.from(this.serviceRegistries.entries()).map(([service, registry]) => [
					service,
					{
						components: Array.from(registry.components.keys()),
						lastActivity: registry.lastActivity,
						healthChecks: Array.from(registry.healthChecks.keys()),
					},
				]),
			),
			configuration: {
				host: this.config.host,
				port: this.config.port,
				metricsEnabled: this.config.enableMetrics,
				healthEnabled: this.config.enableHealth,
				corsEnabled: this.config.corsEnabled,
				authRequired: !!this.config.authToken,
				circuitBreakerThreshold: this.config.circuitBreakerThreshold,
			},
			statistics: {
				totalServices: this.serviceRegistries.size,
				totalComponents: SERVICE_COMPONENTS.length,
				activeRequests: this.requestCount,
				circuitBreakerState: this.circuitBreaker.getState(),
				circuitBreakerFailures: this.circuitBreaker.getFailures(),
			},
		};

		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify(info, null, 2));
	}

	private async handleReadiness(res: ServerResponse): Promise<void> {
		const isReady = !this.isShuttingDown && this.circuitBreaker.getState() !== 'open';
		const statusCode = isReady ? 200 : 503;

		const response = {
			status: isReady ? 'ready' : 'not_ready',
			timestamp: new Date().toISOString(),
			shutting_down: this.isShuttingDown,
			circuit_breaker_state: this.circuitBreaker.getState(),
			active_requests: this.requestCount,
			registered_services: this.serviceRegistries.size,
		};

		res.writeHead(statusCode, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify(response, null, 2));
	}

	private async handleServicesInfo(res: ServerResponse): Promise<void> {
		const services = SERVICE_COMPONENTS.reduce(
			(acc, { service, component, description }) => {
				if (!acc[service]) {
					acc[service] = {
						service,
						components: [],
						registered: this.serviceRegistries.has(service),
						lastActivity: this.serviceRegistries.get(service)?.lastActivity || null,
					};
				}
				acc[service].components.push({ component, description });
				return acc;
			},
			{} as Record<string, any>,
		);

		res.writeHead(200, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify({ services: Object.values(services) }, null, 2));
	}

	private setCorsHeaders(res: ServerResponse): void {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		res.setHeader('Access-Control-Max-Age', '86400');
	}

	private isAuthenticated(req: IncomingMessage): boolean {
		if (!this.config.authToken) return true;

		const authHeader = req.headers.authorization;
		if (!authHeader) return false;

		const token = authHeader.replace('Bearer ', '').replace('Token ', '');
		return token === this.config.authToken;
	}

	private sendErrorResponse(res: ServerResponse, statusCode: number, message: string, details?: object): void {
		const errorResponse = {
			error: {
				code: statusCode,
				message,
				timestamp: new Date().toISOString(),
				collector: 'unified',
				...details,
			},
		};

		res.writeHead(statusCode, {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		});
		res.end(JSON.stringify(errorResponse, null, 2));
	}

	/**
	 * Stop the unified metrics server
	 */
	async stop(): Promise<void> {
		if (!this.server) {
			logger.warn('Unified metrics server not started');
			return;
		}

		logger.info('Stopping unified metrics server...');
		this.isShuttingDown = true;

		try {
			// Wait for active requests to complete
			const maxWait = 10000;
			const startTime = Date.now();

			while (this.requestCount > 0 && Date.now() - startTime < maxWait) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			if (this.requestCount > 0) {
				logger.warn(`Forcing unified metrics server shutdown with ${this.requestCount} active requests`);
			}

			await new Promise<void>((resolve, reject) => {
				this.server.close((error?: Error) => {
					if (error) {
						reject(error);
					} else {
						resolve();
					}
				});
			});

			this.server = undefined;
			this.globalRegistry.clear();
			this.serviceRegistries.clear();

			logger.info('Unified metrics server stopped');
			this.emit('server_stopped');
		} catch (error) {
			logger.error('Error stopping unified metrics server:', ensureError(error));
			throw error;
		}
	}

	/**
	 * Get collector statistics
	 */
	getCollectorStats(): object {
		return {
			uptime: Date.now() - this.startTime,
			isRunning: !!this.server,
			isShuttingDown: this.isShuttingDown,
			activeRequests: this.requestCount,
			registeredServices: this.serviceRegistries.size,
			totalComponents: SERVICE_COMPONENTS.length,
			circuitBreaker: {
				state: this.circuitBreaker.getState(),
				failures: this.circuitBreaker.getFailures(),
			},
			endpoint: `http://${this.config.host}:${this.config.port}/metrics`,
			config: this.config,
		};
	}
}

// Global instance management
let globalUnifiedCollector: UnifiedMetricsCollector | undefined;

export function initializeUnifiedMetricsCollector(config?: Partial<UnifiedMetricsConfig>): UnifiedMetricsCollector {
	if (globalUnifiedCollector) {
		logger.warn('Unified metrics collector already initialized, returning existing instance');
		return globalUnifiedCollector;
	}

	globalUnifiedCollector = new UnifiedMetricsCollector(config);
	logger.info('Unified metrics collector initialized');
	return globalUnifiedCollector;
}

export function getUnifiedMetricsCollector(): UnifiedMetricsCollector {
	if (!globalUnifiedCollector) {
		throw new Error('Unified metrics collector not initialized. Call initializeUnifiedMetricsCollector() first.');
	}
	return globalUnifiedCollector;
}

// Export types
export type { UnifiedMetricsConfig, ServiceComponent, HealthCheckResult, ServiceHealthStatus };
