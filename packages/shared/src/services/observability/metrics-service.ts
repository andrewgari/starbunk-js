import { logger } from '../logger';
import { ensureError } from '../../utils/error-utils';
import fetch from 'node-fetch';
import * as _promClient from 'prom-client';

// Prometheus-style metrics registry
interface MetricValue {
	value: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	labels: Record<string, string>; // eslint-disable-line @typescript-eslint/no-unused-vars
	timestamp: number; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface CounterMetric {
	name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	help: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	type: 'counter'; // eslint-disable-line @typescript-eslint/no-unused-vars
	values: Map<string, MetricValue>; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface GaugeMetric {
	name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	help: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	type: 'gauge'; // eslint-disable-line @typescript-eslint/no-unused-vars
	values: Map<string, MetricValue>; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface HistogramMetric {
	name: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	help: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	type: 'histogram'; // eslint-disable-line @typescript-eslint/no-unused-vars
	buckets: number[]; // eslint-disable-line @typescript-eslint/no-unused-vars
	values: Map<
		string,
		{
			// eslint-disable-line @typescript-eslint/no-unused-vars
			count: number; // eslint-disable-line @typescript-eslint/no-unused-vars
			sum: number; // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: Map<number, number>; // eslint-disable-line @typescript-eslint/no-unused-vars
			labels: Record<string, string>; // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: number; // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	>;
}

type Metric = CounterMetric | GaugeMetric | HistogramMetric;

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

export class MetricsService {
	private metrics = new Map<string, Metric>();
	private channelActivityCache = new Map<string, ChannelActivity>();
	private readonly service: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	private pushInterval?: NodeJS.Timeout;

	constructor(service: string) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.service = service;
		this.initializeMetrics();

		if (process.env.ENABLE_METRICS === 'true') {
			this.startMetricsPush();
		}
	}

	private initializeMetrics(): void {
		// Message processing metrics
		this.createCounter('discord_messages_processed_total', 'Total number of Discord messages processed');

		this.createCounter('bot_triggers_total', 'Total number of bot triggers');

		this.createCounter('bot_responses_total', 'Total number of bot responses sent');

		this.createCounter('bot_skips_total', 'Total number of messages skipped by bots');

		this.createHistogram(
			'bot_response_duration_ms',
			'Bot response latency in milliseconds',
			[1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
		);

		this.createGauge('circuit_breaker_open', 'Circuit breaker status (1 = open, 0 = closed)');

		this.createCounter('circuit_breaker_activations_total', 'Total number of circuit breaker activations');

		// Channel activity metrics
		this.createGauge('channel_messages_per_minute', 'Messages per minute in each channel');

		this.createGauge('channel_active_users', 'Number of active users in each channel');

		this.createGauge('channel_bot_message_ratio', 'Ratio of bot messages to total messages');

		// System metrics
		this.createGauge('bot_instances_loaded', 'Number of bot instances loaded');

		this.createGauge('memory_usage_bytes', 'Memory usage in bytes');
	}

	// Counter methods
	private createCounter(name: string, help: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.metrics.set(name, {
			name,
			help,
			type: 'counter', // eslint-disable-line @typescript-eslint/no-unused-vars
			values: new Map(), // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const metric = this.metrics.get(name) as CounterMetric;
		if (!metric || metric.type !== 'counter') {
			logger.warn(`Counter metric ${name} not found`);
			return;
		}

		const labelKey = this.createLabelKey(labels);
		const existing = metric.values.get(labelKey);

		metric.values.set(labelKey, {
			value: (existing?.value || 0) + value, // eslint-disable-line @typescript-eslint/no-unused-vars
			labels: { service: this.service, ...labels }, // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	// Gauge methods
	private createGauge(name: string, help: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.metrics.set(name, {
			name,
			help,
			type: 'gauge', // eslint-disable-line @typescript-eslint/no-unused-vars
			values: new Map(), // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const metric = this.metrics.get(name) as GaugeMetric;
		if (!metric || metric.type !== 'gauge') {
			logger.warn(`Gauge metric ${name} not found`);
			return;
		}

		const labelKey = this.createLabelKey(labels);
		metric.values.set(labelKey, {
			value,
			labels: { service: this.service, ...labels }, // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	// Histogram methods
	private createHistogram(name: string, help: string, buckets: number[]): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.metrics.set(name, {
			name,
			help,
			type: 'histogram', // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: buckets.sort((a, b) => a - b), // eslint-disable-line @typescript-eslint/no-unused-vars
			values: new Map(), // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const metric = this.metrics.get(name) as HistogramMetric;
		if (!metric || metric.type !== 'histogram') {
			logger.warn(`Histogram metric ${name} not found`);
			return;
		}

		const labelKey = this.createLabelKey(labels);
		let existing = metric.values.get(labelKey);

		if (!existing) {
			existing = {
				count: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
				sum: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
				buckets: new Map(), // eslint-disable-line @typescript-eslint/no-unused-vars
				labels: { service: this.service, ...labels }, // eslint-disable-line @typescript-eslint/no-unused-vars
				timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
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
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const baseLabels = {
			bot: metrics.botName, // eslint-disable-line @typescript-eslint/no-unused-vars
			user_id: metrics.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
			user_name: metrics.userName, // eslint-disable-line @typescript-eslint/no-unused-vars
			channel_id: metrics.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
			channel_name: metrics.channelName, // eslint-disable-line @typescript-eslint/no-unused-vars
			guild_id: metrics.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
		};

		// Track message processed
		this.incrementCounter('discord_messages_processed_total', baseLabels);

		if (metrics.triggered) {
			// Bot triggered
			const triggerLabels = {
				...baseLabels,
				condition: metrics.conditionName || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
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
				reason: metrics.skipReason || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
				condition: metrics.conditionName || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
			};
			this.incrementCounter('bot_skips_total', skipLabels);
		}

		// Circuit breaker status
		if (metrics.circuitBreakerOpen !== undefined) {
			this.setGauge('circuit_breaker_open', metrics.circuitBreakerOpen ? 1 : 0, {
				bot: metrics.botName, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}

		// Log structured data for Loki
		if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
			logger.info('message_flow', {
				...metrics,
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				metric_type: 'message_flow', // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	trackChannelActivity(activity: ChannelActivity): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const labels = {
			channel_id: activity.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
			channel_name: activity.channelName, // eslint-disable-line @typescript-eslint/no-unused-vars
			guild_id: activity.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
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
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				metric_type: 'channel_activity', // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	trackCircuitBreakerActivation(botName: string, reason: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.incrementCounter('circuit_breaker_activations_total', {
			bot: botName, // eslint-disable-line @typescript-eslint/no-unused-vars
			reason,
		});

		this.setGauge('circuit_breaker_open', 1, { bot: botName }); // eslint-disable-line @typescript-eslint/no-unused-vars

		if (process.env.ENABLE_STRUCTURED_LOGGING === 'true') {
			logger.warn('circuit_breaker_activation', {
				bot: botName, // eslint-disable-line @typescript-eslint/no-unused-vars
				reason,
				service: this.service, // eslint-disable-line @typescript-eslint/no-unused-vars
				metric_type: 'circuit_breaker', // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		}
	}

	trackSystemMetrics(): void {
		const memoryUsage = process.memoryUsage();

		this.setGauge('memory_usage_bytes', memoryUsage.heapUsed, { type: 'heap_used' }); // eslint-disable-line @typescript-eslint/no-unused-vars
		this.setGauge('memory_usage_bytes', memoryUsage.heapTotal, { type: 'heap_total' }); // eslint-disable-line @typescript-eslint/no-unused-vars
		this.setGauge('memory_usage_bytes', memoryUsage.external, { type: 'external' }); // eslint-disable-line @typescript-eslint/no-unused-vars
		this.setGauge('memory_usage_bytes', memoryUsage.rss, { type: 'rss' }); // eslint-disable-line @typescript-eslint/no-unused-vars
	}

	// Prometheus exposition format
	getPrometheusMetrics(): string {
		const lines: string[] = []; // eslint-disable-line @typescript-eslint/no-unused-vars

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
							le: bucketLabel, // eslint-disable-line @typescript-eslint/no-unused-vars
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
		// eslint-disable-line @typescript-eslint/no-unused-vars
		return Object.entries({ service: this.service, ...labels }) // eslint-disable-line @typescript-eslint/no-unused-vars
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}="${v}"`)
			.join(',');
	}

	private formatLabels(labels: Record<string, string>): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
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
				this.pushMetrics().catch((error) => {
					logger.error('Failed to push metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
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
				method: 'POST', // eslint-disable-line @typescript-eslint/no-unused-vars
				headers: {
					// eslint-disable-line @typescript-eslint/no-unused-vars
					'Content-Type': 'text/plain; version=0.0.4',
				},
				body: metrics, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			if (!response.ok) {
				throw new Error(`Push gateway responded with ${response.status}: ${response.statusText}`);
			}

			logger.debug('Metrics pushed successfully');
		} catch (error) {
			logger.error('Error pushing metrics:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
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
let globalMetrics: MetricsService | undefined; // eslint-disable-line @typescript-eslint/no-unused-vars

export function initializeMetrics(service: string): MetricsService {
	// eslint-disable-line @typescript-eslint/no-unused-vars
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
