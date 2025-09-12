// CovaBot Container-Specific Metrics Implementation
// Tracks AI personality responses, conversation context, memory system performance,
// LLM inference specialized for personality AI, and user engagement patterns

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { CovaBotMetrics, ContainerMetricsBase, MessageContext, ContainerMetricsConfig } from './ContainerMetrics';
import { ProductionMetricsService } from './ProductionMetricsService';

interface ConversationContext {
    userId: string;
    contextItems: number;
    lastUpdate: number;
    totalInteractions: number;
    sessionStart: number;
}

interface MemoryItem {
    userId: string;
    type: 'personality' | 'context' | 'preference' | 'history';
    sizeBytes: number;
    lastAccessed: number;
}

interface UserEngagementSession {
    userId: string;
    sessionStart: number;
    messageCount: number;
    lastInteraction: number;
    engagementScore: number;
}

export class CovaBotMetricsCollector extends ContainerMetricsBase implements CovaBotMetrics {
    // AI Personality Response Metrics
    private personalityTriggerCounter!: promClient.Counter<string>;
    private personalityResponseCounter!: promClient.Counter<string>;
    private personalityResponseTimeHistogram!: promClient.Histogram<string>;
    private personalityResponseLengthHistogram!: promClient.Histogram<string>;
    
    // Conversation Context Tracking Metrics
    private contextRetrievalCounter!: promClient.Counter<string>;
    private contextRetrievalTimeHistogram!: promClient.Histogram<string>;
    private contextUpdateCounter!: promClient.Counter<string>;
    private contextExpiryCounter!: promClient.Counter<string>;
    private activeContextsGauge!: promClient.Gauge<string>;
    
    // Memory System Performance Metrics
    private memoryOperationCounter!: promClient.Counter<string>;
    private memoryOperationTimeHistogram!: promClient.Histogram<string>;
    private memorySizeGauge!: promClient.Gauge<string>;
    private memoryItemsGauge!: promClient.Gauge<string>;
    private memoryHitRateGauge!: promClient.Gauge<string>;
    
    // LLM Inference Metrics (specialized for personality AI)
    private personalityLLMRequestCounter!: promClient.Counter<string>;
    private personalityLLMResponseTimeHistogram!: promClient.Histogram<string>;
    private personalityLLMTokenUsageHistogram!: promClient.Histogram<string>;
    private personalityLLMErrorCounter!: promClient.Counter<string>;
    
    // User Engagement Tracking Metrics
    private userInteractionCounter!: promClient.Counter<string>;
    private userEngagementScoreGauge!: promClient.Gauge<string>;
    private userSessionDurationHistogram!: promClient.Histogram<string>;
    private activeUsersGauge!: promClient.Gauge<string>;
    private userRetentionGauge!: promClient.Gauge<string>;
    
    // Internal state tracking for production monitoring
    private activeContexts = new Map<string, ConversationContext>();
    private memoryStore = new Map<string, MemoryItem[]>();
    private userSessions = new Map<string, UserEngagementSession>();
    private personalityStats = {
        totalResponses: 0,
        totalTokensGenerated: 0,
        averageResponseTime: 0,
        memoryHits: 0,
        memoryMisses: 0
    };
    
    constructor(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}) {
        super(metrics, 'covabot');
        this.initializeMetrics(config);
        
        // Set up periodic maintenance tasks
        this.setupPeriodicMaintenance();
        
        logger.info('CovaBot metrics collector initialized with AI personality and engagement tracking');
    }
    
    private initializeMetrics(config: ContainerMetricsConfig): void {
        // AI Personality Response Metrics
        this.personalityTriggerCounter = new promClient.Counter({
            name: 'covabot_personality_triggers_total',
            help: 'Total number of personality triggers',
            labelNames: ['trigger_type', 'user_id', 'channel_id', 'guild_id'],
            registers: [this.registry]
        });
        
        this.personalityResponseCounter = new promClient.Counter({
            name: 'covabot_personality_responses_total',
            help: 'Total number of personality responses generated',
            labelNames: ['response_type', 'user_id', 'channel_id', 'guild_id', 'success'],
            registers: [this.registry]
        });
        
        this.personalityResponseTimeHistogram = new promClient.Histogram({
            name: 'covabot_personality_response_duration_ms',
            help: 'AI personality response generation time in milliseconds',
            labelNames: ['response_type', 'complexity'],
            buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000],
            registers: [this.registry]
        });
        
        this.personalityResponseLengthHistogram = new promClient.Histogram({
            name: 'covabot_personality_response_length_chars',
            help: 'AI personality response length in characters',
            labelNames: ['response_type'],
            buckets: [10, 50, 100, 200, 500, 1000, 2000, 4000],
            registers: [this.registry]
        });
        
        // Conversation Context Tracking Metrics
        this.contextRetrievalCounter = new promClient.Counter({
            name: 'covabot_context_retrievals_total',
            help: 'Total context retrieval operations',
            labelNames: ['user_id', 'context_size_category', 'cache_hit'],
            registers: [this.registry]
        });
        
        this.contextRetrievalTimeHistogram = new promClient.Histogram({
            name: 'covabot_context_retrieval_duration_ms',
            help: 'Context retrieval time in milliseconds',
            labelNames: ['context_size_category'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
            registers: [this.registry]
        });
        
        this.contextUpdateCounter = new promClient.Counter({
            name: 'covabot_context_updates_total',
            help: 'Total context update operations',
            labelNames: ['user_id', 'update_type'],
            registers: [this.registry]
        });
        
        this.contextExpiryCounter = new promClient.Counter({
            name: 'covabot_context_expiries_total',
            help: 'Total context items expired',
            labelNames: ['user_id', 'expiry_reason'],
            registers: [this.registry]
        });
        
        this.activeContextsGauge = new promClient.Gauge({
            name: 'covabot_active_contexts',
            help: 'Number of active conversation contexts',
            labelNames: ['context_age_category'],
            registers: [this.registry]
        });
        
        // Memory System Performance Metrics
        this.memoryOperationCounter = new promClient.Counter({
            name: 'covabot_memory_operations_total',
            help: 'Total memory system operations',
            labelNames: ['operation', 'memory_type', 'success'],
            registers: [this.registry]
        });
        
        this.memoryOperationTimeHistogram = new promClient.Histogram({
            name: 'covabot_memory_operation_duration_ms',
            help: 'Memory operation time in milliseconds',
            labelNames: ['operation', 'memory_type'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
            registers: [this.registry]
        });
        
        this.memorySizeGauge = new promClient.Gauge({
            name: 'covabot_memory_size_bytes',
            help: 'Total memory system size in bytes',
            labelNames: ['memory_type'],
            registers: [this.registry]
        });
        
        this.memoryItemsGauge = new promClient.Gauge({
            name: 'covabot_memory_items_total',
            help: 'Total number of memory items stored',
            labelNames: ['memory_type'],
            registers: [this.registry]
        });
        
        this.memoryHitRateGauge = new promClient.Gauge({
            name: 'covabot_memory_hit_rate_percent',
            help: 'Memory cache hit rate percentage',
            labelNames: ['memory_type'],
            registers: [this.registry]
        });
        
        // LLM Inference Metrics (specialized for personality AI)
        this.personalityLLMRequestCounter = new promClient.Counter({
            name: 'covabot_personality_llm_requests_total',
            help: 'Total personality LLM requests',
            labelNames: ['model', 'prompt_type', 'success'],
            registers: [this.registry]
        });
        
        this.personalityLLMResponseTimeHistogram = new promClient.Histogram({
            name: 'covabot_personality_llm_response_time_ms',
            help: 'Personality LLM response time in milliseconds',
            labelNames: ['model', 'prompt_type'],
            buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 60000],
            registers: [this.registry]
        });
        
        this.personalityLLMTokenUsageHistogram = new promClient.Histogram({
            name: 'covabot_personality_llm_tokens_used',
            help: 'Tokens used in personality LLM requests',
            labelNames: ['model', 'token_type'],
            buckets: [10, 50, 100, 250, 500, 1000, 2000, 5000, 10000],
            registers: [this.registry]
        });
        
        this.personalityLLMErrorCounter = new promClient.Counter({
            name: 'covabot_personality_llm_errors_total',
            help: 'Total personality LLM errors',
            labelNames: ['model', 'error_type'],
            registers: [this.registry]
        });
        
        // User Engagement Tracking Metrics
        this.userInteractionCounter = new promClient.Counter({
            name: 'covabot_user_interactions_total',
            help: 'Total user interactions',
            labelNames: ['user_id', 'interaction_type', 'channel_id', 'guild_id'],
            registers: [this.registry]
        });
        
        this.userEngagementScoreGauge = new promClient.Gauge({
            name: 'covabot_user_engagement_score',
            help: 'User engagement score (0-100)',
            labelNames: ['user_id', 'engagement_category'],
            registers: [this.registry]
        });
        
        this.userSessionDurationHistogram = new promClient.Histogram({
            name: 'covabot_user_session_duration_seconds',
            help: 'User engagement session duration in seconds',
            labelNames: ['user_id', 'session_quality'],
            buckets: [30, 60, 300, 600, 1800, 3600, 7200, 14400], // 30s to 4h
            registers: [this.registry]
        });
        
        this.activeUsersGauge = new promClient.Gauge({
            name: 'covabot_active_users',
            help: 'Number of currently active users',
            labelNames: ['activity_level'],
            registers: [this.registry]
        });
        
        this.userRetentionGauge = new promClient.Gauge({
            name: 'covabot_user_retention_rate_percent',
            help: 'User retention rate percentage',
            labelNames: ['time_period'],
            registers: [this.registry]
        });
    }
    
    // ============================================================================
    // AI Personality Response Metrics Implementation
    // ============================================================================
    
    trackPersonalityTrigger(triggerType: 'mention' | 'keyword' | 'probability' | 'stats', messageContext: MessageContext): void {
        try {
            this.personalityTriggerCounter.inc({
                trigger_type: triggerType,
                user_id: messageContext.userId,
                channel_id: messageContext.channelId,
                guild_id: messageContext.guildId
            });
            
            // Update user engagement tracking
            this.updateUserEngagement(messageContext.userId, 'trigger');
            
            logger.debug(`Personality trigger tracked: ${triggerType}`, {
                messageId: messageContext.messageId,
                userId: messageContext.userId
            });
        } catch (error) {
            logger.error('Failed to track personality trigger:', ensureError(error));
        }
    }
    
    trackPersonalityResponse(responseTime: number, responseLength: number, responseType: 'simple' | 'complex' | 'error'): void {
        try {
            const complexity = this.categorizeComplexity(responseTime, responseLength);
            
            this.personalityResponseCounter.inc({
                response_type: responseType,
                user_id: 'aggregated', // Could track per user if needed
                channel_id: 'aggregated',
                guild_id: 'aggregated',
                success: responseType !== 'error' ? 'true' : 'false'
            });
            
            this.personalityResponseTimeHistogram.observe({
                response_type: responseType,
                complexity
            }, responseTime);
            
            this.personalityResponseLengthHistogram.observe({
                response_type: responseType
            }, responseLength);
            
            // Update internal stats
            this.personalityStats.totalResponses++;
            this.personalityStats.averageResponseTime = 
                (this.personalityStats.averageResponseTime * (this.personalityStats.totalResponses - 1) + responseTime) / 
                this.personalityStats.totalResponses;
            
            logger.debug(`Personality response tracked: ${responseType} (${responseTime}ms, ${responseLength} chars)`);
        } catch (error) {
            logger.error('Failed to track personality response:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Conversation Context Tracking Implementation
    // ============================================================================
    
    trackContextRetrieval(userId: string, contextItems: number, retrievalTime: number): void {
        try {
            const contextSizeCategory = this.categorizeContextSize(contextItems);
            const cacheHit = this.activeContexts.has(userId) ? 'true' : 'false';
            
            this.contextRetrievalCounter.inc({
                user_id: userId,
                context_size_category: contextSizeCategory,
                cache_hit: cacheHit
            });
            
            this.contextRetrievalTimeHistogram.observe({
                context_size_category: contextSizeCategory
            }, retrievalTime);
            
            // Update memory hit/miss stats
            if (cacheHit === 'true') {
                this.personalityStats.memoryHits++;
            } else {
                this.personalityStats.memoryMisses++;
            }
            
            this.updateMemoryHitRate();
            
            logger.debug(`Context retrieval tracked: user=${userId}, items=${contextItems}, time=${retrievalTime}ms, hit=${cacheHit}`);
        } catch (error) {
            logger.error('Failed to track context retrieval:', ensureError(error));
        }
    }
    
    trackContextUpdate(userId: string, newContextSize: number): void {
        try {
            const existingContext = this.activeContexts.get(userId);
            const updateType = existingContext ? 'update' : 'create';
            
            this.contextUpdateCounter.inc({
                user_id: userId,
                update_type: updateType
            });
            
            // Update or create context tracking
            const contextData: ConversationContext = {
                userId,
                contextItems: newContextSize,
                lastUpdate: Date.now(),
                totalInteractions: existingContext ? existingContext.totalInteractions + 1 : 1,
                sessionStart: existingContext ? existingContext.sessionStart : Date.now()
            };
            
            this.activeContexts.set(userId, contextData);
            this.updateActiveContextsGauge();
            
            logger.debug(`Context update tracked: user=${userId}, size=${newContextSize}, type=${updateType}`);
        } catch (error) {
            logger.error('Failed to track context update:', ensureError(error));
        }
    }
    
    trackContextExpiry(userId: string, expiredItems: number): void {
        try {
            this.contextExpiryCounter.inc({
                user_id: userId,
                expiry_reason: 'timeout'
            }, expiredItems);
            
            // Update active contexts
            const context = this.activeContexts.get(userId);
            if (context) {
                context.contextItems = Math.max(0, context.contextItems - expiredItems);
                if (context.contextItems === 0) {
                    this.activeContexts.delete(userId);
                } else {
                    this.activeContexts.set(userId, context);
                }
                this.updateActiveContextsGauge();
            }
            
            logger.debug(`Context expiry tracked: user=${userId}, expired=${expiredItems}`);
        } catch (error) {
            logger.error('Failed to track context expiry:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Memory System Performance Implementation
    // ============================================================================
    
    trackMemoryOperation(operation: 'store' | 'retrieve' | 'update' | 'cleanup', duration: number): void {
        try {
            const memoryType = 'personality'; // Default memory type
            
            this.memoryOperationCounter.inc({
                operation,
                memory_type: memoryType,
                success: 'true'
            });
            
            this.memoryOperationTimeHistogram.observe({
                operation,
                memory_type: memoryType
            }, duration);
            
            logger.debug(`Memory operation tracked: ${operation} (${duration}ms)`);
        } catch (error) {
            logger.error('Failed to track memory operation:', ensureError(error));
        }
    }
    
    trackMemorySize(totalMemoryItems: number, memorySizeBytes: number): void {
        try {
            this.memoryItemsGauge.set({
                memory_type: 'total'
            }, totalMemoryItems);
            
            this.memorySizeGauge.set({
                memory_type: 'total'
            }, memorySizeBytes);
            
            // Update memory type breakdown (simulated)
            const memoryTypes = ['personality', 'context', 'preference', 'history'];
            for (const memType of memoryTypes) {
                const typeItems = Math.floor(totalMemoryItems / memoryTypes.length);
                const typeSize = Math.floor(memorySizeBytes / memoryTypes.length);
                
                this.memoryItemsGauge.set({
                    memory_type: memType
                }, typeItems);
                
                this.memorySizeGauge.set({
                    memory_type: memType
                }, typeSize);
            }
            
            logger.debug(`Memory size tracked: ${totalMemoryItems} items, ${memorySizeBytes} bytes`);
        } catch (error) {
            logger.error('Failed to track memory size:', ensureError(error));
        }
    }
    
    // ============================================================================
    // LLM Inference Metrics Implementation (Personality-Specialized)
    // ============================================================================
    
    trackPersonalityLLMRequest(model: string, promptType: 'personality' | 'context' | 'response'): void {
        try {
            this.personalityLLMRequestCounter.inc({
                model: this.sanitizeLabel(model),
                prompt_type: promptType,
                success: 'pending'
            });
            
            logger.debug(`Personality LLM request tracked: ${model}/${promptType}`);
        } catch (error) {
            logger.error('Failed to track personality LLM request:', ensureError(error));
        }
    }
    
    trackPersonalityLLMResponse(model: string, responseTime: number, tokenCount: number): void {
        try {
            this.personalityLLMResponseTimeHistogram.observe({
                model: this.sanitizeLabel(model),
                prompt_type: 'response'
            }, responseTime);
            
            this.personalityLLMTokenUsageHistogram.observe({
                model: this.sanitizeLabel(model),
                token_type: 'total'
            }, tokenCount);
            
            this.personalityStats.totalTokensGenerated += tokenCount;
            
            logger.debug(`Personality LLM response tracked: ${model} (${responseTime}ms, ${tokenCount} tokens)`);
        } catch (error) {
            logger.error('Failed to track personality LLM response:', ensureError(error));
        }
    }
    
    // ============================================================================
    // User Engagement Tracking Implementation
    // ============================================================================
    
    trackUserInteraction(userId: string, interactionType: 'mention' | 'reply' | 'conversation'): void {
        try {
            this.userInteractionCounter.inc({
                user_id: userId,
                interaction_type: interactionType,
                channel_id: 'aggregated',
                guild_id: 'aggregated'
            });
            
            this.updateUserEngagement(userId, interactionType);
            
            logger.debug(`User interaction tracked: user=${userId}, type=${interactionType}`);
        } catch (error) {
            logger.error('Failed to track user interaction:', ensureError(error));
        }
    }
    
    trackUserEngagementSession(userId: string, sessionDuration: number, messageCount: number): void {
        try {
            const durationSeconds = sessionDuration / 1000;
            const sessionQuality = this.categorizeSessionQuality(durationSeconds, messageCount);
            
            this.userSessionDurationHistogram.observe({
                user_id: userId,
                session_quality: sessionQuality
            }, durationSeconds);
            
            // Calculate and update engagement score
            const engagementScore = this.calculateEngagementScore(sessionDuration, messageCount);
            this.userEngagementScoreGauge.set({
                user_id: userId,
                engagement_category: this.categorizeEngagement(engagementScore)
            }, engagementScore);
            
            // Remove from active sessions
            this.userSessions.delete(userId);
            this.updateActiveUsersGauge();
            
            logger.debug(`User session tracked: user=${userId}, duration=${durationSeconds}s, messages=${messageCount}, score=${engagementScore}`);
        } catch (error) {
            logger.error('Failed to track user engagement session:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Helper Methods
    // ============================================================================
    
    private categorizeComplexity(responseTime: number, responseLength: number): string {
        if (responseTime < 500 && responseLength < 100) return 'simple';
        if (responseTime < 2000 && responseLength < 500) return 'moderate';
        return 'complex';
    }
    
    private categorizeContextSize(items: number): string {
        if (items <= 5) return 'small';
        if (items <= 20) return 'medium';
        if (items <= 50) return 'large';
        return 'very_large';
    }
    
    private categorizeSessionQuality(durationSeconds: number, messageCount: number): string {
        const messagesPerMinute = messageCount / (durationSeconds / 60);
        if (messagesPerMinute > 2 && durationSeconds > 300) return 'high_quality';
        if (messagesPerMinute > 1 && durationSeconds > 60) return 'good_quality';
        return 'basic_quality';
    }
    
    private categorizeEngagement(score: number): string {
        if (score >= 80) return 'highly_engaged';
        if (score >= 60) return 'engaged';
        if (score >= 40) return 'moderately_engaged';
        return 'low_engagement';
    }
    
    private calculateEngagementScore(durationMs: number, messageCount: number): number {
        const durationMinutes = durationMs / (1000 * 60);
        const messagesPerMinute = messageCount / Math.max(durationMinutes, 0.1);
        
        // Simple engagement score calculation
        let score = Math.min(messagesPerMinute * 20, 50); // Message frequency component
        score += Math.min(durationMinutes * 2, 30); // Duration component
        score += Math.min(messageCount * 2, 20); // Total messages component
        
        return Math.min(Math.max(score, 0), 100);
    }
    
    private updateUserEngagement(userId: string, activityType: string): void {
        const now = Date.now();
        let session = this.userSessions.get(userId);
        
        if (!session) {
            session = {
                userId,
                sessionStart: now,
                messageCount: 0,
                lastInteraction: now,
                engagementScore: 0
            };
        }
        
        session.messageCount++;
        session.lastInteraction = now;
        
        this.userSessions.set(userId, session);
        this.updateActiveUsersGauge();
    }
    
    private updateActiveContextsGauge(): void {
        const now = Date.now();
        const ageCounts = { recent: 0, medium: 0, old: 0 };
        
        for (const context of this.activeContexts.values()) {
            const age = now - context.lastUpdate;
            if (age < 5 * 60 * 1000) ageCounts.recent++;
            else if (age < 30 * 60 * 1000) ageCounts.medium++;
            else ageCounts.old++;
        }
        
        for (const [category, count] of Object.entries(ageCounts)) {
            this.activeContextsGauge.set({ context_age_category: category }, count);
        }
    }
    
    private updateActiveUsersGauge(): void {
        const now = Date.now();
        const activityLevels = { high: 0, medium: 0, low: 0 };
        
        for (const session of this.userSessions.values()) {
            const timeSinceLastInteraction = now - session.lastInteraction;
            if (timeSinceLastInteraction < 5 * 60 * 1000) activityLevels.high++;
            else if (timeSinceLastInteraction < 30 * 60 * 1000) activityLevels.medium++;
            else activityLevels.low++;
        }
        
        for (const [level, count] of Object.entries(activityLevels)) {
            this.activeUsersGauge.set({ activity_level: level }, count);
        }
    }
    
    private updateMemoryHitRate(): void {
        const totalRequests = this.personalityStats.memoryHits + this.personalityStats.memoryMisses;
        if (totalRequests > 0) {
            const hitRate = (this.personalityStats.memoryHits / totalRequests) * 100;
            this.memoryHitRateGauge.set({ memory_type: 'context' }, hitRate);
        }
    }
    
    private setupPeriodicMaintenance(): void {
        // Clean up stale sessions every 5 minutes
        setInterval(() => {
            this.cleanupStaleSessions();
        }, 5 * 60 * 1000);
        
        // Update retention metrics every hour
        setInterval(() => {
            this.updateRetentionMetrics();
        }, 60 * 60 * 1000);
    }
    
    private cleanupStaleSessions(): void {
        const now = Date.now();
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes
        const contextTimeout = 60 * 60 * 1000; // 1 hour
        
        // Clean up stale user sessions
        for (const [userId, session] of this.userSessions.entries()) {
            if (now - session.lastInteraction > sessionTimeout) {
                this.trackUserEngagementSession(
                    userId,
                    now - session.sessionStart,
                    session.messageCount
                );
            }
        }
        
        // Clean up stale contexts
        for (const [userId, context] of this.activeContexts.entries()) {
            if (now - context.lastUpdate > contextTimeout) {
                this.trackContextExpiry(userId, context.contextItems);
            }
        }
    }
    
    private updateRetentionMetrics(): void {
        // Calculate user retention rate (simplified)
        const recentUsers = this.userSessions.size;
        const retentionRate = Math.min((recentUsers / Math.max(this.personalityStats.totalResponses, 1)) * 100, 100);
        
        this.userRetentionGauge.set({
            time_period: 'hourly'
        }, retentionRate);
    }
    
    // ============================================================================
    // Health and Status Methods
    // ============================================================================
    
    getHealthStatus(): Record<string, any> {
        return {
            containerType: 'covabot',
            personalityEngine: {
                totalResponses: this.personalityStats.totalResponses,
                averageResponseTime: this.personalityStats.averageResponseTime,
                totalTokensGenerated: this.personalityStats.totalTokensGenerated
            },
            conversationContext: {
                activeContexts: this.activeContexts.size,
                contextHitRate: this.personalityStats.memoryHits / 
                    Math.max(this.personalityStats.memoryHits + this.personalityStats.memoryMisses, 1) * 100
            },
            userEngagement: {
                activeSessions: this.userSessions.size,
                totalInteractions: this.getActiveSessionsTotal()
            },
            memorySystem: {
                hitRate: this.personalityStats.memoryHits / 
                    Math.max(this.personalityStats.memoryHits + this.personalityStats.memoryMisses, 1) * 100
            },
            lastUpdate: Date.now()
        };
    }
    
    private getActiveSessionsTotal(): number {
        return Array.from(this.userSessions.values()).reduce((sum, session) => sum + session.messageCount, 0);
    }
    
    getMetricsSummary(): Record<string, any> {
        return {
            personalityResponses: {
                triggerCount: 'counter_metric',
                responsePerformance: 'histogram_metric',
                responseQuality: 'histogram_metric',
                totalGenerated: this.personalityStats.totalResponses
            },
            conversationContext: {
                retrievalPerformance: 'histogram_metric',
                activeContexts: this.activeContexts.size,
                contextUpdates: 'counter_metric',
                cacheHitRate: this.personalityStats.memoryHits / 
                    Math.max(this.personalityStats.memoryHits + this.personalityStats.memoryMisses, 1) * 100
            },
            memorySystem: {
                operationPerformance: 'histogram_metric',
                memoryUsage: 'gauge_metric',
                hitRate: 'gauge_metric'
            },
            llmInference: {
                requestCount: 'counter_metric',
                responsePerformance: 'histogram_metric',
                tokenUsage: this.personalityStats.totalTokensGenerated
            },
            userEngagement: {
                interactionTracking: 'counter_metric',
                sessionPerformance: 'histogram_metric',
                activeUsers: this.userSessions.size,
                retentionRate: 'gauge_metric'
            }
        };
    }
    
    async cleanup(): Promise<void> {
        try {
            // Clear all internal state
            this.activeContexts.clear();
            this.memoryStore.clear();
            this.userSessions.clear();
            
            // Reset stats
            this.personalityStats = {
                totalResponses: 0,
                totalTokensGenerated: 0,
                averageResponseTime: 0,
                memoryHits: 0,
                memoryMisses: 0
            };
            
            // Reset gauges
            this.updateActiveContextsGauge();
            this.updateActiveUsersGauge();
            
            logger.info('CovaBot metrics collector cleaned up successfully');
        } catch (error) {
            logger.error('Error during CovaBot metrics cleanup:', ensureError(error));
            throw error;
        }
    }
}

// Factory function for creating CovaBot metrics collector
export function createCovaBotMetrics(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}): CovaBotMetricsCollector {
    return new CovaBotMetricsCollector(metrics, config);
}