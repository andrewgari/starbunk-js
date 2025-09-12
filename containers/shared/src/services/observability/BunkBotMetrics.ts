// BunkBot Container-Specific Metrics Implementation
// Tracks reply bot triggers, message processing pipeline, bot registry performance, 
// circuit breaker states, and webhook delivery metrics

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { BunkBotMetrics, ContainerMetricsBase, MessageContext, ContainerMetricsConfig } from './ContainerMetrics';
import { ProductionMetricsService } from './ProductionMetricsService';

export class BunkBotMetricsCollector extends ContainerMetricsBase implements BunkBotMetrics {
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
        totalBots: 0,
        lastLoadTime: 0,
        loadFailures: 0
    };
    
    constructor(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}) {
        super(metrics, 'bunkbot');
        this.initializeMetrics(config);
        
        logger.info('BunkBot metrics collector initialized with production-ready tracking');
    }
    
    private initializeMetrics(config: ContainerMetricsConfig): void {
        // Reply Bot Trigger Metrics
        this.botTriggerCounter = new promClient.Counter({
            name: 'bunkbot_bot_triggers_total',
            help: 'Total number of reply bot triggers',
            labelNames: ['bot_name', 'condition_name', 'user_id', 'channel_id', 'guild_id'],
            registers: [this.registry]
        });
        
        this.botResponseCounter = new promClient.Counter({
            name: 'bunkbot_bot_responses_total', 
            help: 'Total number of reply bot responses sent',
            labelNames: ['bot_name', 'condition_name', 'user_id', 'channel_id', 'guild_id', 'response_type'],
            registers: [this.registry]
        });
        
        this.botSkipCounter = new promClient.Counter({
            name: 'bunkbot_bot_skips_total',
            help: 'Total number of messages skipped by reply bots',
            labelNames: ['bot_name', 'skip_reason', 'condition_name', 'user_id', 'channel_id', 'guild_id'],
            registers: [this.registry]
        });
        
        this.botResponseTimeHistogram = new promClient.Histogram({
            name: 'bunkbot_bot_response_duration_ms',
            help: 'Reply bot response time in milliseconds',
            labelNames: ['bot_name', 'condition_name', 'response_type'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            registers: [this.registry]
        });
        
        // Bot Registry Metrics
        this.botRegistryLoadTimeHistogram = new promClient.Histogram({
            name: 'bunkbot_registry_load_duration_ms',
            help: 'Time taken to load bot registry in milliseconds',
            labelNames: ['load_type', 'success'],
            buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            registers: [this.registry]
        });
        
        this.botRegistryCountGauge = new promClient.Gauge({
            name: 'bunkbot_registry_bot_count',
            help: 'Number of bots currently loaded in registry',
            labelNames: ['registry_type', 'status'],
            registers: [this.registry]
        });
        
        this.botRegistryOperationsCounter = new promClient.Counter({
            name: 'bunkbot_registry_operations_total',
            help: 'Total bot registry operations performed',
            labelNames: ['operation', 'success', 'registry_type'],
            registers: [this.registry]
        });
        
        // Message Processing Pipeline Metrics
        this.messageProcessingCounter = new promClient.Counter({
            name: 'bunkbot_message_processing_total',
            help: 'Total messages processed by BunkBot pipeline',
            labelNames: ['processing_result', 'bot_count', 'channel_type'],
            registers: [this.registry]
        });
        
        this.messageProcessingTimeHistogram = new promClient.Histogram({
            name: 'bunkbot_message_processing_duration_ms',
            help: 'Message processing pipeline duration in milliseconds',
            labelNames: ['triggered_bots', 'channel_type'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
            registers: [this.registry]
        });
        
        this.concurrentMessageGauge = new promClient.Gauge({
            name: 'bunkbot_concurrent_message_processing',
            help: 'Number of messages currently being processed',
            registers: [this.registry]
        });
        
        // Circuit Breaker Metrics (BunkBot-specific)
        this.circuitBreakerStateGauge = new promClient.Gauge({
            name: 'bunkbot_circuit_breaker_state',
            help: 'Circuit breaker state for reply bots (0=closed, 1=open, 2=half-open)',
            labelNames: ['bot_name'],
            registers: [this.registry]
        });
        
        this.circuitBreakerTransitionCounter = new promClient.Counter({
            name: 'bunkbot_circuit_breaker_transitions_total',
            help: 'Total circuit breaker state transitions',
            labelNames: ['bot_name', 'from_state', 'to_state', 'reason'],
            registers: [this.registry]
        });
        
        // Webhook Delivery Metrics
        this.webhookDeliveryCounter = new promClient.Counter({
            name: 'bunkbot_webhook_deliveries_total',
            help: 'Total webhook deliveries attempted',
            labelNames: ['bot_name', 'success', 'status_code', 'channel_id'],
            registers: [this.registry]
        });
        
        this.webhookDeliveryTimeHistogram = new promClient.Histogram({
            name: 'bunkbot_webhook_delivery_duration_ms', 
            help: 'Webhook delivery time in milliseconds',
            labelNames: ['bot_name', 'success'],
            buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            registers: [this.registry]
        });
        
        this.webhookRetryCounter = new promClient.Counter({
            name: 'bunkbot_webhook_retries_total',
            help: 'Total webhook delivery retries',
            labelNames: ['bot_name', 'retry_attempt', 'final_success'],
            registers: [this.registry]
        });
    }
    
    // ============================================================================
    // Reply Bot Trigger Metrics Implementation
    // ============================================================================
    
    trackBotTrigger(botName: string, conditionName: string, messageContext: MessageContext): void {
        try {
            this.botTriggerCounter.inc({
                bot_name: this.sanitizeLabel(botName),
                condition_name: this.sanitizeLabel(conditionName),
                user_id: messageContext.userId,
                channel_id: messageContext.channelId,
                guild_id: messageContext.guildId
            });
            
            logger.debug(`Bot trigger tracked: ${botName} (${conditionName})`, {
                messageId: messageContext.messageId,
                userId: messageContext.userId
            });
        } catch (error) {
            logger.error('Failed to track bot trigger:', ensureError(error));
        }
    }
    
    trackBotResponse(botName: string, conditionName: string, responseTime: number, messageContext: MessageContext): void {
        try {
            const labels = {
                bot_name: this.sanitizeLabel(botName),
                condition_name: this.sanitizeLabel(conditionName),
                user_id: messageContext.userId,
                channel_id: messageContext.channelId,
                guild_id: messageContext.guildId,
                response_type: responseTime < 100 ? 'fast' : responseTime < 1000 ? 'normal' : 'slow'
            };
            
            this.botResponseCounter.inc(labels);
            this.botResponseTimeHistogram.observe({
                bot_name: labels.bot_name,
                condition_name: labels.condition_name,
                response_type: labels.response_type
            }, responseTime);
            
            logger.debug(`Bot response tracked: ${botName} (${responseTime}ms)`, {
                messageId: messageContext.messageId
            });
        } catch (error) {
            logger.error('Failed to track bot response:', ensureError(error));
        }
    }
    
    trackBotSkip(botName: string, skipReason: string, messageContext: MessageContext): void {
        try {
            this.botSkipCounter.inc({
                bot_name: this.sanitizeLabel(botName),
                skip_reason: this.sanitizeLabel(skipReason),
                condition_name: 'n/a',
                user_id: messageContext.userId,
                channel_id: messageContext.channelId,
                guild_id: messageContext.guildId
            });
            
            logger.debug(`Bot skip tracked: ${botName} (${skipReason})`, {
                messageId: messageContext.messageId
            });
        } catch (error) {
            logger.error('Failed to track bot skip:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Bot Registry Metrics Implementation  
    // ============================================================================
    
    trackBotRegistryLoad(totalBots: number, loadDuration: number): void {
        try {
            const success = totalBots > 0 ? 'true' : 'false';
            
            this.botRegistryLoadTimeHistogram.observe({
                load_type: 'file_discovery',
                success
            }, loadDuration);
            
            this.botRegistryCountGauge.set({
                registry_type: 'file_based',
                status: 'loaded'
            }, totalBots);
            
            this.botRegistryOperationsCounter.inc({
                operation: 'load',
                success,
                registry_type: 'file_based'
            });
            
            // Update internal stats
            this.botRegistryStats.totalBots = totalBots;
            this.botRegistryStats.lastLoadTime = loadDuration;
            if (totalBots === 0) {
                this.botRegistryStats.loadFailures++;
            }
            
            logger.info(`Bot registry load tracked: ${totalBots} bots in ${loadDuration}ms`);
        } catch (error) {
            logger.error('Failed to track bot registry load:', ensureError(error));
        }
    }
    
    trackBotRegistryUpdate(added: number, removed: number, updated: number): void {
        try {
            const operations = [
                { op: 'add', count: added },
                { op: 'remove', count: removed },
                { op: 'update', count: updated }
            ];
            
            for (const { op, count } of operations) {
                if (count > 0) {
                    this.botRegistryOperationsCounter.inc({
                        operation: op,
                        success: 'true',
                        registry_type: 'file_based'
                    }, count);
                }
            }
            
            // Update total bot count
            const newTotal = this.botRegistryStats.totalBots + added - removed;
            this.botRegistryCountGauge.set({
                registry_type: 'file_based',
                status: 'loaded'
            }, newTotal);
            
            this.botRegistryStats.totalBots = newTotal;
            
            logger.info(`Bot registry update tracked: +${added}, -${removed}, ~${updated}`);
        } catch (error) {
            logger.error('Failed to track bot registry update:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Message Processing Pipeline Metrics Implementation
    // ============================================================================
    
    trackMessageProcessingStart(messageId: string, botCount: number): void {
        try {
            this.activeMessageProcessing.add(messageId);
            this.concurrentMessageGauge.set(this.activeMessageProcessing.size);
            
            logger.debug(`Message processing started: ${messageId} (${botCount} bots)`);
        } catch (error) {
            logger.error('Failed to track message processing start:', ensureError(error));
        }
    }
    
    trackMessageProcessingComplete(messageId: string, triggeredBots: number, processingTime: number): void {
        try {
            this.activeMessageProcessing.delete(messageId);
            this.concurrentMessageGauge.set(this.activeMessageProcessing.size);
            
            const channelType = messageId.includes('dm') ? 'dm' : 'guild';
            const result = triggeredBots > 0 ? 'triggered' : 'no_triggers';
            
            this.messageProcessingCounter.inc({
                processing_result: result,
                bot_count: String(this.botRegistryStats.totalBots),
                channel_type: channelType
            });
            
            this.messageProcessingTimeHistogram.observe({
                triggered_bots: String(triggeredBots),
                channel_type: channelType
            }, processingTime);
            
            logger.debug(`Message processing complete: ${messageId} (${triggeredBots} triggered, ${processingTime}ms)`);
        } catch (error) {
            logger.error('Failed to track message processing complete:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Circuit Breaker Metrics Implementation
    // ============================================================================
    
    trackCircuitBreakerState(botName: string, state: 'open' | 'closed' | 'half-open', failureCount: number): void {
        try {
            const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
            
            this.circuitBreakerStateGauge.set({
                bot_name: this.sanitizeLabel(botName)
            }, stateValue);
            
            // Track circuit breaker activation in base metrics for alerting
            if (state === 'open') {
                this.metrics.trackCircuitBreakerActivation(botName, `${failureCount}_failures`);
            }
            
            logger.info(`Circuit breaker state tracked: ${botName} -> ${state} (${failureCount} failures)`);
        } catch (error) {
            logger.error('Failed to track circuit breaker state:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Webhook Delivery Metrics Implementation
    // ============================================================================
    
    trackWebhookDelivery(botName: string, success: boolean, deliveryTime: number, statusCode?: number): void {
        try {
            this.webhookDeliveryCounter.inc({
                bot_name: this.sanitizeLabel(botName),
                success: String(success),
                status_code: statusCode ? String(statusCode) : 'unknown',
                channel_id: 'webhook' // Generic label for webhook deliveries
            });
            
            this.webhookDeliveryTimeHistogram.observe({
                bot_name: this.sanitizeLabel(botName),
                success: String(success)
            }, deliveryTime);
            
            logger.debug(`Webhook delivery tracked: ${botName} (${success ? 'success' : 'failure'}, ${deliveryTime}ms)`);
        } catch (error) {
            logger.error('Failed to track webhook delivery:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Health and Status Methods
    // ============================================================================
    
    getHealthStatus(): Record<string, any> {
        return {
            containerType: 'bunkbot',
            botRegistry: {
                totalBots: this.botRegistryStats.totalBots,
                lastLoadTime: this.botRegistryStats.lastLoadTime,
                loadFailures: this.botRegistryStats.loadFailures
            },
            messageProcessing: {
                activeProcessing: this.activeMessageProcessing.size,
                totalProcessed: 'tracked_in_base_metrics'
            },
            circuitBreakers: 'tracked_per_bot',
            webhookDeliveries: 'tracked_per_bot',
            lastUpdate: Date.now()
        };
    }
    
    getMetricsSummary(): Record<string, any> {
        return {
            replyBots: {
                totalTriggers: 'counter_metric',
                totalResponses: 'counter_metric',
                totalSkips: 'counter_metric',
                avgResponseTime: 'histogram_metric'
            },
            botRegistry: {
                loadPerformance: 'histogram_metric',
                currentBotCount: this.botRegistryStats.totalBots,
                operationsPerformed: 'counter_metric'
            },
            messageProcessing: {
                pipelinePerformance: 'histogram_metric',
                concurrentProcessing: this.activeMessageProcessing.size,
                totalProcessed: 'counter_metric'
            },
            webhooks: {
                deliveryPerformance: 'histogram_metric',
                successRate: 'calculated_from_counters',
                totalDeliveries: 'counter_metric'
            }
        };
    }
    
    async cleanup(): Promise<void> {
        try {
            // Clear internal state
            this.activeMessageProcessing.clear();
            this.concurrentMessageGauge.set(0);
            
            // Reset bot registry stats
            this.botRegistryStats = {
                totalBots: 0,
                lastLoadTime: 0,
                loadFailures: 0
            };
            
            logger.info('BunkBot metrics collector cleaned up successfully');
        } catch (error) {
            logger.error('Error during BunkBot metrics cleanup:', ensureError(error));
            throw error;
        }
    }
}

// Factory function for creating BunkBot metrics collector
export function createBunkBotMetrics(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}): BunkBotMetricsCollector {
    return new BunkBotMetricsCollector(metrics, config);
}