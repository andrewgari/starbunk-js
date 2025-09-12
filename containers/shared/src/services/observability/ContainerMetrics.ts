// Container-specific metrics interfaces and types
// Extends the existing ProductionMetricsService with specialized metrics for each container

import { ProductionMetricsService } from './ProductionMetricsService';
import * as promClient from 'prom-client';

// ============================================================================
// BunkBot Container Metrics
// ============================================================================

export interface BunkBotMetrics {
    // Reply Bot Trigger Metrics
    trackBotTrigger(botName: string, conditionName: string, messageContext: MessageContext): void;
    trackBotResponse(botName: string, conditionName: string, responseTime: number, messageContext: MessageContext): void;
    trackBotSkip(botName: string, skipReason: string, messageContext: MessageContext): void;
    
    // Bot Registry Metrics
    trackBotRegistryLoad(totalBots: number, loadDuration: number): void;
    trackBotRegistryUpdate(added: number, removed: number, updated: number): void;
    
    // Message Processing Pipeline Metrics
    trackMessageProcessingStart(messageId: string, botCount: number): void;
    trackMessageProcessingComplete(messageId: string, triggeredBots: number, processingTime: number): void;
    
    // Circuit Breaker Metrics (inherited from base but specialized)
    trackCircuitBreakerState(botName: string, state: 'open' | 'closed' | 'half-open', failureCount: number): void;
    
    // Webhook Delivery Metrics
    trackWebhookDelivery(botName: string, success: boolean, deliveryTime: number, statusCode?: number): void;
    
    // Base methods from ContainerMetricsBase
    getHealthStatus(): Record<string, any>;
    cleanup(): Promise<void>;
    getMetricsSummary(): Record<string, any>;
}

// ============================================================================
// DJCova Container Metrics
// ============================================================================

export interface DJCovaMetrics {
    // Music Session Metrics
    trackMusicSessionStart(guildId: string, userId: string, source: string): void;
    trackMusicSessionEnd(guildId: string, duration: number, reason: 'completed' | 'stopped' | 'error' | 'idle'): void;
    
    // Voice Connection Health Metrics
    trackVoiceConnectionState(guildId: string, state: 'connecting' | 'ready' | 'disconnected' | 'reconnecting'): void;
    trackVoiceConnectionLatency(guildId: string, latency: number): void;
    
    // Audio Processing Performance
    trackAudioProcessingStart(guildId: string, audioType: 'youtube' | 'file' | 'stream'): void;
    trackAudioProcessingComplete(guildId: string, processingTime: number, success: boolean): void;
    trackAudioBufferingEvents(guildId: string, bufferTime: number): void;
    
    // Idle Management Metrics  
    trackIdleTimerStart(guildId: string, timeoutSeconds: number): void;
    trackIdleDisconnect(guildId: string, idleDuration: number): void;
    trackIdleTimerReset(guildId: string): void;
    
    // Audio Source Tracking
    trackAudioSourceRequest(source: string, success: boolean, responseTime: number): void;
    trackVolumeChange(guildId: string, oldVolume: number, newVolume: number): void;
    
    // Base methods from ContainerMetricsBase
    getHealthStatus(): Record<string, any>;
    cleanup(): Promise<void>;
    getMetricsSummary(): Record<string, any>;
}

// ============================================================================
// Starbunk-DND Container Metrics
// ============================================================================

export interface StarbunkDNDMetrics {
    // Campaign Management Metrics
    trackCampaignOperation(operation: 'create' | 'update' | 'delete' | 'load', campaignId?: string, duration?: number): void;
    trackCampaignPlayerAction(campaignId: string, playerId: string, actionType: string): void;
    
    // LLM Request Tracking
    trackLLMRequest(provider: 'openai' | 'ollama', model: string, requestType: 'chat' | 'embedding' | 'completion'): void;
    trackLLMResponse(provider: 'openai' | 'ollama', model: string, responseTime: number, tokenCount?: number, success?: boolean): void;
    trackLLMError(provider: 'openai' | 'ollama', model: string, errorType: string): void;
    
    // Vector Embedding Performance
    trackVectorEmbeddingGeneration(documentCount: number, processingTime: number): void;
    trackVectorSimilaritySearch(queryType: string, resultCount: number, searchTime: number): void;
    trackVectorIndexUpdate(operation: 'add' | 'update' | 'delete', documentCount: number): void;
    
    // Cross-Server Bridge Activity
    trackBridgeMessage(sourceGuild: string, targetGuild: string, messageType: 'chat' | 'embed' | 'attachment'): void;
    trackBridgeLatency(sourceGuild: string, targetGuild: string, deliveryTime: number): void;
    
    // File Processing Metrics
    trackFileProcessing(fileType: string, fileSizeBytes: number, processingTime: number, success: boolean): void;
    trackFileUpload(fileName: string, sizeBytes: number, uploadTime: number): void;
}

// ============================================================================
// CovaBot Container Metrics
// ============================================================================

export interface CovaBotMetrics {
    // AI Personality Response Metrics
    trackPersonalityTrigger(triggerType: 'mention' | 'keyword' | 'probability' | 'stats', messageContext: MessageContext): void;
    trackPersonalityResponse(responseTime: number, responseLength: number, responseType: 'simple' | 'complex' | 'error'): void;
    
    // Conversation Context Tracking
    trackContextRetrieval(userId: string, contextItems: number, retrievalTime: number): void;
    trackContextUpdate(userId: string, newContextSize: number): void;
    trackContextExpiry(userId: string, expiredItems: number): void;
    
    // Memory System Performance
    trackMemoryOperation(operation: 'store' | 'retrieve' | 'update' | 'cleanup', duration: number): void;
    trackMemorySize(totalMemoryItems: number, memorySizeBytes: number): void;
    
    // LLM Inference Metrics (specialized for personality AI)
    trackPersonalityLLMRequest(model: string, promptType: 'personality' | 'context' | 'response'): void;
    trackPersonalityLLMResponse(model: string, responseTime: number, tokenCount: number): void;
    
    // User Engagement Tracking
    trackUserInteraction(userId: string, interactionType: 'mention' | 'reply' | 'conversation'): void;
    trackUserEngagementSession(userId: string, sessionDuration: number, messageCount: number): void;
}

// ============================================================================
// Shared Types and Context
// ============================================================================

export interface MessageContext {
    messageId: string;
    userId: string;
    username: string;
    channelId: string;
    channelName: string;
    guildId: string;
    guildName?: string;
    messageLength: number;
    timestamp: number;
}

// Base container metrics class that all containers extend
export abstract class ContainerMetricsBase {
    protected metrics: ProductionMetricsService;
    protected registry: promClient.Registry;
    protected containerName: string;
    
    constructor(metrics: ProductionMetricsService, containerName: string) {
        this.metrics = metrics;
        this.registry = (metrics as any).registry; // Access protected registry
        this.containerName = containerName;
    }
    
    /**
     * Get health status including container-specific metrics
     */
    abstract getHealthStatus(): Record<string, any>;
    
    /**
     * Cleanup container-specific resources
     */
    abstract cleanup(): Promise<void>;
    
    /**
     * Get container-specific metrics summary
     */
    abstract getMetricsSummary(): Record<string, any>;
    
    protected sanitizeLabel(value: string): string {
        return value
            .replace(/[^\w\-\.]/g, '_')
            .substring(0, 100)
            .toLowerCase();
    }
    
    protected createMessageContext(data: {
        messageId?: string;
        userId: string;
        username: string;
        channelId: string;
        channelName: string;
        guildId: string;
        guildName?: string;
        messageLength?: number;
    }): MessageContext {
        return {
            messageId: data.messageId || 'unknown',
            userId: data.userId,
            username: this.sanitizeLabel(data.username),
            channelId: data.channelId,
            channelName: this.sanitizeLabel(data.channelName),
            guildId: data.guildId,
            guildName: data.guildName ? this.sanitizeLabel(data.guildName) : undefined,
            messageLength: data.messageLength || 0,
            timestamp: Date.now()
        };
    }
}

// Export factory functions that will be implemented in separate files
export type ContainerMetricsFactory<T> = (metrics: ProductionMetricsService) => T;

// Container metrics initialization options
export interface ContainerMetricsConfig {
    enableDetailedTracking?: boolean;
    enablePerformanceMetrics?: boolean;
    enableErrorTracking?: boolean;
    maxLabelCardinality?: number;
    metricsRetentionDays?: number;
}