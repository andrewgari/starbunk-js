// Container-specific metrics interfaces and types
// Extends the existing ProductionMetricsService with specialized metrics for each container

import { ProductionMetricsService } from './production-metrics-service';
import * as promClient from 'prom-client';

// ============================================================================
// BunkBot Container Metrics
// ============================================================================

export interface BunkBotMetrics {
	// Reply Bot Trigger Metrics
	trackBotTrigger(botName: string, conditionName: string, messageContext: MessageContext): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackBotResponse(
		botName: string,
		conditionName: string,
		responseTime: number,
		messageContext: MessageContext,
	): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackBotSkip(botName: string, skipReason: string, messageContext: MessageContext): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Bot Registry Metrics
	trackBotRegistryLoad(totalBots: number, loadDuration: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackBotRegistryUpdate(added: number, removed: number, updated: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Message Processing Pipeline Metrics
	trackMessageProcessingStart(messageId: string, botCount: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackMessageProcessingComplete(messageId: string, triggeredBots: number, processingTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Circuit Breaker Metrics (inherited from base but specialized)
	trackCircuitBreakerState(botName: string, state: 'open' | 'closed' | 'half-open', failureCount: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Webhook Delivery Metrics
	trackWebhookDelivery(botName: string, success: boolean, deliveryTime: number, statusCode?: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

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
	trackMusicSessionStart(guildId: string, userId: string, source: string): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackMusicSessionEnd(guildId: string, duration: number, reason: 'completed' | 'stopped' | 'error' | 'idle'): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Voice Connection Health Metrics
	trackVoiceConnectionState(guildId: string, state: 'connecting' | 'ready' | 'disconnected' | 'reconnecting'): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackVoiceConnectionLatency(guildId: string, latency: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Audio Processing Performance
	trackAudioProcessingStart(guildId: string, audioType: 'youtube' | 'file' | 'stream'): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackAudioProcessingComplete(guildId: string, processingTime: number, success: boolean): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackAudioBufferingEvents(guildId: string, bufferTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Idle Management Metrics
	trackIdleTimerStart(guildId: string, timeoutSeconds: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackIdleDisconnect(guildId: string, idleDuration: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackIdleTimerReset(guildId: string): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Audio Source Tracking
	trackAudioSourceRequest(source: string, success: boolean, responseTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackVolumeChange(guildId: string, oldVolume: number, newVolume: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

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
	trackCampaignOperation(
		operation: 'create' | 'update' | 'delete' | 'load',
		campaignId?: string,
		duration?: number,
	): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackCampaignPlayerAction(campaignId: string, playerId: string, actionType: string): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// LLM Request Tracking
	trackLLMRequest(
		provider: 'openai' | 'ollama',
		model: string,
		requestType: 'chat' | 'embedding' | 'completion',
	): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackLLMResponse(
		provider: 'openai' | 'ollama',
		model: string,
		responseTime: number,
		tokenCount?: number,
		success?: boolean,
	): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackLLMError(provider: 'openai' | 'ollama', model: string, errorType: string): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Vector Embedding Performance
	trackVectorEmbeddingGeneration(documentCount: number, processingTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackVectorSimilaritySearch(queryType: string, resultCount: number, searchTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackVectorIndexUpdate(operation: 'add' | 'update' | 'delete', documentCount: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Cross-Server Bridge Activity
	trackBridgeMessage(sourceGuild: string, targetGuild: string, messageType: 'chat' | 'embed' | 'attachment'): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackBridgeLatency(sourceGuild: string, targetGuild: string, deliveryTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// File Processing Metrics
	trackFileProcessing(fileType: string, fileSizeBytes: number, processingTime: number, success: boolean): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackFileUpload(fileName: string, sizeBytes: number, uploadTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Base methods from ContainerMetricsBase
	getHealthStatus(): Record<string, any>;
	cleanup(): Promise<void>;
	getMetricsSummary(): Record<string, any>;
}

// ============================================================================
// CovaBot Container Metrics
// ============================================================================

export interface CovaBotMetrics {
	// AI Personality Response Metrics
	trackPersonalityTrigger(
		triggerType: 'mention' | 'keyword' | 'probability' | 'stats',
		messageContext: MessageContext,
	): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackPersonalityResponse(
		responseTime: number,
		responseLength: number,
		responseType: 'simple' | 'complex' | 'error',
	): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Conversation Context Tracking
	trackContextRetrieval(userId: string, contextItems: number, retrievalTime: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackContextUpdate(userId: string, newContextSize: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackContextExpiry(userId: string, expiredItems: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Memory System Performance
	trackMemoryOperation(operation: 'store' | 'retrieve' | 'update' | 'cleanup', duration: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackMemorySize(totalMemoryItems: number, memorySizeBytes: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// LLM Inference Metrics (specialized for personality AI)
	trackPersonalityLLMRequest(model: string, promptType: 'personality' | 'context' | 'response'): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackPersonalityLLMResponse(model: string, responseTime: number, tokenCount: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// User Engagement Tracking
	trackUserInteraction(userId: string, interactionType: 'mention' | 'reply' | 'conversation'): void; // eslint-disable-line @typescript-eslint/no-unused-vars
	trackUserEngagementSession(userId: string, sessionDuration: number, messageCount: number): void; // eslint-disable-line @typescript-eslint/no-unused-vars

	// Base methods from ContainerMetricsBase
	getHealthStatus(): Record<string, any>;
	cleanup(): Promise<void>;
	getMetricsSummary(): Record<string, any>;
}

// ============================================================================
// Shared Types and Context
// ============================================================================

export interface MessageContext {
	messageId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	userId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	username: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channelId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	channelName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	guildName?: string;
	messageLength: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	timestamp: number; // eslint-disable-line @typescript-eslint/no-unused-vars
}

// Base container metrics class that all containers extend
export abstract class ContainerMetricsBase {
	protected metrics: ProductionMetricsService; // eslint-disable-line @typescript-eslint/no-unused-vars
	protected registry: promClient.Registry; // eslint-disable-line @typescript-eslint/no-unused-vars
	protected containerName: string; // eslint-disable-line @typescript-eslint/no-unused-vars

	constructor(metrics: ProductionMetricsService, containerName: string) {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		this.metrics = metrics;
		// Be resilient if a mock ProductionMetricsService is provided without a registry
		const maybeRegistry = (metrics as any).registry as promClient.Registry | undefined;
		this.registry = maybeRegistry ?? new promClient.Registry();
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
		// eslint-disable-line @typescript-eslint/no-unused-vars
		return value
			.replace(/[^\w\-.]/g, '_')
			.substring(0, 100)
			.toLowerCase();
	}

	protected createMessageContext(data: {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		messageId?: string;
		userId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
		username: string; // eslint-disable-line @typescript-eslint/no-unused-vars
		channelId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
		channelName: string; // eslint-disable-line @typescript-eslint/no-unused-vars
		guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
		guildName?: string;
		messageLength?: number;
	}): MessageContext {
		return {
			messageId: data.messageId || 'unknown', // eslint-disable-line @typescript-eslint/no-unused-vars
			userId: data.userId, // eslint-disable-line @typescript-eslint/no-unused-vars
			username: this.sanitizeLabel(data.username), // eslint-disable-line @typescript-eslint/no-unused-vars
			channelId: data.channelId, // eslint-disable-line @typescript-eslint/no-unused-vars
			channelName: this.sanitizeLabel(data.channelName), // eslint-disable-line @typescript-eslint/no-unused-vars
			guildId: data.guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
			guildName: data.guildName ? this.sanitizeLabel(data.guildName) : undefined, // eslint-disable-line @typescript-eslint/no-unused-vars
			messageLength: data.messageLength || 0, // eslint-disable-line @typescript-eslint/no-unused-vars
			timestamp: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}
}

// Export factory functions that will be implemented in separate files
export type ContainerMetricsFactory<T> = (metrics: ProductionMetricsService) => T; // eslint-disable-line @typescript-eslint/no-unused-vars

// Container metrics initialization options
export interface ContainerMetricsConfig {
	enableDetailedTracking?: boolean;
	enablePerformanceMetrics?: boolean;
	enableErrorTracking?: boolean;
	maxLabelCardinality?: number;
	metricsRetentionDays?: number;
}
