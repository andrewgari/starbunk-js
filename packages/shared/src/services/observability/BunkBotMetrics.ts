// BunkBot Container-Specific Metrics Implementation
// Tracks reply bot triggers, message processing pipeline, bot registry performance,
// circuit breaker states, and webhook delivery metrics

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { BunkBotMetrics, ContainerMetricsBase, MessageContext, ContainerMetricsConfig } from './ContainerMetrics';
import { ProductionMetricsService } from './ProductionMetricsService';
import { RedisBotMetricsExporter, type RedisMetricsExporterConfig, createRedisBotMetricsExporter } from './RedisBotMetricsExporter';
import type { BotTriggerMetricsService } from './BotTriggerMetricsService';
import type Redis from 'ioredis';

export class _BunkBotMetricsCollector extends ContainerMetricsBase implements BunkBotMetrics {
	// Reply Bot Metrics
	private botTriggerCounter!: promClient.Counter<string>;
	private botResponseCounter!: promClient.Counter<string>;
	private botSkipCounter!: promClient.Counter<string>;
	private botResponseTimeHistogram!: promClient.Histogram<string>;

	// Bot Registry Metrics
	private botRegistryLoadTimeHistogram!: promClient.Histogram<string>;
	private botRegistryCountGauge!: promClient.Gauge<string>;
	private botRegistryOperationsCounter!: promClient.Counter<string>;

	// Message Processing Pipeline Metrics
	private messageProcessingCounter!: promClient.Counter<string>;
	private messageProcessingTimeHistogram!: promClient.Histogram<string>;
	private concurrentMessageGauge!: promClient.Gauge<string>;

	// Circuit Breaker Metrics (specialized for BunkBot)
	private circuitBreakerStateGauge!: promClient.Gauge<string>;
	private circuitBreakerTransitionCounter!: promClient.Counter<string>;

	// Webhook Delivery Metrics
	private webhookDeliveryCounter!: promClient.Counter<string>;
	private webhookDeliveryTimeHistogram!: promClient.Histogram<string>;
	private webhookRetryCounter!: promClient.Counter<string>;

	// Internal state tracking
	private activeMessageProcessing = new Set<string>();
	private botRegistryStats = {
		totalBots: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
		lastLoadTime: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
		loadFailures: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
	};

	// Redis metrics export
	private redisExporter?: RedisBotMetricsExporter;
	private redisExportInterval?: NodeJS.Timeout;
	private redisConnection?: Redis;
	private triggerMetricsService?: BotTriggerMetricsService;

	constructor(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		super(metrics, 'bunkbot');
		this.initializeMetrics(config);

		logger.info('BunkBot metrics collector initialized with production-ready tracking');
	}

	private initializeMetrics(_config: ContainerMetricsConfig): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Reply Bot Trigger Metrics
		this.botTriggerCounter = new promClient.Counter({
			name: 'bunkbot_bot_triggers_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of reply bot triggers', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'condition_name', 'user_id', 'channel_id', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botResponseCounter = new promClient.Counter({
			name: 'bunkbot_bot_responses_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of reply bot responses sent', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'condition_name', 'user_id', 'channel_id', 'guild_id', 'response_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botSkipCounter = new promClient.Counter({
			name: 'bunkbot_bot_skips_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of messages skipped by reply bots', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'skip_reason', 'condition_name', 'user_id', 'channel_id', 'guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botResponseTimeHistogram = new promClient.Histogram({
			name: 'bunkbot_bot_response_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Reply bot response time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'condition_name', 'response_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Bot Registry Metrics
		this.botRegistryLoadTimeHistogram = new promClient.Histogram({
			name: 'bunkbot_registry_load_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Time taken to load bot registry in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['load_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botRegistryCountGauge = new promClient.Gauge({
			name: 'bunkbot_registry_bot_count', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of bots currently loaded in registry', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['registry_type', 'status'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.botRegistryOperationsCounter = new promClient.Counter({
			name: 'bunkbot_registry_operations_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total bot registry operations performed', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['operation', 'success', 'registry_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Message Processing Pipeline Metrics
		this.messageProcessingCounter = new promClient.Counter({
			name: 'bunkbot_message_processing_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total messages processed by BunkBot pipeline', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['processing_result', 'bot_count', 'channel_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.messageProcessingTimeHistogram = new promClient.Histogram({
			name: 'bunkbot_message_processing_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Message processing pipeline duration in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['triggered_bots', 'channel_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.concurrentMessageGauge = new promClient.Gauge({
			name: 'bunkbot_concurrent_message_processing', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of messages currently being processed', // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Circuit Breaker Metrics (BunkBot-specific)
		this.circuitBreakerStateGauge = new promClient.Gauge({
			name: 'bunkbot_circuit_breaker_state', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Circuit breaker state for reply bots (0=closed, 1=open, 2=half-open)', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.circuitBreakerTransitionCounter = new promClient.Counter({
			name: 'bunkbot_circuit_breaker_transitions_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total circuit breaker state transitions', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'from_state', 'to_state', 'reason'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Webhook Delivery Metrics
		this.webhookDeliveryCounter = new promClient.Counter({
			name: 'bunkbot_webhook_deliveries_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total webhook deliveries attempted', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'success', 'status_code', 'channel_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.webhookDeliveryTimeHistogram = new promClient.Histogram({
			name: 'bunkbot_webhook_delivery_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Webhook delivery time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.webhookRetryCounter = new promClient.Counter({
			name: 'bunkbot_webhook_retries_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total webhook delivery retries', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['bot_name', 'retry_attempt', 'final_success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	// ============================================================================
	// Reply Bot Trigger Metrics Implementation
	// ============================================================================

	trackBotTrigger(botName: string, conditionName: string, messageContext: MessageContext): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.botTriggerCounter.inc({
				bot_name: this.sanitizeLabel(botName), // eslint-disable-line @typescript-eslint/no-unused-vars
				condition_name: this.sanitizeLabel(conditionName), // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: messageContext.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_id: messageContext.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
				guild_id: messageContext.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.debug(`Bot trigger tracked: ${botName} (${conditionName})`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				messageId: messageContext.messageId, // eslint-disable-line @typescript-eslint/no-unused-vars
				userId: messageContext.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track bot trigger:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackBotResponse(
		botName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
		conditionName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
		responseTime: number, // eslint-disable-line @typescript-eslint/no-unused-vars
		messageContext: MessageContext, // eslint-disable-line @typescript-eslint/no-unused-vars
	): void {
		try {
			const labels = {
				bot_name: this.sanitizeLabel(botName), // eslint-disable-line @typescript-eslint/no-unused-vars
				condition_name: this.sanitizeLabel(conditionName), // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: messageContext.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_id: messageContext.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
				guild_id: messageContext.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				response_type: responseTime < 100 ? 'fast' : responseTime < 1000 ? 'normal' : 'slow', // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			this.botResponseCounter.inc(labels);
			this.botResponseTimeHistogram.observe(
				{
					bot_name: labels.bot_name, // eslint-disable-line @typescript-eslint/no-unused-vars
					condition_name: labels.condition_name, // eslint-disable-line @typescript-eslint/no-unused-vars
					response_type: labels.response_type, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				responseTime,
			);

			logger.debug(`Bot response tracked: ${botName} (${responseTime}ms)`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				messageId: messageContext.messageId, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track bot response:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackBotSkip(botName: string, skipReason: string, messageContext: MessageContext): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.botSkipCounter.inc({
				bot_name: this.sanitizeLabel(botName), // eslint-disable-line @typescript-eslint/no-unused-vars
				skip_reason: this.sanitizeLabel(skipReason), // eslint-disable-line @typescript-eslint/no-unused-vars
				condition_name: 'n/a', // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: messageContext.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_id: messageContext.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
				guild_id: messageContext.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.debug(`Bot skip tracked: ${botName} (${skipReason})`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				messageId: messageContext.messageId, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track bot skip:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Bot Registry Metrics Implementation
	// ============================================================================

	trackBotRegistryLoad(totalBots: number, loadDuration: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const success = totalBots > 0 ? 'true' : 'false';

			this.botRegistryLoadTimeHistogram.observe(
				{
					load_type: 'file_discovery', // eslint-disable-line @typescript-eslint/no-unused-vars
					success,
				},
				loadDuration,
			);

			this.botRegistryCountGauge.set(
				{
					registry_type: 'file_based', // eslint-disable-line @typescript-eslint/no-unused-vars
					status: 'loaded', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				totalBots,
			);

			this.botRegistryOperationsCounter.inc({
				operation: 'load', // eslint-disable-line @typescript-eslint/no-unused-vars
				success,
				registry_type: 'file_based', // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			// Update internal stats
			this.botRegistryStats.totalBots = totalBots;
			this.botRegistryStats.lastLoadTime = loadDuration;
			if (totalBots === 0) {
				this.botRegistryStats.loadFailures++;
			}

			logger.info(`Bot registry load tracked: ${totalBots} bots in ${loadDuration}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track bot registry load:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackBotRegistryUpdate(added: number, removed: number, updated: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const operations = [
				{ op: 'add', count: added }, // eslint-disable-line @typescript-eslint/no-unused-vars
				{ op: 'remove', count: removed }, // eslint-disable-line @typescript-eslint/no-unused-vars
				{ op: 'update', count: updated }, // eslint-disable-line @typescript-eslint/no-unused-vars
			];

			for (const { op, count } of operations) {
				if (count > 0) {
					this.botRegistryOperationsCounter.inc(
						{
							operation: op, // eslint-disable-line @typescript-eslint/no-unused-vars
							success: 'true', // eslint-disable-line @typescript-eslint/no-unused-vars
							registry_type: 'file_based', // eslint-disable-line @typescript-eslint/no-unused-vars
						},
						count,
					);
				}
			}

			// Update total bot count
			const newTotal = this.botRegistryStats.totalBots + added - removed;
			this.botRegistryCountGauge.set(
				{
					registry_type: 'file_based', // eslint-disable-line @typescript-eslint/no-unused-vars
					status: 'loaded', // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				newTotal,
			);

			this.botRegistryStats.totalBots = newTotal;

			logger.info(`Bot registry update tracked: +${added}, -${removed}, ~${updated}`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track bot registry update:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Message Processing Pipeline Metrics Implementation
	// ============================================================================

	trackMessageProcessingStart(messageId: string, botCount: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.activeMessageProcessing.add(messageId);
			this.concurrentMessageGauge.set(this.activeMessageProcessing.size);

			logger.debug(`Message processing started: ${messageId} (${botCount} bots)`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track message processing start:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackMessageProcessingComplete(messageId: string, triggeredBots: number, processingTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.activeMessageProcessing.delete(messageId);
			this.concurrentMessageGauge.set(this.activeMessageProcessing.size);

			const channelType = messageId.includes('dm') ? 'dm' : 'guild';
			const _result = triggeredBots > 0 ? 'triggered' : 'no_triggers';

			this.messageProcessingCounter.inc({
				processing_result: result, // eslint-disable-line @typescript-eslint/no-unused-vars
				bot_count: String(this.botRegistryStats.totalBots), // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_type: channelType, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.messageProcessingTimeHistogram.observe(
				{
					triggered_bots: String(triggeredBots), // eslint-disable-line @typescript-eslint/no-unused-vars
					channel_type: channelType, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				processingTime,
			);

			logger.debug(`Message processing complete: ${messageId} (${triggeredBots} triggered, ${processingTime}ms)`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track message processing complete:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Circuit Breaker Metrics Implementation
	// ============================================================================

	trackCircuitBreakerState(botName: string, state: 'open' | 'closed' | 'half-open', failureCount: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;

			this.circuitBreakerStateGauge.set(
				{
					bot_name: this.sanitizeLabel(botName), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				stateValue,
			);

			// Track circuit breaker activation in base metrics for alerting
			if (state === 'open') {
				this.metrics.trackCircuitBreakerActivation(botName, `${failureCount}_failures`);
			}

			logger.info(`Circuit breaker state tracked: ${botName} -> ${state} (${failureCount} failures)`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track circuit breaker state:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Webhook Delivery Metrics Implementation
	// ============================================================================

	trackWebhookDelivery(botName: string, success: boolean, deliveryTime: number, statusCode?: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.webhookDeliveryCounter.inc({
				bot_name: this.sanitizeLabel(botName), // eslint-disable-line @typescript-eslint/no-unused-vars
				success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
				status_code: statusCode ? String(statusCode) : 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
				channel_id: 'webhook', // Generic label for webhook deliveries // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.webhookDeliveryTimeHistogram.observe(
				{
					bot_name: this.sanitizeLabel(botName), // eslint-disable-line @typescript-eslint/no-unused-vars
					success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				deliveryTime,
			);

			logger.debug(
				`Webhook delivery tracked: ${botName} (${success ? 'success' : 'failure'}, ${deliveryTime}ms)`, // eslint-disable-line @typescript-eslint/no-unused-vars
			);
		} catch (error) {
			logger.error('Failed to track webhook delivery:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Health and Status Methods
	// ============================================================================

	getHealthStatus(): Record<string, any> {
		return {
			containerType: 'bunkbot', // eslint-disable-line @typescript-eslint/no-unused-vars
			botRegistry: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				totalBots: this.botRegistryStats.totalBots, // eslint-disable-line @typescript-eslint/no-unused-vars
				lastLoadTime: this.botRegistryStats.lastLoadTime, // eslint-disable-line @typescript-eslint/no-unused-vars
				loadFailures: this.botRegistryStats.loadFailures, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			messageProcessing: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				activeProcessing: this.activeMessageProcessing.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: 'tracked_in_base_metrics', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			circuitBreakers: 'tracked_per_bot', // eslint-disable-line @typescript-eslint/no-unused-vars
			webhookDeliveries: 'tracked_per_bot', // eslint-disable-line @typescript-eslint/no-unused-vars
			lastUpdate: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}

	getMetricsSummary(): Record<string, any> {
		return {
			replyBots: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				totalTriggers: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				totalResponses: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				totalSkips: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				avgResponseTime: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			botRegistry: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				loadPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				currentBotCount: this.botRegistryStats.totalBots, // eslint-disable-line @typescript-eslint/no-unused-vars
				operationsPerformed: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			messageProcessing: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				pipelinePerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				concurrentProcessing: this.activeMessageProcessing.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			webhooks: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				deliveryPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				successRate: 'calculated_from_counters', // eslint-disable-line @typescript-eslint/no-unused-vars
				totalDeliveries: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
		};
	}

	// ============================================================================
	// Redis Metrics Export Methods
	// ============================================================================

	/**
	 * Initialize Redis metrics export
	 */
	async initializeRedisExport(
		redis: Redis,
		triggerMetricsService?: BotTriggerMetricsService,
		exportConfig?: RedisMetricsExporterConfig
	): Promise<void> {
		try {
			logger.info('Initializing Redis metrics export for BunkBot');

			this.redisConnection = redis;
			this.triggerMetricsService = triggerMetricsService;

			// Create Redis exporter with the same registry
			this.redisExporter = createRedisBotMetricsExporter(this.registry, {
				cacheTTL: 15000, // 15 seconds cache for Prometheus scraping
				enableCircuitBreaker: true,
				circuitBreakerThreshold: 3,
				circuitBreakerResetTimeout: 30000,
				maxConcurrentOperations: 10,
				enablePerformanceTracking: true,
				exportTimeout: 5000,
				enableDetailedLabels: false,
				batchSize: 100,
				scanCount: 1000,
				...exportConfig
			});

			// Initialize the exporter
			await this.redisExporter.initialize(redis, triggerMetricsService);

			// Start periodic export (every 15 seconds for Prometheus scraping)
			this.startRedisExportInterval(15000);

			logger.info('Redis metrics export initialized successfully');
		} catch (error) {
			logger.error('Failed to initialize Redis metrics export:', ensureError(error));
			// Don't throw - allow BunkBot to continue without Redis export
		}
	}

	/**
	 * Start periodic Redis metrics export
	 */
	private startRedisExportInterval(interval: number = 15000): void {
		if (this.redisExportInterval) {
			clearInterval(this.redisExportInterval);
		}

		// Initial export
		this.exportRedisMetrics().catch(error => {
			logger.error('Initial Redis metrics export failed:', ensureError(error));
		});

		// Periodic export
		this.redisExportInterval = setInterval(async () => {
			await this.exportRedisMetrics();
		}, interval);

		logger.info(`Started Redis metrics export interval (${interval}ms)`);
	}

	/**
	 * Export Redis metrics to Prometheus
	 */
	async exportRedisMetrics(): Promise<void> {
		if (!this.redisExporter) {
			logger.debug('Redis exporter not initialized, skipping export');
			return;
		}

		try {
			await this.redisExporter.exportMetrics();
			logger.debug('Redis metrics exported to Prometheus');
		} catch (error) {
			logger.error('Failed to export Redis metrics:', ensureError(error));
			// Don't throw - graceful degradation
		}
	}

	/**
	 * Get Redis exporter statistics
	 */
	getRedisExporterStats(): Record<string, any> | null {
		if (!this.redisExporter) {
			return null;
		}

		return this.redisExporter.getStats();
	}

	/**
	 * Stop Redis metrics export
	 */
	async stopRedisExport(): Promise<void> {
		if (this.redisExportInterval) {
			clearInterval(this.redisExportInterval);
			this.redisExportInterval = undefined;
		}

		if (this.redisExporter) {
			await this.redisExporter.shutdown();
			this.redisExporter = undefined;
		}

		logger.info('Redis metrics export stopped');
	}

	async cleanup(): Promise<void> {
		try {
			// Stop Redis export
			await this.stopRedisExport();

			// Clear internal state
			this.activeMessageProcessing.clear();
			this.concurrentMessageGauge.set(0);

			// Reset bot registry stats
			this.botRegistryStats = {
				totalBots: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
				lastLoadTime: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
				loadFailures: 0, // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			logger.info('BunkBot metrics collector cleaned up successfully');
		} catch (error) {
			logger.error('Error during BunkBot metrics cleanup:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}
}

// Factory function for creating BunkBot metrics collector
export function createBunkBotMetrics(
	metrics: ProductionMetricsService, // eslint-disable-line @typescript-eslint/no-unused-vars
	config: ContainerMetricsConfig = {}, // eslint-disable-line @typescript-eslint/no-unused-vars
): _BunkBotMetricsCollector {
	return new _BunkBotMetricsCollector(metrics, config);
}
