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
    private pool: T[] = [];
    private inUse = new Set<T>();
    private maxSize: number;
    private createResource: () => T;
    private destroyResource: (resource: T) => void;

    constructor(
        maxSize: number,
        createResource: () => T,
        destroyResource: (resource: T) => void
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
}

export interface ChannelActivity {
    channelId: string;
    channelName: string;
    guildId: string;
    messageCount: number;
    userCount: number;
    botMessageCount: number;
    humanMessageCount: number;
    timestamp: number;
}

interface MetricsConfiguration {
    enableCollection: boolean;
    enablePush: boolean;
    pushInterval: number;
    pushGatewayUrl?: string;
    maxBatchSize: number;
    circuitBreakerThreshold: number;
    resourcePoolSize: number;
    enableRuntimeMetrics: boolean;
    defaultLabels: Record<string, string>;
}

export class ProductionMetricsService extends EventEmitter {
    private readonly registry: promClient.Registry;
    private readonly service: string;
    protected readonly config: MetricsConfiguration;
    
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
    private circuitBreaker: CircuitBreaker;
    private resourcePool: ResourcePool<any>;
    private isShuttingDown = false;
    private pendingOperations = 0;
    private channelActivityCache = new Map<string, ChannelActivity>();
    private metricsBuffer: Array<{ timestamp: number; metrics: string }> = [];
    
    constructor(service: string, userConfig?: Partial<MetricsConfiguration>) {
        super();
        
        this.service = service;
        this.config = {
            enableCollection: process.env.ENABLE_METRICS !== 'false',
            enablePush: process.env.ENABLE_METRICS_PUSH === 'true',
            pushInterval: parseInt(process.env.METRICS_PUSH_INTERVAL || '30000'),
            pushGatewayUrl: process.env.PROMETHEUS_PUSHGATEWAY_URL,
            maxBatchSize: parseInt(process.env.METRICS_BATCH_SIZE || '1000'),
            circuitBreakerThreshold: parseInt(process.env.METRICS_CIRCUIT_BREAKER_THRESHOLD || '5'),
            resourcePoolSize: parseInt(process.env.METRICS_RESOURCE_POOL_SIZE || '10'),
            enableRuntimeMetrics: process.env.ENABLE_RUNTIME_METRICS !== 'false',
            defaultLabels: {
                service: this.service,
                environment: process.env.NODE_ENV || 'development',
                version: process.env.APP_VERSION || 'unknown',
                instance: process.env.INSTANCE_ID || process.pid.toString()
            },
            ...userConfig
        };
        
        // Initialize Prometheus registry
        this.registry = new promClient.Registry();
        
        // Add default labels
        this.registry.setDefaultLabels(this.config.defaultLabels);
        
        // Initialize circuit breaker and resource pool
        this.circuitBreaker = new CircuitBreaker(
            this.config.circuitBreakerThreshold,
            60000 // 1 minute timeout
        );
        
        this.resourcePool = new ResourcePool(
            this.config.resourcePoolSize,
            () => ({}), // Simple placeholder objects for HTTP connections
            () => {} // Cleanup is handled by fetch itself
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
            enableCollection: this.config.enableCollection,
            enablePush: this.config.enablePush,
            pushInterval: this.config.pushInterval,
            defaultLabels: this.config.defaultLabels
        });
    }
    
    private initializeMetrics(): void {
        // Message processing metrics
        this.messagesProcessedCounter = new promClient.Counter({
            name: 'discord_messages_processed_total',
            help: 'Total number of Discord messages processed',
            labelNames: ['bot', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.botTriggersCounter = new promClient.Counter({
            name: 'bot_triggers_total',
            help: 'Total number of bot triggers',
            labelNames: ['bot', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.botResponsesCounter = new promClient.Counter({
            name: 'bot_responses_total',
            help: 'Total number of bot responses sent',
            labelNames: ['bot', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.botSkipsCounter = new promClient.Counter({
            name: 'bot_skips_total',
            help: 'Total number of messages skipped by bots',
            labelNames: ['bot', 'reason', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.responseLatencyHistogram = new promClient.Histogram({
            name: 'bot_response_duration_ms',
            help: 'Bot response latency in milliseconds',
            labelNames: ['bot', 'condition', 'user_id', 'user_name', 'channel_id', 'channel_name', 'guild_id'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            registers: [this.registry]
        });
        
        this.circuitBreakerGauge = new promClient.Gauge({
            name: 'circuit_breaker_open',
            help: 'Circuit breaker status (1 = open, 0 = closed)',
            labelNames: ['bot'],
            registers: [this.registry]
        });
        
        this.circuitBreakerActivationsCounter = new promClient.Counter({
            name: 'circuit_breaker_activations_total',
            help: 'Total number of circuit breaker activations',
            labelNames: ['bot', 'reason'],
            registers: [this.registry]
        });
        
        // Channel activity metrics
        this.channelMessagesGauge = new promClient.Gauge({
            name: 'channel_messages_per_minute',
            help: 'Messages per minute in each channel',
            labelNames: ['channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.channelUsersGauge = new promClient.Gauge({
            name: 'channel_active_users',
            help: 'Number of active users in each channel',
            labelNames: ['channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.channelBotRatioGauge = new promClient.Gauge({
            name: 'channel_bot_message_ratio',
            help: 'Ratio of bot messages to total messages',
            labelNames: ['channel_id', 'channel_name', 'guild_id'],
            registers: [this.registry]
        });
        
        this.botInstancesGauge = new promClient.Gauge({
            name: 'bot_instances_loaded',
            help: 'Number of bot instances loaded',
            registers: [this.registry]
        });
        
        // Infrastructure metrics
        this.httpRequestsTotal = new promClient.Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'status_code', 'endpoint'],
            registers: [this.registry]
        });
        
        this.httpRequestDuration = new promClient.Histogram({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'status_code', 'endpoint'],
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry]
        });
        
        this.metricsOperationsTotal = new promClient.Counter({
            name: 'metrics_operations_total',
            help: 'Total number of metrics operations',
            labelNames: ['operation', 'status'],
            registers: [this.registry]
        });
        
        this.metricsErrors = new promClient.Counter({
            name: 'metrics_errors_total',
            help: 'Total number of metrics errors',
            labelNames: ['operation', 'error_type'],
            registers: [this.registry]
        });
        
        this.resourceUtilization = new promClient.Gauge({
            name: 'resource_utilization',
            help: 'Resource utilization metrics',
            labelNames: ['resource_type'],
            registers: [this.registry]
        });
    }
    
    private initializeRuntimeMetrics(): void {
        // Enable default Node.js metrics
        promClient.collectDefaultMetrics({
            register: this.registry,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
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
                { resource_type: 'memory_heap_used' },
                memUsage.heapUsed
            );
            this.resourceUtilization.set(
                { resource_type: 'memory_heap_total' },
                memUsage.heapTotal
            );
            this.resourceUtilization.set(
                { resource_type: 'memory_external' },
                memUsage.external
            );
            this.resourceUtilization.set(
                { resource_type: 'memory_rss' },
                memUsage.rss
            );
            this.resourceUtilization.set(
                { resource_type: 'cpu_user_microseconds' },
                cpuUsage.user
            );
            this.resourceUtilization.set(
                { resource_type: 'cpu_system_microseconds' },
                cpuUsage.system
            );
            
            // Track circuit breaker state
            this.resourceUtilization.set(
                { resource_type: 'circuit_breaker_failures' },
                this.circuitBreaker.getState() === 'open' ? 1 : 0
            );
            
            // Track pending operations
            this.resourceUtilization.set(
                { resource_type: 'pending_operations' },
                this.pendingOperations
            );
            
            // Track buffer size
            this.resourceUtilization.set(
                { resource_type: 'metrics_buffer_size' },
                this.metricsBuffer.length
            );
            
        } catch (error) {
            this.metricsErrors.inc({ operation: 'runtime_collection', error_type: 'collection_error' });
            logger.error('Error collecting runtime metrics:', ensureError(error));
        }
    }
    
    // High-level tracking methods (maintaining API compatibility)
    trackMessageFlow(metrics: MessageFlowMetrics): void {
        if (!this.config.enableCollection) return;
        
        const startTime = performance.now();
        this.pendingOperations++;
        
        try {
            const baseLabels = {
                bot: metrics.botName,
                user_id: metrics.userId,
                user_name: this.sanitizeLabel(metrics.userName),
                channel_id: metrics.channelId,
                channel_name: this.sanitizeLabel(metrics.channelName),
                guild_id: metrics.guildId
            };

            // Track message processed
            this.messagesProcessedCounter.inc(baseLabels);

            if (metrics.triggered) {
                // Bot triggered
                const triggerLabels = {
                    ...baseLabels,
                    condition: metrics.conditionName || 'unknown'
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
                    reason: metrics.skipReason || 'unknown',
                    condition: metrics.conditionName || 'unknown'
                };
                this.botSkipsCounter.inc(skipLabels);
            }

            // Circuit breaker status
            if (metrics.circuitBreakerOpen !== undefined) {
                this.circuitBreakerGauge.set(
                    { bot: metrics.botName },
                    metrics.circuitBreakerOpen ? 1 : 0
                );
            }
            
            this.metricsOperationsTotal.inc({ operation: 'track_message_flow', status: 'success' });
            this.emit('message_flow_tracked', metrics);
            
        } catch (error) {
            this.metricsErrors.inc({ operation: 'track_message_flow', error_type: 'processing_error' });
            logger.error('Error tracking message flow:', ensureError(error));
        } finally {
            this.pendingOperations--;
            const duration = performance.now() - startTime;
            if (duration > 10) { // Log slow operations
                logger.warn(`Slow message flow tracking: ${duration}ms`);
            }
        }
    }
    
    trackChannelActivity(activity: ChannelActivity): void {
        if (!this.config.enableCollection) return;
        
        const startTime = performance.now();
        this.pendingOperations++;
        
        try {
            const labels = {
                channel_id: activity.channelId,
                channel_name: this.sanitizeLabel(activity.channelName),
                guild_id: activity.guildId
            };

            this.channelMessagesGauge.set(labels, activity.messageCount);
            this.channelUsersGauge.set(labels, activity.userCount);
            
            const botRatio = activity.messageCount > 0 ? 
                activity.botMessageCount / activity.messageCount : 0;
            this.channelBotRatioGauge.set(labels, botRatio);

            // Cache for aggregation
            this.channelActivityCache.set(activity.channelId, activity);
            
            this.metricsOperationsTotal.inc({ operation: 'track_channel_activity', status: 'success' });
            this.emit('channel_activity_tracked', activity);
            
        } catch (error) {
            this.metricsErrors.inc({ operation: 'track_channel_activity', error_type: 'processing_error' });
            logger.error('Error tracking channel activity:', ensureError(error));
        } finally {
            this.pendingOperations--;
            const duration = performance.now() - startTime;
            if (duration > 10) { // Log slow operations
                logger.warn(`Slow channel activity tracking: ${duration}ms`);
            }
        }
    }
    
    trackCircuitBreakerActivation(botName: string, reason: string): void {
        if (!this.config.enableCollection) return;
        
        try {
            this.circuitBreakerActivationsCounter.inc({
                bot: botName,
                reason: this.sanitizeLabel(reason)
            });

            this.circuitBreakerGauge.set({ bot: botName }, 1);
            
            this.metricsOperationsTotal.inc({ operation: 'track_circuit_breaker', status: 'success' });
            this.emit('circuit_breaker_tracked', { botName, reason });
            
        } catch (error) {
            this.metricsErrors.inc({ operation: 'track_circuit_breaker', error_type: 'processing_error' });
            logger.error('Error tracking circuit breaker:', ensureError(error));
        }
    }
    
    trackBotInstances(count: number): void {
        if (!this.config.enableCollection) return;
        
        try {
            this.botInstancesGauge.set(count);
            this.metricsOperationsTotal.inc({ operation: 'track_bot_instances', status: 'success' });
        } catch (error) {
            this.metricsErrors.inc({ operation: 'track_bot_instances', error_type: 'processing_error' });
            logger.error('Error tracking bot instances:', ensureError(error));
        }
    }
    
    // HTTP request tracking
    trackHttpRequest(method: string, endpoint: string, statusCode: number, duration: number): void {
        if (!this.config.enableCollection) return;
        
        try {
            const labels = {
                method: method.toUpperCase(),
                status_code: statusCode.toString(),
                endpoint: this.sanitizeLabel(endpoint)
            };
            
            this.httpRequestsTotal.inc(labels);
            this.httpRequestDuration.observe(labels, duration / 1000); // Convert to seconds
            
        } catch (error) {
            this.metricsErrors.inc({ operation: 'track_http_request', error_type: 'processing_error' });
            logger.error('Error tracking HTTP request:', ensureError(error));
        }
    }
    
    // Get metrics in Prometheus format
    async getPrometheusMetrics(): Promise<string> {
        try {
            const metrics = await this.registry.metrics();
            return metrics;
        } catch (error) {
            this.metricsErrors.inc({ operation: 'get_prometheus_metrics', error_type: 'export_error' });
            logger.error('Error getting Prometheus metrics:', ensureError(error));
            throw error;
        }
    }
    
    // Get metrics summary for health checks
    getMetricsSummary(): object {
        try {
            const metrics = this.registry.getMetricsAsArray();
            const summary: Record<string, any> = {};
            
            for (const metric of metrics) {
                try {
                    const values = (metric as any).get();
                    if (values && values.values && values.values.length > 0) {
                        summary[metric.name] = {
                            type: values.type,
                            help: values.help,
                            values: values.values.length
                        };
                    }
                } catch (error) {
                    // Skip metrics that can't be serialized
                    logger.debug(`Skipping metric ${metric.name} in summary:`, error);
                }
            }
            
            return {
                service: this.service,
                metricsCount: metrics.length,
                circuitBreakerState: this.circuitBreaker.getState(),
                pendingOperations: this.pendingOperations,
                bufferSize: this.metricsBuffer.length,
                config: {
                    enableCollection: this.config.enableCollection,
                    enablePush: this.config.enablePush,
                    pushInterval: this.config.pushInterval
                },
                metrics: summary
            };
        } catch (error) {
            this.metricsErrors.inc({ operation: 'get_metrics_summary', error_type: 'export_error' });
            logger.error('Error getting metrics summary:', ensureError(error));
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
                this.pushMetrics().catch(error => {
                    this.metricsErrors.inc({ operation: 'push_metrics', error_type: 'push_error' });
                    logger.error('Failed to push metrics:', ensureError(error));
                });
            }
        }, this.config.pushInterval);

        logger.info(`Metrics push started with ${this.config.pushInterval}ms interval to ${this.config.pushGatewayUrl}`);
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
                        timestamp: Date.now(),
                        metrics
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
            this.metricsOperationsTotal.inc({ operation: 'push_metrics', status: 'success' });
            
            if (duration > 1000) { // Log slow pushes
                logger.warn(`Slow metrics push: ${duration}ms`);
            }
            
        } catch (error) {
            this.metricsErrors.inc({ operation: 'push_metrics', error_type: 'circuit_breaker_error' });
            logger.debug('Metrics push blocked by circuit breaker or failed:', ensureError(error));
        }
    }
    
    private async flushMetricsBuffer(): Promise<void> {
        if (this.metricsBuffer.length === 0) return;
        
        const buffer = [...this.metricsBuffer];
        this.metricsBuffer = [];
        
        try {
            for (const entry of buffer) {
                const response = await fetch(
                    `${this.config.pushGatewayUrl}/metrics/job/${this.service}`, 
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'text/plain; version=0.0.4',
                        },
                        body: entry.metrics,
                        timeout: 10000 // 10 second timeout
                    }
                );

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
        // Sanitize label values to comply with Prometheus requirements
        return value
            .replace(/[^\w\-\.]/g, '_')
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
            
            while (this.pendingOperations > 0 && (Date.now() - startTime) < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
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
                    logger.error('Failed to flush final metrics buffer:', ensureError(error));
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
            logger.error('Error during metrics service shutdown:', ensureError(error));
            throw error;
        }
    }
    
    // Health check method
    getHealthStatus(): object {
        return {
            service: this.service,
            status: this.isShuttingDown ? 'shutting_down' : 'healthy',
            circuitBreakerState: this.circuitBreaker.getState(),
            pendingOperations: this.pendingOperations,
            bufferSize: this.metricsBuffer.length,
            metricsEnabled: this.config.enableCollection,
            pushEnabled: this.config.enablePush,
            runtimeMetricsEnabled: this.config.enableRuntimeMetrics,
            lastError: null, // Could track last error timestamp
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            defaultLabels: this.config.defaultLabels
        };
    }
}

// Maintain backward compatibility by extending the existing interface
export class MetricsService extends ProductionMetricsService {
    // Legacy methods for backward compatibility
    incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
        logger.warn('MetricsService.incrementCounter is deprecated. Use specific tracking methods instead.');
    }
    
    setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        logger.warn('MetricsService.setGauge is deprecated. Use specific tracking methods instead.');
    }
    
    observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
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
let globalMetricsService: ProductionMetricsService | undefined;

export function initializeMetrics(service: string, config?: Partial<MetricsConfiguration>): ProductionMetricsService {
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