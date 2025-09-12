// Starbunk-DND Container-Specific Metrics Implementation
// Tracks campaign management, LLM requests, vector embedding operations,
// cross-server bridging, and file processing for D&D functionality

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { StarbunkDNDMetrics, ContainerMetricsBase, ContainerMetricsConfig } from './ContainerMetrics';
import { ProductionMetricsService } from './ProductionMetricsService';

interface CampaignSession {
    campaignId: string;
    playerCount: number;
    startTime: number;
    lastActivity: number;
    status: 'active' | 'paused' | 'archived';
}

interface LLMRequestTracker {
    provider: 'openai' | 'ollama';
    model: string;
    requestType: 'chat' | 'embedding' | 'completion';
    startTime: number;
    tokenCount?: number;
}

interface VectorOperationTracker {
    operation: 'generate' | 'search' | 'index';
    startTime: number;
    documentCount?: number;
    queryType?: string;
}

export class StarbunkDNDMetricsCollector extends ContainerMetricsBase implements StarbunkDNDMetrics {
    // Campaign Management Metrics
    private campaignOperationCounter!: promClient.Counter<string>;
    private campaignOperationDurationHistogram!: promClient.Histogram<string>;
    private activeCampaignsGauge!: promClient.Gauge<string>;
    private campaignPlayerActionCounter!: promClient.Counter<string>;
    
    // LLM Request Tracking Metrics
    private llmRequestCounter!: promClient.Counter<string>;
    private llmResponseTimeHistogram!: promClient.Histogram<string>;
    private llmTokenUsageHistogram!: promClient.Histogram<string>;
    private llmErrorCounter!: promClient.Counter<string>;
    private llmCostGauge!: promClient.Gauge<string>;
    
    // Vector Embedding Performance Metrics
    private vectorEmbeddingCounter!: promClient.Counter<string>;
    private vectorEmbeddingTimeHistogram!: promClient.Histogram<string>;
    private vectorSimilaritySearchCounter!: promClient.Counter<string>;
    private vectorSimilaritySearchTimeHistogram!: promClient.Histogram<string>;
    private vectorIndexOperationCounter!: promClient.Counter<string>;
    private vectorIndexSizeGauge!: promClient.Gauge<string>;
    
    // Cross-Server Bridge Activity Metrics
    private bridgeMessageCounter!: promClient.Counter<string>;
    private bridgeLatencyHistogram!: promClient.Histogram<string>;
    private bridgeErrorCounter!: promClient.Counter<string>;
    private activeBridgesGauge!: promClient.Gauge<string>;
    
    // File Processing Metrics
    private fileProcessingCounter!: promClient.Counter<string>;
    private fileProcessingTimeHistogram!: promClient.Histogram<string>;
    private fileUploadCounter!: promClient.Counter<string>;
    private fileUploadTimeHistogram!: promClient.Histogram<string>;
    private fileSizeHistogram!: promClient.Histogram<string>;
    
    // Internal state tracking for production monitoring
    private activeCampaigns = new Map<string, CampaignSession>();
    private activeLLMRequests = new Map<string, LLMRequestTracker>();
    private activeVectorOperations = new Map<string, VectorOperationTracker>();
    private bridgeConnections = new Set<string>();
    private totalLLMTokensUsed = 0;
    private totalFilesProcessed = 0;
    
    constructor(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}) {
        super(metrics, 'starbunk-dnd');
        this.initializeMetrics(config);
        
        // Set up periodic cleanup and cost tracking
        this.setupPeriodicTasks();
        
        logger.info('Starbunk-DND metrics collector initialized with D&D campaign and LLM tracking');
    }
    
    private initializeMetrics(config: ContainerMetricsConfig): void {
        // Campaign Management Metrics
        this.campaignOperationCounter = new promClient.Counter({
            name: 'starbunk_dnd_campaign_operations_total',
            help: 'Total number of campaign operations performed',
            labelNames: ['operation', 'campaign_id', 'success'],
            registers: [this.registry]
        });
        
        this.campaignOperationDurationHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_campaign_operation_duration_ms',
            help: 'Duration of campaign operations in milliseconds',
            labelNames: ['operation', 'success'],
            buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
            registers: [this.registry]
        });
        
        this.activeCampaignsGauge = new promClient.Gauge({
            name: 'starbunk_dnd_active_campaigns',
            help: 'Number of currently active campaigns',
            labelNames: ['status'],
            registers: [this.registry]
        });
        
        this.campaignPlayerActionCounter = new promClient.Counter({
            name: 'starbunk_dnd_player_actions_total',
            help: 'Total player actions in campaigns',
            labelNames: ['campaign_id', 'player_id', 'action_type'],
            registers: [this.registry]
        });
        
        // LLM Request Tracking Metrics
        this.llmRequestCounter = new promClient.Counter({
            name: 'starbunk_dnd_llm_requests_total',
            help: 'Total LLM requests made',
            labelNames: ['provider', 'model', 'request_type', 'success'],
            registers: [this.registry]
        });
        
        this.llmResponseTimeHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_llm_response_time_ms',
            help: 'LLM response time in milliseconds',
            labelNames: ['provider', 'model', 'request_type'],
            buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 60000],
            registers: [this.registry]
        });
        
        this.llmTokenUsageHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_llm_tokens_used',
            help: 'Number of tokens used in LLM requests',
            labelNames: ['provider', 'model', 'token_type'],
            buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000],
            registers: [this.registry]
        });
        
        this.llmErrorCounter = new promClient.Counter({
            name: 'starbunk_dnd_llm_errors_total',
            help: 'Total LLM request errors',
            labelNames: ['provider', 'model', 'error_type'],
            registers: [this.registry]
        });
        
        this.llmCostGauge = new promClient.Gauge({
            name: 'starbunk_dnd_llm_estimated_cost_usd',
            help: 'Estimated LLM usage cost in USD',
            labelNames: ['provider', 'model', 'time_period'],
            registers: [this.registry]
        });
        
        // Vector Embedding Performance Metrics
        this.vectorEmbeddingCounter = new promClient.Counter({
            name: 'starbunk_dnd_vector_embeddings_total',
            help: 'Total vector embeddings generated',
            labelNames: ['document_type', 'success'],
            registers: [this.registry]
        });
        
        this.vectorEmbeddingTimeHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_vector_embedding_duration_ms',
            help: 'Vector embedding generation time in milliseconds',
            labelNames: ['document_count_category'],
            buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
            registers: [this.registry]
        });
        
        this.vectorSimilaritySearchCounter = new promClient.Counter({
            name: 'starbunk_dnd_vector_similarity_searches_total',
            help: 'Total vector similarity searches performed',
            labelNames: ['query_type', 'result_count_category'],
            registers: [this.registry]
        });
        
        this.vectorSimilaritySearchTimeHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_vector_similarity_search_duration_ms',
            help: 'Vector similarity search time in milliseconds',
            labelNames: ['query_type'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
            registers: [this.registry]
        });
        
        this.vectorIndexOperationCounter = new promClient.Counter({
            name: 'starbunk_dnd_vector_index_operations_total',
            help: 'Total vector index operations',
            labelNames: ['operation', 'success'],
            registers: [this.registry]
        });
        
        this.vectorIndexSizeGauge = new promClient.Gauge({
            name: 'starbunk_dnd_vector_index_document_count',
            help: 'Number of documents in vector index',
            labelNames: ['index_type'],
            registers: [this.registry]
        });
        
        // Cross-Server Bridge Activity Metrics
        this.bridgeMessageCounter = new promClient.Counter({
            name: 'starbunk_dnd_bridge_messages_total',
            help: 'Total messages bridged between servers',
            labelNames: ['source_guild', 'target_guild', 'message_type', 'success'],
            registers: [this.registry]
        });
        
        this.bridgeLatencyHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_bridge_latency_ms',
            help: 'Message bridge delivery latency in milliseconds',
            labelNames: ['source_guild', 'target_guild'],
            buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
            registers: [this.registry]
        });
        
        this.bridgeErrorCounter = new promClient.Counter({
            name: 'starbunk_dnd_bridge_errors_total',
            help: 'Total bridge operation errors',
            labelNames: ['source_guild', 'target_guild', 'error_type'],
            registers: [this.registry]
        });
        
        this.activeBridgesGauge = new promClient.Gauge({
            name: 'starbunk_dnd_active_bridges',
            help: 'Number of active server bridges',
            registers: [this.registry]
        });
        
        // File Processing Metrics
        this.fileProcessingCounter = new promClient.Counter({
            name: 'starbunk_dnd_file_processing_total',
            help: 'Total files processed',
            labelNames: ['file_type', 'success', 'size_category'],
            registers: [this.registry]
        });
        
        this.fileProcessingTimeHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_file_processing_duration_ms',
            help: 'File processing time in milliseconds',
            labelNames: ['file_type', 'size_category'],
            buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
            registers: [this.registry]
        });
        
        this.fileUploadCounter = new promClient.Counter({
            name: 'starbunk_dnd_file_uploads_total',
            help: 'Total file uploads',
            labelNames: ['file_extension', 'size_category'],
            registers: [this.registry]
        });
        
        this.fileUploadTimeHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_file_upload_duration_ms',
            help: 'File upload time in milliseconds',
            labelNames: ['size_category'],
            buckets: [100, 500, 1000, 2500, 5000, 10000, 30000, 60000],
            registers: [this.registry]
        });
        
        this.fileSizeHistogram = new promClient.Histogram({
            name: 'starbunk_dnd_file_size_bytes',
            help: 'File sizes in bytes',
            labelNames: ['file_type'],
            buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
            registers: [this.registry]
        });
    }
    
    // ============================================================================
    // Campaign Management Metrics Implementation
    // ============================================================================
    
    trackCampaignOperation(operation: 'create' | 'update' | 'delete' | 'load', campaignId?: string, duration?: number): void {
        try {
            const success = duration !== undefined ? 'true' : 'unknown';
            
            this.campaignOperationCounter.inc({
                operation,
                campaign_id: campaignId || 'system',
                success
            });
            
            if (duration !== undefined) {
                this.campaignOperationDurationHistogram.observe({
                    operation,
                    success
                }, duration);
            }
            
            // Update campaign tracking for create/delete operations
            if (operation === 'create' && campaignId) {
                this.activeCampaigns.set(campaignId, {
                    campaignId,
                    playerCount: 0,
                    startTime: Date.now(),
                    lastActivity: Date.now(),
                    status: 'active'
                });
                this.updateActiveCampaignsGauge();
            } else if (operation === 'delete' && campaignId) {
                this.activeCampaigns.delete(campaignId);
                this.updateActiveCampaignsGauge();
            }
            
            logger.debug(`Campaign operation tracked: ${operation}`, {
                campaignId,
                duration,
                activeCampaigns: this.activeCampaigns.size
            });
        } catch (error) {
            logger.error('Failed to track campaign operation:', ensureError(error));
        }
    }
    
    trackCampaignPlayerAction(campaignId: string, playerId: string, actionType: string): void {
        try {
            this.campaignPlayerActionCounter.inc({
                campaign_id: campaignId,
                player_id: playerId,
                action_type: this.sanitizeLabel(actionType)
            });
            
            // Update campaign last activity
            const campaign = this.activeCampaigns.get(campaignId);
            if (campaign) {
                campaign.lastActivity = Date.now();
                this.activeCampaigns.set(campaignId, campaign);
            }
            
            logger.debug(`Player action tracked: campaign=${campaignId}, action=${actionType}`, {
                playerId
            });
        } catch (error) {
            logger.error('Failed to track campaign player action:', ensureError(error));
        }
    }
    
    // ============================================================================
    // LLM Request Tracking Implementation
    // ============================================================================
    
    trackLLMRequest(provider: 'openai' | 'ollama', model: string, requestType: 'chat' | 'embedding' | 'completion'): void {
        try {
            const requestId = `${provider}-${model}-${Date.now()}-${Math.random()}`;
            
            // Track the start of the request
            this.activeLLMRequests.set(requestId, {
                provider,
                model: this.sanitizeLabel(model),
                requestType,
                startTime: Date.now()
            });
            
            logger.debug(`LLM request started: ${provider}/${model}/${requestType}`, {
                requestId,
                activeRequests: this.activeLLMRequests.size
            });
        } catch (error) {
            logger.error('Failed to track LLM request:', ensureError(error));
        }
    }
    
    trackLLMResponse(provider: 'openai' | 'ollama', model: string, responseTime: number, tokenCount?: number, success?: boolean): void {
        try {
            const successStr = success !== undefined ? String(success) : 'true';
            
            this.llmRequestCounter.inc({
                provider,
                model: this.sanitizeLabel(model),
                request_type: 'chat', // Default, should be passed from context
                success: successStr
            });
            
            this.llmResponseTimeHistogram.observe({
                provider,
                model: this.sanitizeLabel(model),
                request_type: 'chat'
            }, responseTime);
            
            if (tokenCount) {
                this.llmTokenUsageHistogram.observe({
                    provider,
                    model: this.sanitizeLabel(model),
                    token_type: 'total'
                }, tokenCount);
                
                this.totalLLMTokensUsed += tokenCount;
                
                // Estimate cost (approximate values)
                const estimatedCost = this.estimateLLMCost(provider, model, tokenCount);
                if (estimatedCost > 0) {
                    this.llmCostGauge.inc({
                        provider,
                        model: this.sanitizeLabel(model),
                        time_period: 'session'
                    }, estimatedCost);
                }
            }
            
            logger.debug(`LLM response tracked: ${provider}/${model}`, {
                responseTime,
                tokenCount,
                success,
                totalTokensUsed: this.totalLLMTokensUsed
            });
        } catch (error) {
            logger.error('Failed to track LLM response:', ensureError(error));
        }
    }
    
    trackLLMError(provider: 'openai' | 'ollama', model: string, errorType: string): void {
        try {
            this.llmErrorCounter.inc({
                provider,
                model: this.sanitizeLabel(model),
                error_type: this.sanitizeLabel(errorType)
            });
            
            logger.warn(`LLM error tracked: ${provider}/${model}/${errorType}`);
        } catch (error) {
            logger.error('Failed to track LLM error:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Vector Embedding Performance Implementation
    // ============================================================================
    
    trackVectorEmbeddingGeneration(documentCount: number, processingTime: number): void {
        try {
            const documentCategory = this.categorizeDocumentCount(documentCount);
            
            this.vectorEmbeddingCounter.inc({
                document_type: 'campaign_content',
                success: 'true'
            }, documentCount);
            
            this.vectorEmbeddingTimeHistogram.observe({
                document_count_category: documentCategory
            }, processingTime);
            
            logger.debug(`Vector embedding generation tracked: ${documentCount} docs in ${processingTime}ms`);
        } catch (error) {
            logger.error('Failed to track vector embedding generation:', ensureError(error));
        }
    }
    
    trackVectorSimilaritySearch(queryType: string, resultCount: number, searchTime: number): void {
        try {
            const resultCategory = this.categorizeResultCount(resultCount);
            
            this.vectorSimilaritySearchCounter.inc({
                query_type: this.sanitizeLabel(queryType),
                result_count_category: resultCategory
            });
            
            this.vectorSimilaritySearchTimeHistogram.observe({
                query_type: this.sanitizeLabel(queryType)
            }, searchTime);
            
            logger.debug(`Vector similarity search tracked: ${queryType}, ${resultCount} results in ${searchTime}ms`);
        } catch (error) {
            logger.error('Failed to track vector similarity search:', ensureError(error));
        }
    }
    
    trackVectorIndexUpdate(operation: 'add' | 'update' | 'delete', documentCount: number): void {
        try {
            this.vectorIndexOperationCounter.inc({
                operation,
                success: 'true'
            }, documentCount);
            
            logger.debug(`Vector index update tracked: ${operation} ${documentCount} documents`);
        } catch (error) {
            logger.error('Failed to track vector index update:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Cross-Server Bridge Activity Implementation
    // ============================================================================
    
    trackBridgeMessage(sourceGuild: string, targetGuild: string, messageType: 'chat' | 'embed' | 'attachment'): void {
        try {
            this.bridgeMessageCounter.inc({
                source_guild: sourceGuild,
                target_guild: targetGuild,
                message_type: messageType,
                success: 'true'
            });
            
            // Track active bridge connection
            const bridgeConnection = `${sourceGuild}-${targetGuild}`;
            this.bridgeConnections.add(bridgeConnection);
            this.activeBridgesGauge.set(this.bridgeConnections.size);
            
            logger.debug(`Bridge message tracked: ${sourceGuild} -> ${targetGuild} (${messageType})`);
        } catch (error) {
            logger.error('Failed to track bridge message:', ensureError(error));
        }
    }
    
    trackBridgeLatency(sourceGuild: string, targetGuild: string, deliveryTime: number): void {
        try {
            this.bridgeLatencyHistogram.observe({
                source_guild: sourceGuild,
                target_guild: targetGuild
            }, deliveryTime);
            
            logger.debug(`Bridge latency tracked: ${sourceGuild} -> ${targetGuild} (${deliveryTime}ms)`);
        } catch (error) {
            logger.error('Failed to track bridge latency:', ensureError(error));
        }
    }
    
    // ============================================================================
    // File Processing Metrics Implementation
    // ============================================================================
    
    trackFileProcessing(fileType: string, fileSizeBytes: number, processingTime: number, success: boolean): void {
        try {
            const sizeCategory = this.categorizeFileSize(fileSizeBytes);
            
            this.fileProcessingCounter.inc({
                file_type: this.sanitizeLabel(fileType),
                success: String(success),
                size_category: sizeCategory
            });
            
            this.fileProcessingTimeHistogram.observe({
                file_type: this.sanitizeLabel(fileType),
                size_category: sizeCategory
            }, processingTime);
            
            this.fileSizeHistogram.observe({
                file_type: this.sanitizeLabel(fileType)
            }, fileSizeBytes);
            
            this.totalFilesProcessed++;
            
            logger.debug(`File processing tracked: ${fileType} (${fileSizeBytes} bytes, ${processingTime}ms, success=${success})`);
        } catch (error) {
            logger.error('Failed to track file processing:', ensureError(error));
        }
    }
    
    trackFileUpload(fileName: string, sizeBytes: number, uploadTime: number): void {
        try {
            const extension = fileName.split('.').pop() || 'unknown';
            const sizeCategory = this.categorizeFileSize(sizeBytes);
            
            this.fileUploadCounter.inc({
                file_extension: this.sanitizeLabel(extension),
                size_category: sizeCategory
            });
            
            this.fileUploadTimeHistogram.observe({
                size_category: sizeCategory
            }, uploadTime);
            
            logger.debug(`File upload tracked: ${fileName} (${sizeBytes} bytes, ${uploadTime}ms)`);
        } catch (error) {
            logger.error('Failed to track file upload:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Helper Methods
    // ============================================================================
    
    private updateActiveCampaignsGauge(): void {
        const statusCounts = { active: 0, paused: 0, archived: 0 };
        
        for (const campaign of this.activeCampaigns.values()) {
            statusCounts[campaign.status]++;
        }
        
        for (const [status, count] of Object.entries(statusCounts)) {
            this.activeCampaignsGauge.set({ status }, count);
        }
    }
    
    private estimateLLMCost(provider: string, model: string, tokenCount: number): number {
        // Approximate cost calculation - should be updated with actual pricing
        if (provider === 'openai') {
            if (model.includes('gpt-4')) {
                return (tokenCount / 1000) * 0.03; // $0.03 per 1K tokens (approximate)
            } else if (model.includes('gpt-3.5')) {
                return (tokenCount / 1000) * 0.002; // $0.002 per 1K tokens (approximate)
            }
        }
        return 0; // Ollama is typically free/self-hosted
    }
    
    private categorizeDocumentCount(count: number): string {
        if (count <= 1) return 'single';
        if (count <= 10) return 'small_batch';
        if (count <= 100) return 'medium_batch';
        return 'large_batch';
    }
    
    private categorizeResultCount(count: number): string {
        if (count === 0) return 'no_results';
        if (count <= 5) return 'few_results';
        if (count <= 20) return 'many_results';
        return 'large_results';
    }
    
    private categorizeFileSize(sizeBytes: number): string {
        const sizeMB = sizeBytes / (1024 * 1024);
        if (sizeMB < 0.1) return 'tiny';
        if (sizeMB < 1) return 'small';
        if (sizeMB < 10) return 'medium';
        if (sizeMB < 100) return 'large';
        return 'huge';
    }
    
    private setupPeriodicTasks(): void {
        // Clean up stale LLM requests every 5 minutes
        setInterval(() => {
            this.cleanupStaleLLMRequests();
        }, 5 * 60 * 1000);
        
        // Update cost metrics every hour
        setInterval(() => {
            this.updateCostMetrics();
        }, 60 * 60 * 1000);
    }
    
    private cleanupStaleLLMRequests(): void {
        const now = Date.now();
        const staleThreshold = 10 * 60 * 1000; // 10 minutes
        
        for (const [requestId, request] of this.activeLLMRequests.entries()) {
            if (now - request.startTime > staleThreshold) {
                this.activeLLMRequests.delete(requestId);
                logger.debug(`Cleaned up stale LLM request: ${requestId}`);
            }
        }
    }
    
    private updateCostMetrics(): void {
        // Reset hourly cost tracking (this would be more sophisticated in production)
        logger.debug('Cost metrics updated');
    }
    
    // ============================================================================
    // Health and Status Methods
    // ============================================================================
    
    getHealthStatus(): Record<string, any> {
        return {
            containerType: 'starbunk-dnd',
            campaigns: {
                active: this.activeCampaigns.size,
                statusBreakdown: this.getCampaignStatusSummary()
            },
            llmRequests: {
                active: this.activeLLMRequests.size,
                totalTokensUsed: this.totalLLMTokensUsed
            },
            vectorOperations: {
                active: this.activeVectorOperations.size
            },
            bridges: {
                active: this.bridgeConnections.size,
                connections: Array.from(this.bridgeConnections)
            },
            fileProcessing: {
                totalProcessed: this.totalFilesProcessed
            },
            lastUpdate: Date.now()
        };
    }
    
    private getCampaignStatusSummary(): Record<string, number> {
        const summary: Record<string, number> = {};
        
        for (const campaign of this.activeCampaigns.values()) {
            summary[campaign.status] = (summary[campaign.status] || 0) + 1;
        }
        
        return summary;
    }
    
    getMetricsSummary(): Record<string, any> {
        return {
            campaignManagement: {
                operations: 'counter_metric',
                activeCampaigns: this.activeCampaigns.size,
                playerActions: 'counter_metric'
            },
            llmUsage: {
                requestCount: 'counter_metric',
                responsePerformance: 'histogram_metric',
                tokenUsage: this.totalLLMTokensUsed,
                estimatedCost: 'gauge_metric'
            },
            vectorEmbeddings: {
                generationPerformance: 'histogram_metric',
                searchPerformance: 'histogram_metric',
                indexOperations: 'counter_metric'
            },
            serverBridges: {
                messageCount: 'counter_metric',
                latencyTracking: 'histogram_metric',
                activeBridges: this.bridgeConnections.size
            },
            fileProcessing: {
                processingPerformance: 'histogram_metric',
                uploadPerformance: 'histogram_metric',
                totalProcessed: this.totalFilesProcessed
            }
        };
    }
    
    async cleanup(): Promise<void> {
        try {
            // Clear all internal state
            this.activeCampaigns.clear();
            this.activeLLMRequests.clear();
            this.activeVectorOperations.clear();
            this.bridgeConnections.clear();
            
            // Reset gauges
            this.updateActiveCampaignsGauge();
            this.activeBridgesGauge.set(0);
            
            logger.info('Starbunk-DND metrics collector cleaned up successfully');
        } catch (error) {
            logger.error('Error during Starbunk-DND metrics cleanup:', ensureError(error));
            throw error;
        }
    }
}

// Factory function for creating Starbunk-DND metrics collector
export function createStarbunkDNDMetrics(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}): StarbunkDNDMetricsCollector {
    return new StarbunkDNDMetricsCollector(metrics, config);
}