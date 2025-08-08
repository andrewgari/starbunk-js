import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import fetch from 'node-fetch';

// Prometheus-style metrics registry
interface MetricValue {
    value: number;
    labels: Record<string, string>;
    timestamp: number;
}

interface CounterMetric {
    name: string;
    help: string;
    type: 'counter';
    values: Map<string, MetricValue>;
}

interface GaugeMetric {
    name: string;
    help: string;
    type: 'gauge';
    values: Map<string, MetricValue>;
}

interface HistogramMetric {
    name: string;
    help: string;
    type: 'histogram';
    buckets: number[];
    values: Map<string, {
        count: number;
        sum: number;
        buckets: Map<number, number>;
        labels: Record<string, string>;
        timestamp: number;
    }>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

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

export class MetricsService {
    private metrics = new Map<string, Metric>();
    private channelActivityCache = new Map<string, ChannelActivity>();
    private readonly service: string;
    private pushInterval?: NodeJS.Timeout;

    constructor(service: string) {
        this.service = service;
        this.initializeMetrics();
        
        if (process.env.ENABLE_METRICS === 'true') {
            this.startMetricsPush();
        }
    }

    private initializeMetrics(): void {
        // Message processing metrics
        this.createCounter(
            'discord_messages_processed_total',
            'Total number of Discord messages processed',
        );

        this.createCounter(
            'bot_triggers_total',
            'Total number of bot triggers',
        );

        this.createCounter(
            'bot_responses_total',
            'Total number of bot responses sent',
        );

        this.createCounter(
            'bot_skips_total',
            'Total number of messages skipped by bots',
        );

        this.createHistogram(
            'bot_response_duration_ms',
            'Bot response latency in milliseconds',
            [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        );

        this.createGauge(
            'circuit_breaker_open',
            'Circuit breaker status (1 = open, 0 = closed)',
        );

        this.createCounter(
            'circuit_breaker_activations_total',
            'Total number of circuit breaker activations',
        );

        // Channel activity metrics
        this.createGauge(
            'channel_messages_per_minute',
            'Messages per minute in each channel',
        );

        this.createGauge(
            'channel_active_users',
            'Number of active users in each channel',
        );

        this.createGauge(
            'channel_bot_message_ratio',
            'Ratio of bot messages to total messages',
        );

        // System metrics
        this.createGauge(
            'bot_instances_loaded',
            'Number of bot instances loaded',
        );

        this.createGauge(
            'memory_usage_bytes',
            'Memory usage in bytes',
        );
    }

    // Counter methods
    private createCounter(name: string, help: string): void {
        this.metrics.set(name, {
            name,
            help,
            type: 'counter',
            values: new Map()
        });
    }

    incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
        const metric = this.metrics.get(name) as CounterMetric;
        if (!metric || metric.type !== 'counter') {
            logger.warn(`Counter metric ${name} not found`);
            return;
        }

        const labelKey = this.createLabelKey(labels);
        const existing = metric.values.get(labelKey);
        
        metric.values.set(labelKey, {
            value: (existing?.value || 0) + value,
            labels: { service: this.service, ...labels },
            timestamp: Date.now()
        });
    }

    // Gauge methods
    private createGauge(name: string, help: string): void {
        this.metrics.set(name, {
            name,
            help,
            type: 'gauge',
            values: new Map()
        });
    }

    setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
        const metric = this.metrics.get(name) as GaugeMetric;
        if (!metric || metric.type !== 'gauge') {
            logger.warn(`Gauge metric ${name} not found`);
            return;
        }

        const labelKey = this.createLabelKey(labels);
        metric.values.set(labelKey, {
            value,
            labels: { service: this.service, ...labels },
            timestamp: Date.now()
        });
    }

    // Histogram methods
    private createHistogram(name: string, help: string, buckets: number[]): void {
        this.metrics.set(name, {
            name,
            help,
            type: 'histogram',
            buckets: buckets.sort((a, b) => a - b),
            values: new Map()
        });
    }

    observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
        const metric = this.metrics.get(name) as HistogramMetric;
        if (!metric || metric.type !== 'histogram') {
            logger.warn(`Histogram metric ${name} not found`);
            return;
        }

        const labelKey = this.createLabelKey(labels);
        let existing = metric.values.get(labelKey);
        
        if (!existing) {
            existing = {
                count: 0,
                sum: 0,
                buckets: new Map(),
                labels: { service: this.service, ...labels },
                timestamp: Date.now()
            };
            
            // Initialize buckets
            for (const bucket of metric.buckets) {
                existing.buckets.set(bucket, 0);
            }
            existing.buckets.set(Infinity, 0);
        }

        // Update histogram
        existing.count++;
        existing.sum += value;
        existing.timestamp = Date.now();

        // Update buckets
        for (const bucket of metric.buckets) {
            if (value <= bucket) {
                existing.buckets.set(bucket, (existing.buckets.get(bucket) || 0) + 1);
            }
        }
        existing.buckets.set(Infinity, existing.count);

        metric.values.set(labelKey, existing);
    }

    // High-level tracking methods
    trackMessageFlow(metrics: MessageFlowMetrics): void {
        const baseLabels = {
            bot: metrics.botName,
            user_id: metrics.userId,
            user_name: metrics.userName,
            channel_id: metrics.channelId,
            channel_name: metrics.channelName,
            guild_id: metrics.guildId
        };

        // Track message processed
        this.incrementCounter('discord_messages_processed_total', baseLabels);

        if (metrics.triggered) {
            // Bot triggered
            const triggerLabels = {
                ...baseLabels,
                condition: metrics.conditionName || 'unknown'
            };
            this.incrementCounter('bot_triggers_total', triggerLabels);

            if (metrics.responseText) {
                this.incrementCounter('bot_responses_total', triggerLabels);
            }

            if (metrics.responseLatency) {
                this.observeHistogram('bot_response_duration_ms', metrics.responseLatency, triggerLabels);
            }
        } else {
            // Bot skipped
            const skipLabels = {
                ...baseLabels,
                reason: metrics.skipReason || 'unknown',
                condition: metrics.conditionName || 'unknown'
            };
            this.incrementCounter('bot_skips_total', skipLabels);
        }

        // Circuit breaker status
        if (metrics.circuitBreakerOpen !== undefined) {
            this.setGauge('circuit_breaker_open', metrics.circuitBreakerOpen ? 1 : 0, {
                bot: metrics.botName
            });
        }

        // Log structured data for Loki
        if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
            logger.info('message_flow', {
                ...metrics,
                service: this.service,
                metric_type: 'message_flow'
            });
        }
    }

    trackChannelActivity(activity: ChannelActivity): void {
        const labels = {
            channel_id: activity.channelId,
            channel_name: activity.channelName,
            guild_id: activity.guildId
        };

        this.setGauge('channel_messages_per_minute', activity.messageCount, labels);
        this.setGauge('channel_active_users', activity.userCount, labels);
        
        const botRatio = activity.messageCount > 0 ? activity.botMessageCount / activity.messageCount : 0;
        this.setGauge('channel_bot_message_ratio', botRatio, labels);

        // Cache for aggregation
        this.channelActivityCache.set(activity.channelId, activity);

        if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
            logger.info('channel_activity', {
                ...activity,
                service: this.service,
                metric_type: 'channel_activity'
            });
        }
    }

    trackCircuitBreakerActivation(botName: string, reason: string): void {
        this.incrementCounter('circuit_breaker_activations_total', {
            bot: botName,
            reason
        });

        this.setGauge('circuit_breaker_open', 1, { bot: botName });

        if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
            logger.warn('circuit_breaker_activation', {
                bot: botName,
                reason,
                service: this.service,
                metric_type: 'circuit_breaker'
            });
        }
    }

    trackSystemMetrics(): void {
        const memoryUsage = process.memoryUsage();
        
        this.setGauge('memory_usage_bytes', memoryUsage.heapUsed, { type: 'heap_used' });
        this.setGauge('memory_usage_bytes', memoryUsage.heapTotal, { type: 'heap_total' });
        this.setGauge('memory_usage_bytes', memoryUsage.external, { type: 'external' });
        this.setGauge('memory_usage_bytes', memoryUsage.rss, { type: 'rss' });
    }

    // Prometheus exposition format
    getPrometheusMetrics(): string {
        const lines: string[] = [];
        
        for (const metric of this.metrics.values()) {
            lines.push(`# HELP ${metric.name} ${metric.help}`);
            lines.push(`# TYPE ${metric.name} ${metric.type}`);
            
            if (metric.type === 'counter' || metric.type === 'gauge') {
                for (const [, value] of metric.values) {
                    const labelStr = this.formatLabels(value.labels);
                    lines.push(`${metric.name}${labelStr} ${value.value}`);
                }
            } else if (metric.type === 'histogram') {
                const histMetric = metric as HistogramMetric;
                for (const [, value] of histMetric.values) {
                    const baseLabels = this.formatLabels(value.labels);
                    
                    // Bucket metrics
                    for (const [bucket, count] of value.buckets) {
                        const bucketLabel = bucket === Infinity ? '+Inf' : bucket.toString();
                        const bucketLabels = this.formatLabels({
                            ...value.labels,
                            le: bucketLabel
                        });
                        lines.push(`${metric.name}_bucket${bucketLabels} ${count}`);
                    }
                    
                    // Sum and count
                    lines.push(`${metric.name}_sum${baseLabels} ${value.sum}`);
                    lines.push(`${metric.name}_count${baseLabels} ${value.count}`);
                }
            }
            
            lines.push('');
        }
        
        return lines.join('\n');
    }

    private createLabelKey(labels: Record<string, string>): string {
        return Object.entries({ service: this.service, ...labels })
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }

    private formatLabels(labels: Record<string, string>): string {
        const labelPairs = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
            .join(',');
        
        return labelPairs ? `{${labelPairs}}` : '';
    }

    private startMetricsPush(): void {
        const interval = parseInt(process.env.METRICS_PUSH_INTERVAL || '30000');
        
        this.pushInterval = setInterval(() => {
            this.trackSystemMetrics();
            
            if (process.env.PROMETHEUS_PUSHGATEWAY_URL) {
                this.pushMetrics().catch(error => {
                    logger.error('Failed to push metrics:', ensureError(error));
                });
            }
        }, interval);

        logger.info(`Metrics push started with ${interval}ms interval`);
    }

    private async pushMetrics(): Promise<void> {
        try {
            const pushgatewayUrl = process.env.PROMETHEUS_PUSHGATEWAY_URL;
            if (!pushgatewayUrl) return;

            const metrics = this.getPrometheusMetrics();
            const response = await fetch(`${pushgatewayUrl}/metrics/job/${this.service}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain; version=0.0.4',
                },
                body: metrics
            });

            if (!response.ok) {
                throw new Error(`Push gateway responded with ${response.status}: ${response.statusText}`);
            }

            logger.debug('Metrics pushed successfully');
        } catch (error) {
            logger.error('Error pushing metrics:', ensureError(error));
        }
    }

    shutdown(): void {
        if (this.pushInterval) {
            clearInterval(this.pushInterval);
            this.pushInterval = undefined;
        }
        
        logger.info('Metrics service shutdown');
    }
}

// Global metrics instance
let globalMetrics: MetricsService | undefined;

export function initializeMetrics(service: string): MetricsService {
    if (globalMetrics) {
        logger.warn('Metrics service already initialized');
        return globalMetrics;
    }
    
    globalMetrics = new MetricsService(service);
    logger.info(`Metrics service initialized for ${service}`);
    return globalMetrics;
}

export function getMetrics(): MetricsService {
    if (!globalMetrics) {
        throw new Error('Metrics service not initialized. Call initializeMetrics() first.');
    }
    return globalMetrics;
}