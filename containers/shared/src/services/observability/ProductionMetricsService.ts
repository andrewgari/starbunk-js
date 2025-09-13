import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import fetch from 'node-fetch';
import * as promClient from 'prom-client';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

// Circuit breaker for metrics push operations
class CircuitBreaker {
	private failures = 0;
	private lastFailureTime = 0;
	private state: 'closed' | 'open' | 'half-open' = 'closed'; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly threshold: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly timeout: number; // eslint-disable-line @typescript-eslint/no-unused-vars

	constructor(threshold = 5, timeout = 60000) {
		this.threshold = threshold;
		this.timeout = timeout;
	}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (this.state === 'open') {
			if (Date.now() - this.lastFailureTime > this.timeout) {
				this.state = 'half-open';
				logger.info('Circuit breaker transitioning to half-open');
			} else {
				throw new Error('Circuit breaker is open - operation blocked');
			}
		}

		try {
			const result = await operation();
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
			logger.info('Circuit breaker closed after successful operation');
		}
	}

	private onFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.threshold) {
			this.state = 'open';
			logger.warn(`Circuit breaker opened after ${this.failures} failures`);
		}
	}

	getState(): string {
		return this.state;
	}
}

// Resource pool for HTTP requests
class ResourcePool<T> {
	private pool: T[] = []; // eslint-disable-line @typescript-eslint/no-unused-vars
	private inUse = new Set<T>();
	private maxSize: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	private createResource: () => T; // eslint-disable-line @typescript-eslint/no-unused-vars
	private destroyResource: (resource: T) => void; // eslint-disable-line @typescript-eslint/no-unused-vars

	constructor(
		maxSize: number, // eslint-disable-line @typescript-eslint/no-unused-vars
		createResource: () => T, // eslint-disable-line @typescript-eslint/no-unused-vars
		destroyResource: (resource: T) => void, // eslint-disable-line @typescript-eslint/no-unused-vars
	) {
		this.maxSize = maxSize;
		this.createResource = createResource;
		this.destroyResource = destroyResource;
	}

	acquire(): T {
		let resource = this.pool.pop();
		if (!resource && this.inUse.size < this.maxSize) {
			resource = this.createResource();
		}

		if (resource) {
			this.inUse.add(resource);
		}

		return resource!;
	}

	release(resource: T): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (this.inUse.has(resource)) {
			this.inUse.delete(resource);
			this.pool.push(resource);
		}
	}

	cleanup(): void {
		for (const resource of this.pool) {
			this.destroyResource(resource);
		}
		this.pool = [];

		for (const resource of this.inUse) {
			this.destroyResource(resource);
		}
		this.inUse.clear();
	}
}

// Re-export interfaces for backward compatibility
export interface MessageFlowMetrics {
	botName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	conditionName?: string;
	messageText: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	userId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	userName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channelId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channelName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	triggered: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	responseText?: string;
	responseLatency?: number;
	skipReason?: string;
	percentageChance?: number;
	circuitBreakerOpen?: boolean;
	timestamp: number; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export interface ChannelActivity {
	channelId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channelName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	messageCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	userCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	botMessageCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	humanMessageCount: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	timestamp: number; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface MetricsConfiguration {
	enableCollection: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	enablePush: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	pushInterval: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	pushGatewayUrl?: string;
	maxBatchSize: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	circuitBreakerThreshold: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	resourcePoolSize: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	enableRuntimeMetrics: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars
	defaultLabels: Record<string, string>; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export class ProductionMetricsService extends EventEmitter {
	private readonly registry: promClient.Registry; // eslint-disable-line @typescript-eslint/no-unused-vars
	private readonly service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	protected readonly config: MetricsConfiguration; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Core metrics - initialized in constructor
	private messagesProcessedCounter!: promClient.Counter<string>;
	private botTriggersCounter!: promClient.Counter<string>;
	private botResponsesCounter!: promClient.Counter<string>;
	private botSkipsCounter!: promClient.Counter<string>;
	private responseLatencyHistogram!: promClient.Histogram<string>;
	private circuitBreakerGauge!: promClient.Gauge<string>;
	private circuitBreakerActivationsCounter!: promClient.Counter<string>;
	private channelMessagesGauge!: promClient.Gauge<string>;
	private channelUsersGauge!: promClient.Gauge<string>;
	private channelBotRatioGauge!: promClient.Gauge<string>;
	private botInstancesGauge!: promClient.Gauge<string>;

	// Infrastructure metrics - initialized in constructor
	private httpRequestsTotal!: promClient.Counter<string>;
	private httpRequestDuration!: promClient.Histogram<string>;
	private metricsOperationsTotal!: promClient.Counter<string>;
	private metricsErrors!: promClient.Counter<string>;
	private resourceUtilization!: promClient.Gauge<string>;

	// Internal state
	private pushInterval?: NodeJS.Timeout;
	private runtimeMetricsInterval?: NodeJS.Timeout;
	private circuitBreaker: CircuitBreaker; // eslint-disable-line @typescript-eslint/no-unused-vars
	private resourcePool: ResourcePool<any>; // eslint-disable-line @typescript-eslint/no-unused-vars
	private isShuttingDown = false;
	private pendingOperations = 0;
	private channelActivityCache = new Map<string, ChannelActivity>();
	private metricsBuffer: Array<{ timestamp: number; metrics: string }> = []; // eslint-disable-line @typescript-eslint/no-unused-vars

	constructor(service: string, userConfig?: Partial<MetricsConfiguration>) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		super();

		this.service = service;
		this.config = {
			enableCollection: process.env.ENABLE_METRICS !== 'false', // eslint-disable-line @typescript-eslint/no-unused-vars
			enablePush: process.env.ENABLE_METRICS_PUSH === 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
			pushInterval: parseInt(process.env.METRICS_PUSH_INTERVAL || '30000'), // eslint-disable-line @typescript-eslint/no-unused-vars
			pushGatewayUrl: process.env.PROMETHEUS_PUSHGATEWAY_URL, // eslint-disable-line @typescript-eslint/no-unused-vars
			maxBatchSize: parseInt(process.env.METRICS_BATCH_SIZE || '1000'), // eslint-disable-line @typescript-eslint/no-unused-vars
			circuitBreakerThreshold: parseInt(process.env.METRICS_CIRCUIT_BREAKER_THRESHOLD || '5'), // eslint-disable-line @typescript-eslint/no-unused-vars
			resourcePoolSize: parseInt(process.env.METRICS_RESOURCE_POOL_SIZE || '10'), // eslint-disable-line @typescript-eslint/no-unused-vars
			enableRuntimeMetrics: process.env.ENABLE_RUNTIME_METRICS !== 'false', // eslint-disable-line @typescript-eslint/no-unused-vars
			defaultLabels: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				environment: process.env.NODE_ENV || 'development', // eslint-disable-line @typescript-eslint/no-unused-vars
				version: process.env.APP_VERSION || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
				instance: process.env.INSTANCE_ID || process.pid.toString(), // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			...userConfig,
		};

		// Initialize Prometheus registry
		this.registry = new promClient.Registry();

		// Add default labels
		this.registry.setDefaultLabels(this.config.defaultLabels);

		// Initialize circuit breaker and resource pool
		this.circuitBreaker = new CircuitBreaker(
			this.config.circuitBreakerThreshold,
			60000, // 1 minute timeout
		);

		this.resourcePool = new ResourcePool(
			this.config.resourcePoolSize,
			() => ({}), // Simple placeholder objects for HTTP connections
			() => {}, // Cleanup is handled by fetch itself
		);

		// Initialize metrics
		this.initializeMetrics();

		// Set up runtime collection
		if (this.config.enableRuntimeMetrics) {
			this.initializeRuntimeMetrics();
		}

		// Set up push mechanism
		if (this.config.enablePush && this.config.pushGatewayUrl) {
			this.startMetricsPush();
		}

		// Set up graceful shutdown
		this.setupGracefulShutdown();

		logger.info(`Production metrics service initialized for ${service}`, {
			enableCollection: this.config.enableCollection, // eslint-disable-line @typescript-eslint/no-unused-vars
			enablePush: this.config.enablePush, // eslint-disable-line @typescript-eslint/no-unused-vars
			pushInterval: this.config.pushInterval, // eslint-disable-line @typescript-eslint/no-unused-vars
			defaultLabels: this.config.defaultLabels, // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	private initializeMetrics(): void {
		// Message processing metrics
		this.messagesProcessedCounter = new promClient.Counter({
			name: 'discord_messages_processed_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of Discord messages processed', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botTriggersCounter = new promClient.Counter({
			name: 'bot_triggers_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of bot triggers', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botResponsesCounter = new promClient.Counter({
			name: 'bot_responses_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of bot responses sent', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botSkipsCounter = new promClient.Counter({
			name: 'bot_skips_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of messages skipped by bots', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: [
				'bot',
				'reason',
				'condition',
				'user_id',
				'user_name',
				'channel_id',
				'channel_name',
				'guild_id',
			], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.responseLatencyHistogram = new promClient.Histogram({
			name: 'bot_response_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Bot response latency in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.circuitBreakerGauge = new promClient.Gauge({
			name: 'circuit_breaker_open', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Circuit breaker status (1 = open, 0 = closed)', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.circuitBreakerActivationsCounter = new promClient.Counter({
			name: 'circuit_breaker_activations_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of circuit breaker activations', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot', 'reason'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Channel activity metrics
		this.channelMessagesGauge = new promClient.Gauge({
			name: 'channel_messages_per_minute', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Messages per minute in each channel', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.channelUsersGauge = new promClient.Gauge({
			name: 'channel_active_users', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of active users in each channel', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.channelBotRatioGauge = new promClient.Gauge({
			name: 'channel_bot_message_ratio', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Ratio of bot messages to total messages', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['channel_id', 'channel_name', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botInstancesGauge = new promClient.Gauge({
			name: 'bot_instances_loaded', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of bot instances loaded', // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Infrastructure metrics
		this.httpRequestsTotal = new promClient.Counter({
			name: 'http_requests_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of HTTP requests', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['method', 'status_code', 'endpoint'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.httpRequestDuration = new promClient.Histogram({
			name: 'http_request_duration_seconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'HTTP request duration in seconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['method', 'status_code', 'endpoint'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.metricsOperationsTotal = new promClient.Counter({
			name: 'metrics_operations_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of metrics operations', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['operation', 'status'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.metricsErrors = new promClient.Counter({
			name: 'metrics_errors_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of metrics errors', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['operation', 'error_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.resourceUtilization = new promClient.Gauge({
			name: 'resource_utilization', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Resource utilization metrics', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['resource_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	private initializeRuntimeMetrics(): void {
		// Enable default Node.js metrics
		promClient.collectDefaultMetrics({
			register: this.registry, // eslint-disable-line @typescript-eslint/no-unused-vars
			gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Custom runtime metrics collection
		this.runtimeMetricsInterval = setInterval(() => {
			this.collectRuntimeMetrics();
		}, 15000); // Every 15 seconds
	}

	protected collectRuntimeMetrics(): void {
		try {
			const memUsage = process.memoryUsage();
			const cpuUsage = process.cpuUsage();

			this.resourceUtilization.set(
				{ resource_type: 'memory_heap_used' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				memUsage.heapUsed,
			);
			this.resourceUtilization.set(
				{ resource_type: 'memory_heap_total' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				memUsage.heapTotal,
			);
			this.resourceUtilization.set(
				{ resource_type: 'memory_external' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				memUsage.external,
			);
			this.resourceUtilization.set(
				{ resource_type: 'memory_rss' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				memUsage.rss,
			);
			this.resourceUtilization.set(
				{ resource_type: 'cpu_user_microseconds' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				cpuUsage.user,
			);
			this.resourceUtilization.set(
				{ resource_type: 'cpu_system_microseconds' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				cpuUsage.system,
			);

			// Track circuit breaker state
			this.resourceUtilization.set(
				{ resource_type: 'circuit_breaker_failures' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				this.circuitBreaker.getState() === 'open' ? 1 : 0,
			);

			// Track pending operations
			this.resourceUtilization.set(
				{ resource_type: 'pending_operations' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				this.pendingOperations,
			);

			// Track buffer size
			this.resourceUtilization.set(
				{ resource_type: 'metrics_buffer_size' }, // eslint-disable-line @typescript-eslint/no-unused-vars
				this.metricsBuffer.length,
			);
		} catch (error) {
			this.metricsErrors.inc({ operation: 'runtime_collection', error_type: 'collection_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error collecting runtime metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// High-level tracking methods (maintaining API compatibility)
	trackMessageFlow(metrics: MessageFlowMetrics): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (!this.config.enableCollection) return;

		const startTime = performance.now();
		this.pendingOperations++;

		try {
			const baseLabels = {
				bot: metrics.botName, // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: metrics.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
				user_name: this.sanitizeLabel(metrics.userName), // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_id: metrics.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_name: this.sanitizeLabel(metrics.channelName), // eslint-disable-line @typescript-eslint/no-unused-vars
				guild_id: metrics.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			// Track message processed
			this.messagesProcessedCounter.inc(baseLabels);

			if (metrics.triggered) {
				// Bot triggered
				const triggerLabels = {
					...baseLabels,
					condition: metrics.conditionName || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
				};

				this.botTriggersCounter.inc(triggerLabels);

				if (metrics.responseText) {
					this.botResponsesCounter.inc(triggerLabels);
				}

				if (metrics.responseLatency) {
					this.responseLatencyHistogram.observe(triggerLabels, metrics.responseLatency);
				}
			} else {
				// Bot skipped
				const skipLabels = {
					...baseLabels,
					reason: metrics.skipReason || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
					condition: metrics.conditionName || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
				};
				this.botSkipsCounter.inc(skipLabels);
			}

			// Circuit breaker status
			if (metrics.circuitBreakerOpen !== undefined) {
				this.circuitBreakerGauge.set(
					{ bot: metrics.botName }, // eslint-disable-line @typescript-eslint/no-unused-vars
					metrics.circuitBreakerOpen ? 1 : 0,
				);
			}

			this.metricsOperationsTotal.inc({ operation: 'track_message_flow', status: 'success' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.emit('message_flow_tracked', metrics);
		} catch (error) {
			this.metricsErrors.inc({ operation: 'track_message_flow', error_type: 'processing_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error tracking message flow:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		} finally {
			this.pendingOperations--;
			const duration = performance.now() - startTime;
			if (duration > 10) {
				// Log slow operations
				logger.warn(`Slow message flow tracking: ${duration}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		}
	}

	trackChannelActivity(activity: ChannelActivity): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (!this.config.enableCollection) return;

		const startTime = performance.now();
		this.pendingOperations++;

		try {
			const labels = {
				channel_id: activity.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_name: this.sanitizeLabel(activity.channelName), // eslint-disable-line @typescript-eslint/no-unused-vars
				guild_id: activity.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			this.channelMessagesGauge.set(labels, activity.messageCount);
			this.channelUsersGauge.set(labels, activity.userCount);

			const botRatio = activity.messageCount > 0 ? activity.botMessageCount / activity.messageCount : 0;
			this.channelBotRatioGauge.set(labels, botRatio);

			// Cache for aggregation
			this.channelActivityCache.set(activity.channelId, activity);

			this.metricsOperationsTotal.inc({ operation: 'track_channel_activity', status: 'success' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.emit('channel_activity_tracked', activity);
		} catch (error) {
			this.metricsErrors.inc({ operation: 'track_channel_activity', error_type: 'processing_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error tracking channel activity:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		} finally {
			this.pendingOperations--;
			const duration = performance.now() - startTime;
			if (duration > 10) {
				// Log slow operations
				logger.warn(`Slow channel activity tracking: ${duration}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		}
	}

	trackCircuitBreakerActivation(botName: string, reason: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (!this.config.enableCollection) return;

		try {
			this.circuitBreakerActivationsCounter.inc({
				bot: botName, // eslint-disable-line @typescript-eslint/no-unused-vars
				reason: this.sanitizeLabel(reason), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.circuitBreakerGauge.set({ bot: botName }, 1); // eslint-disable-line @typescript-eslint/no-unused-vars

			this.metricsOperationsTotal.inc({ operation: 'track_circuit_breaker', status: 'success' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			this.emit('circuit_breaker_tracked', { botName, reason });
		} catch (error) {
			this.metricsErrors.inc({ operation: 'track_circuit_breaker', error_type: 'processing_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error tracking circuit breaker:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackBotInstances(count: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (!this.config.enableCollection) return;

		try {
			this.botInstancesGauge.set(count);
			this.metricsOperationsTotal.inc({ operation: 'track_bot_instances', status: 'success' }); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			this.metricsErrors.inc({ operation: 'track_bot_instances', error_type: 'processing_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error tracking bot instances:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// HTTP request tracking
	trackHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (!this.config.enableCollection) return;

		try {
			const labels = {
				method: method.toUpperCase(), // eslint-disable-line @typescript-eslint/no-unused-vars
				status_code: statusCode.toString(), // eslint-disable-line @typescript-eslint/no-unused-vars
				endpoint: this.sanitizeLabel(endpoint), // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			this.httpRequestsTotal.inc(labels);
			this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
		} catch (error) {
			this.metricsErrors.inc({ operation: 'track_http_request', error_type: 'processing_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error tracking HTTP request:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// Get metrics in Prometheus format
	async getPrometheusMetrics(): Promise<string> {
		try {
			const metrics = await this.registry.metrics();
			return metrics;
		} catch (error) {
			this.metricsErrors.inc({ operation: 'get_prometheus_metrics', error_type: 'export_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error getting Prometheus metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}

	// Get metrics summary for health checks
	getMetricsSummary(): object {
		try {
			const metrics = this.registry.getMetricsAsArray();
			const summary: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

			for (const metric of metrics) {
				try {
					const values = (metric as any).get();
					if (values && values.values && values.values.length > 0) {
						summary[metric.name] = {
							type: values.type, // eslint-disable-line @typescript-eslint/no-unused-vars
							help: values.help, // eslint-disable-line @typescript-eslint/no-unused-vars
							values: values.values.length, // eslint-disable-line @typescript-eslint/no-unused-vars
						};
					}
				} catch (error) {
					// Skip metrics that can't be serialized
					logger.debug(`Skipping metric ${metric.name} in summary:`, error); // eslint-disable-line @typescript-eslint/no-unused-vars
				}
			}

			return {
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				metricsCount: metrics.length, // eslint-disable-line @typescript-eslint/no-unused-vars
				circuitBreakerState: this.circuitBreaker.getState(), // eslint-disable-line @typescript-eslint/no-unused-vars
				pendingOperations: this.pendingOperations, // eslint-disable-line @typescript-eslint/no-unused-vars
				bufferSize: this.metricsBuffer.length, // eslint-disable-line @typescript-eslint/no-unused-vars
				config: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					enableCollection: this.config.enableCollection, // eslint-disable-line @typescript-eslint/no-unused-vars
					enablePush: this.config.enablePush, // eslint-disable-line @typescript-eslint/no-unused-vars
					pushInterval: this.config.pushInterval, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				metrics: summary, // eslint-disable-line @typescript-eslint/no-unused-vars
			};
		} catch (error) {
			this.metricsErrors.inc({ operation: 'get_metrics_summary', error_type: 'export_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.error('Error getting metrics summary:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}

	private startMetricsPush(): void {
		if (!this.config.pushGatewayUrl) {
			logger.warn('Push gateway URL not configured, skipping metrics push setup');
			return;
		}

		this.pushInterval = setInterval(() => {
			if (!this.isShuttingDown) {
				this.pushMetrics().catch((error) => {
					this.metricsErrors.inc({ operation: 'push_metrics', error_type: 'push_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
					logger.error('Failed to push metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
				});
			}
		}, this.config.pushInterval);

		logger.info(
			`Metrics push started with ${this.config.pushInterval}ms interval to ${this.config.pushGatewayUrl}`,
		);
	}

	private async pushMetrics(): Promise<void> {
		const startTime = performance.now();

		try {
			await this.circuitBreaker.execute(async () => {
				const resource = this.resourcePool.acquire();

				try {
					const metrics = await this.getPrometheusMetrics();

					// Add to buffer for batch processing
					this.metricsBuffer.push({
						timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
						metrics,
					});

					// Process buffer if it's getting large or on interval
					if (this.metricsBuffer.length >= this.config.maxBatchSize) {
						await this.flushMetricsBuffer();
					}
				} finally {
					this.resourcePool.release(resource);
				}
			});

			const duration = performance.now() - startTime;
			this.metricsOperationsTotal.inc({ operation: 'push_metrics', status: 'success' }); // eslint-disable-line @typescript-eslint/no-unused-vars

			if (duration > 1000) {
				// Log slow pushes
				logger.warn(`Slow metrics push: ${duration}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		} catch (error) {
			this.metricsErrors.inc({ operation: 'push_metrics', error_type: 'circuit_breaker_error' }); // eslint-disable-line @typescript-eslint/no-unused-vars
			logger.debug('Metrics push blocked by circuit breaker or failed:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	private async flushMetricsBuffer(): Promise<void> {
		if (this.metricsBuffer.length === 0) return;

		const buffer = [...this.metricsBuffer];
		this.metricsBuffer = [];

		try {
			for (const entry of buffer) {
				const response = await fetch(`${this.config.pushGatewayUrl}/metrics/job/${this.service}`, {
					method: 'POST', // eslint-disable-line @typescript-eslint/no-unused-vars
					headers: {
						// eslint-disable-line @typescript-eslint/no-unused-vars
						'Content-Type': 'text/plain; version=0.0.4',
					},
					body: entry.metrics, // eslint-disable-line @typescript-eslint/no-unused-vars
					timeout: 10000, // 10 second timeout // eslint-disable-line @typescript-eslint/no-unused-vars
				});

				if (!response.ok) {
					throw new Error(`Push gateway responded with ${response.status}: ${response.statusText}`);
				}
			}

			logger.debug(`Flushed ${buffer.length} metric entries to push gateway`);
		} catch (error) {
			// Put failed metrics back in buffer for retry
			this.metricsBuffer.unshift(...buffer);
			throw error;
		}
	}

	private sanitizeLabel(value: string): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Sanitize label values to comply with Prometheus requirements
		return value
			.replace(/[^\w\-.]/g, '_')
			.substring(0, 100) // Limit length
			.toLowerCase();
	}

	private setupGracefulShutdown(): void {
		const shutdownHandler = async () => {
			logger.info('Starting graceful metrics service shutdown...');
			await this.shutdown();
		};

		process.on('SIGINT', shutdownHandler);
		process.on('SIGTERM', shutdownHandler);
		process.on('beforeExit', shutdownHandler);
	}

	async shutdown(): Promise<void> {
		if (this.isShuttingDown) return;

		this.isShuttingDown = true;
		logger.info('Shutting down production metrics service...');

		try {
			// Stop intervals
			if (this.pushInterval) {
				clearInterval(this.pushInterval);
				this.pushInterval = undefined;
			}

			if (this.runtimeMetricsInterval) {
				clearInterval(this.runtimeMetricsInterval);
				this.runtimeMetricsInterval = undefined;
			}

			// Wait for pending operations to complete (with timeout)
			const maxWait = 10000; // 10 seconds
			const startTime = Date.now();

			while (this.pendingOperations > 0 && Date.now() - startTime < maxWait) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			if (this.pendingOperations > 0) {
				logger.warn(`Forcing shutdown with ${this.pendingOperations} pending operations`);
			}

			// Final metrics flush
			if (this.metricsBuffer.length > 0 && this.config.pushGatewayUrl) {
				try {
					await this.flushMetricsBuffer();
					logger.info('Final metrics buffer flushed');
				} catch (error) {
					logger.error('Failed to flush final metrics buffer:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
				}
			}

			// Cleanup resources
			this.resourcePool.cleanup();
			this.channelActivityCache.clear();
			this.metricsBuffer = [];

			// Clear registry
			this.registry.clear();

			logger.info('Production metrics service shutdown complete');
			this.emit('shutdown');
		} catch (error) {
			logger.error('Error during metrics service shutdown:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}

	// Health check method
	getHealthStatus(): object {
		return {
			service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
			status: this.isShuttingDown ? 'shutting_down' : 'healthy', // eslint-disable-line @typescript-eslint/no-unused-vars
			circuitBreakerState: this.circuitBreaker.getState(), // eslint-disable-line @typescript-eslint/no-unused-vars
			pendingOperations: this.pendingOperations, // eslint-disable-line @typescript-eslint/no-unused-vars
			bufferSize: this.metricsBuffer.length, // eslint-disable-line @typescript-eslint/no-unused-vars
			metricsEnabled: this.config.enableCollection, // eslint-disable-line @typescript-eslint/no-unused-vars
			pushEnabled: this.config.enablePush, // eslint-disable-line @typescript-eslint/no-unused-vars
			runtimeMetricsEnabled: this.config.enableRuntimeMetrics, // eslint-disable-line @typescript-eslint/no-unused-vars
			lastError: null, // Could track last error timestamp // eslint-disable-line @typescript-eslint/no-unused-vars
			uptime: process.uptime(), // eslint-disable-line @typescript-eslint/no-unused-vars
			memoryUsage: process.memoryUsage(), // eslint-disable-line @typescript-eslint/no-unused-vars
			defaultLabels: this.config.defaultLabels, // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}
}

// Maintain backward compatibility by extending the existing interface
export class MetricsService extends ProductionMetricsService {
	// Legacy methods for backward compatibility
	incrementCounter(name: string, _labels: Record<string, string> = {}, _value: number = 1): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		logger.warn('MetricsService.incrementCounter is deprecated. Use specific tracking methods instead.');
	}

	setGauge(name: string, _value: number, _labels: Record<string, string> = {}): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		logger.warn('MetricsService.setGauge is deprecated. Use specific tracking methods instead.');
	}

	observeHistogram(name: string, _value: number, _labels: Record<string, string> = {}): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		logger.warn('MetricsService.observeHistogram is deprecated. Use specific tracking methods instead.');
	}

	trackSystemMetrics(): void {
		// This is now handled automatically by runtime metrics collection
		if (this.getConfig().enableRuntimeMetrics) {
			this.collectRuntimeMetricsPublic();
		}
	}

	// Make config accessible for legacy compatibility
	getConfig(): MetricsConfiguration {
		return this.config;
	}

	// Public wrapper for runtime metrics collection
	collectRuntimeMetricsPublic(): void {
		this.collectRuntimeMetrics();
	}
}

// Global instance management
let globalMetricsService: ProductionMetricsService | undefined; // eslint-disable-line @typescript-eslint/no-unused-vars

export function initializeMetrics(service: string, config?: Partial<MetricsConfiguration>): ProductionMetricsService {
	// eslint-disable-line @typescript-eslint/no-unused-vars
	if (globalMetricsService) {
		logger.warn('Metrics service already initialized, returning existing instance');
		return globalMetricsService;
	}

	globalMetricsService = new ProductionMetricsService(service, config);
	logger.info(`Production metrics service initialized for ${service}`);
	return globalMetricsService;
}

export function getMetrics(): ProductionMetricsService {
	if (!globalMetricsService) {
		throw new Error('Metrics service not initialized. Call initializeMetrics() first.');
	}
	return globalMetricsService;
}

// Export types for external use
export type { MetricsConfiguration };
