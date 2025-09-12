// DJCova Container-Specific Metrics Implementation
// Tracks music sessions, voice connections, audio processing performance,
// idle management, and audio source tracking for production monitoring

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { DJCovaMetrics, ContainerMetricsBase, ContainerMetricsConfig } from './ContainerMetrics';
import { ProductionMetricsService } from './ProductionMetricsService';

interface MusicSession {
    guildId: string;
    userId: string;
    startTime: number;
    source: string;
    status: 'active' | 'paused' | 'stopped' | 'error';
}

interface VoiceConnectionState {
    guildId: string;
    state: 'connecting' | 'ready' | 'disconnected' | 'reconnecting';
    lastUpdate: number;
    latency?: number;
}

export class DJCovaMetricsCollector extends ContainerMetricsBase implements DJCovaMetrics {
    // Music Session Metrics
    private musicSessionCounter!: promClient.Counter<string>;
    private musicSessionDurationHistogram!: promClient.Histogram<string>;
    private activeMusicSessionsGauge!: promClient.Gauge<string>;
    private musicSessionEndCounter!: promClient.Counter<string>;
    
    // Voice Connection Health Metrics
    private voiceConnectionStateGauge!: promClient.Gauge<string>;
    private voiceConnectionTransitionCounter!: promClient.Counter<string>;
    private voiceConnectionLatencyHistogram!: promClient.Histogram<string>;
    private voiceConnectionErrorCounter!: promClient.Counter<string>;
    
    // Audio Processing Performance Metrics
    private audioProcessingCounter!: promClient.Counter<string>;
    private audioProcessingTimeHistogram!: promClient.Histogram<string>;
    private audioBufferingHistogram!: promClient.Histogram<string>;
    private audioQualityGauge!: promClient.Gauge<string>;
    
    // Idle Management Metrics
    private idleTimerCounter!: promClient.Counter<string>;
    private idleDisconnectCounter!: promClient.Counter<string>;
    private idleTimerResetCounter!: promClient.Counter<string>;
    private idleTimeoutGauge!: promClient.Gauge<string>;
    
    // Audio Source Tracking Metrics
    private audioSourceRequestCounter!: promClient.Counter<string>;
    private audioSourceResponseTimeHistogram!: promClient.Histogram<string>;
    private volumeChangeCounter!: promClient.Counter<string>;
    private currentVolumeGauge!: promClient.Gauge<string>;
    
    // Internal state tracking for production monitoring
    private activeSessions = new Map<string, MusicSession>();
    private voiceConnections = new Map<string, VoiceConnectionState>();
    private audioProcessingQueue = new Set<string>();
    private totalSessionsCreated = 0;
    private totalAudioProcessed = 0;
    
    constructor(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}) {
        super(metrics, 'djcova');
        this.initializeMetrics(config);
        
        // Set up periodic cleanup of stale connections
        this.setupPeriodicCleanup();
        
        logger.info('DJCova metrics collector initialized with production-ready music service tracking');
    }
    
    private initializeMetrics(config: ContainerMetricsConfig): void {
        // Music Session Metrics
        this.musicSessionCounter = new promClient.Counter({
            name: 'djcova_music_sessions_total',
            help: 'Total number of music sessions started',
            labelNames: ['guild_id', 'source_type', 'user_id'],
            registers: [this.registry]
        });
        
        this.musicSessionDurationHistogram = new promClient.Histogram({
            name: 'djcova_music_session_duration_seconds',
            help: 'Duration of music sessions in seconds',
            labelNames: ['guild_id', 'end_reason', 'source_type'],
            buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600, 7200], // Up to 2 hours
            registers: [this.registry]
        });
        
        this.activeMusicSessionsGauge = new promClient.Gauge({
            name: 'djcova_active_music_sessions',
            help: 'Number of currently active music sessions',
            labelNames: ['status'],
            registers: [this.registry]
        });
        
        this.musicSessionEndCounter = new promClient.Counter({
            name: 'djcova_music_session_ends_total',
            help: 'Total number of music sessions ended',
            labelNames: ['guild_id', 'end_reason', 'duration_category'],
            registers: [this.registry]
        });
        
        // Voice Connection Health Metrics
        this.voiceConnectionStateGauge = new promClient.Gauge({
            name: 'djcova_voice_connection_state',
            help: 'Voice connection state (0=disconnected, 1=connecting, 2=ready, 3=reconnecting)',
            labelNames: ['guild_id'],
            registers: [this.registry]
        });
        
        this.voiceConnectionTransitionCounter = new promClient.Counter({
            name: 'djcova_voice_connection_transitions_total',
            help: 'Total voice connection state transitions',
            labelNames: ['guild_id', 'from_state', 'to_state'],
            registers: [this.registry]
        });
        
        this.voiceConnectionLatencyHistogram = new promClient.Histogram({
            name: 'djcova_voice_connection_latency_ms',
            help: 'Voice connection latency in milliseconds',
            labelNames: ['guild_id'],
            buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000],
            registers: [this.registry]
        });
        
        this.voiceConnectionErrorCounter = new promClient.Counter({
            name: 'djcova_voice_connection_errors_total',
            help: 'Total voice connection errors',
            labelNames: ['guild_id', 'error_type', 'recoverable'],
            registers: [this.registry]
        });
        
        // Audio Processing Performance Metrics
        this.audioProcessingCounter = new promClient.Counter({
            name: 'djcova_audio_processing_total',
            help: 'Total audio processing operations',
            labelNames: ['guild_id', 'audio_type', 'success'],
            registers: [this.registry]
        });
        
        this.audioProcessingTimeHistogram = new promClient.Histogram({
            name: 'djcova_audio_processing_duration_ms',
            help: 'Audio processing time in milliseconds',
            labelNames: ['guild_id', 'audio_type', 'success'],
            buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000],
            registers: [this.registry]
        });
        
        this.audioBufferingHistogram = new promClient.Histogram({
            name: 'djcova_audio_buffering_duration_ms',
            help: 'Audio buffering time in milliseconds',
            labelNames: ['guild_id', 'buffer_reason'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
            registers: [this.registry]
        });
        
        this.audioQualityGauge = new promClient.Gauge({
            name: 'djcova_audio_quality_score',
            help: 'Audio quality score (0-100)',
            labelNames: ['guild_id', 'quality_metric'],
            registers: [this.registry]
        });
        
        // Idle Management Metrics
        this.idleTimerCounter = new promClient.Counter({
            name: 'djcova_idle_timers_started_total',
            help: 'Total idle timers started',
            labelNames: ['guild_id', 'timeout_seconds'],
            registers: [this.registry]
        });
        
        this.idleDisconnectCounter = new promClient.Counter({
            name: 'djcova_idle_disconnects_total',
            help: 'Total idle disconnections',
            labelNames: ['guild_id', 'idle_duration_category'],
            registers: [this.registry]
        });
        
        this.idleTimerResetCounter = new promClient.Counter({
            name: 'djcova_idle_timer_resets_total',
            help: 'Total idle timer resets due to activity',
            labelNames: ['guild_id', 'reset_reason'],
            registers: [this.registry]
        });
        
        this.idleTimeoutGauge = new promClient.Gauge({
            name: 'djcova_idle_timeout_seconds',
            help: 'Current idle timeout setting in seconds',
            labelNames: ['guild_id'],
            registers: [this.registry]
        });
        
        // Audio Source Tracking Metrics
        this.audioSourceRequestCounter = new promClient.Counter({
            name: 'djcova_audio_source_requests_total',
            help: 'Total audio source requests',
            labelNames: ['source_type', 'success', 'cache_hit'],
            registers: [this.registry]
        });
        
        this.audioSourceResponseTimeHistogram = new promClient.Histogram({
            name: 'djcova_audio_source_response_time_ms',
            help: 'Audio source response time in milliseconds',
            labelNames: ['source_type', 'success'],
            buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000],
            registers: [this.registry]
        });
        
        this.volumeChangeCounter = new promClient.Counter({
            name: 'djcova_volume_changes_total',
            help: 'Total volume changes',
            labelNames: ['guild_id', 'change_type', 'user_id'],
            registers: [this.registry]
        });
        
        this.currentVolumeGauge = new promClient.Gauge({
            name: 'djcova_current_volume_percent',
            help: 'Current volume percentage',
            labelNames: ['guild_id'],
            registers: [this.registry]
        });
    }
    
    // ============================================================================
    // Music Session Metrics Implementation
    // ============================================================================
    
    trackMusicSessionStart(guildId: string, userId: string, source: string): void {
        try {
            const sourceType = this.categorizeAudioSource(source);
            
            // Increment session counter
            this.musicSessionCounter.inc({
                guild_id: guildId,
                source_type: sourceType,
                user_id: userId
            });
            
            // Track active session
            const session: MusicSession = {
                guildId,
                userId,
                startTime: Date.now(),
                source: sourceType,
                status: 'active'
            };
            
            this.activeSessions.set(guildId, session);
            this.totalSessionsCreated++;
            
            // Update active sessions gauge
            this.updateActiveSessionsGauge();
            
            logger.info(`Music session started tracked: guild=${guildId}, source=${sourceType}`, {
                userId,
                totalSessions: this.totalSessionsCreated
            });
        } catch (error) {
            logger.error('Failed to track music session start:', ensureError(error));
        }
    }
    
    trackMusicSessionEnd(guildId: string, duration: number, reason: 'completed' | 'stopped' | 'error' | 'idle'): void {
        try {
            const session = this.activeSessions.get(guildId);
            if (!session) {
                logger.warn(`Attempted to end non-existent music session: ${guildId}`);
                return;
            }
            
            const durationSeconds = duration / 1000;
            const durationCategory = this.categorizeDuration(duration);
            
            // Record session duration
            this.musicSessionDurationHistogram.observe({
                guild_id: guildId,
                end_reason: reason,
                source_type: session.source
            }, durationSeconds);
            
            // Increment session end counter
            this.musicSessionEndCounter.inc({
                guild_id: guildId,
                end_reason: reason,
                duration_category: durationCategory
            });
            
            // Remove from active sessions
            this.activeSessions.delete(guildId);
            this.updateActiveSessionsGauge();
            
            logger.info(`Music session ended tracked: guild=${guildId}, duration=${durationSeconds}s, reason=${reason}`);
        } catch (error) {
            logger.error('Failed to track music session end:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Voice Connection Health Metrics Implementation
    // ============================================================================
    
    trackVoiceConnectionState(guildId: string, state: 'connecting' | 'ready' | 'disconnected' | 'reconnecting'): void {
        try {
            const stateValue = this.getStateValue(state);
            const currentConnection = this.voiceConnections.get(guildId);
            
            // Track state transition if there was a previous state
            if (currentConnection) {
                this.voiceConnectionTransitionCounter.inc({
                    guild_id: guildId,
                    from_state: currentConnection.state,
                    to_state: state
                });
            }
            
            // Update state gauge
            this.voiceConnectionStateGauge.set({
                guild_id: guildId
            }, stateValue);
            
            // Update connection tracking
            this.voiceConnections.set(guildId, {
                guildId,
                state,
                lastUpdate: Date.now(),
                latency: currentConnection?.latency
            });
            
            logger.debug(`Voice connection state tracked: guild=${guildId}, state=${state}`, {
                stateValue,
                hasTransition: !!currentConnection
            });
        } catch (error) {
            logger.error('Failed to track voice connection state:', ensureError(error));
        }
    }
    
    trackVoiceConnectionLatency(guildId: string, latency: number): void {
        try {
            this.voiceConnectionLatencyHistogram.observe({
                guild_id: guildId
            }, latency);
            
            // Update connection latency tracking
            const connection = this.voiceConnections.get(guildId);
            if (connection) {
                connection.latency = latency;
                this.voiceConnections.set(guildId, connection);
            }
            
            logger.debug(`Voice connection latency tracked: guild=${guildId}, latency=${latency}ms`);
        } catch (error) {
            logger.error('Failed to track voice connection latency:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Audio Processing Performance Implementation
    // ============================================================================
    
    trackAudioProcessingStart(guildId: string, audioType: 'youtube' | 'file' | 'stream'): void {
        try {
            const processingId = `${guildId}-${Date.now()}`;
            this.audioProcessingQueue.add(processingId);
            
            logger.debug(`Audio processing started: guild=${guildId}, type=${audioType}`, {
                processingId,
                queueSize: this.audioProcessingQueue.size
            });
        } catch (error) {
            logger.error('Failed to track audio processing start:', ensureError(error));
        }
    }
    
    trackAudioProcessingComplete(guildId: string, processingTime: number, success: boolean): void {
        try {
            const audioType = 'youtube'; // Default, should be passed from caller in real implementation
            
            this.audioProcessingCounter.inc({
                guild_id: guildId,
                audio_type: audioType,
                success: String(success)
            });
            
            this.audioProcessingTimeHistogram.observe({
                guild_id: guildId,
                audio_type: audioType,
                success: String(success)
            }, processingTime);
            
            this.totalAudioProcessed++;
            
            logger.debug(`Audio processing completed: guild=${guildId}, time=${processingTime}ms, success=${success}`, {
                totalProcessed: this.totalAudioProcessed
            });
        } catch (error) {
            logger.error('Failed to track audio processing complete:', ensureError(error));
        }
    }
    
    trackAudioBufferingEvents(guildId: string, bufferTime: number): void {
        try {
            const bufferReason = bufferTime > 1000 ? 'network_slow' : 'normal_buffering';
            
            this.audioBufferingHistogram.observe({
                guild_id: guildId,
                buffer_reason: bufferReason
            }, bufferTime);
            
            logger.debug(`Audio buffering tracked: guild=${guildId}, bufferTime=${bufferTime}ms`);
        } catch (error) {
            logger.error('Failed to track audio buffering:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Idle Management Metrics Implementation
    // ============================================================================
    
    trackIdleTimerStart(guildId: string, timeoutSeconds: number): void {
        try {
            this.idleTimerCounter.inc({
                guild_id: guildId,
                timeout_seconds: String(timeoutSeconds)
            });
            
            this.idleTimeoutGauge.set({
                guild_id: guildId
            }, timeoutSeconds);
            
            logger.debug(`Idle timer started: guild=${guildId}, timeout=${timeoutSeconds}s`);
        } catch (error) {
            logger.error('Failed to track idle timer start:', ensureError(error));
        }
    }
    
    trackIdleDisconnect(guildId: string, idleDuration: number): void {
        try {
            const durationCategory = this.categorizeDuration(idleDuration);
            
            this.idleDisconnectCounter.inc({
                guild_id: guildId,
                idle_duration_category: durationCategory
            });
            
            logger.info(`Idle disconnect tracked: guild=${guildId}, duration=${idleDuration}ms`);
        } catch (error) {
            logger.error('Failed to track idle disconnect:', ensureError(error));
        }
    }
    
    trackIdleTimerReset(guildId: string): void {
        try {
            this.idleTimerResetCounter.inc({
                guild_id: guildId,
                reset_reason: 'user_activity'
            });
            
            logger.debug(`Idle timer reset tracked: guild=${guildId}`);
        } catch (error) {
            logger.error('Failed to track idle timer reset:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Audio Source Tracking Implementation
    // ============================================================================
    
    trackAudioSourceRequest(source: string, success: boolean, responseTime: number): void {
        try {
            const sourceType = this.categorizeAudioSource(source);
            
            this.audioSourceRequestCounter.inc({
                source_type: sourceType,
                success: String(success),
                cache_hit: 'false' // Could be enhanced with actual cache hit detection
            });
            
            this.audioSourceResponseTimeHistogram.observe({
                source_type: sourceType,
                success: String(success)
            }, responseTime);
            
            logger.debug(`Audio source request tracked: type=${sourceType}, success=${success}, time=${responseTime}ms`);
        } catch (error) {
            logger.error('Failed to track audio source request:', ensureError(error));
        }
    }
    
    trackVolumeChange(guildId: string, oldVolume: number, newVolume: number): void {
        try {
            const changeType = newVolume > oldVolume ? 'increase' : newVolume < oldVolume ? 'decrease' : 'same';
            
            this.volumeChangeCounter.inc({
                guild_id: guildId,
                change_type: changeType,
                user_id: 'system' // Could be enhanced with actual user ID
            });
            
            this.currentVolumeGauge.set({
                guild_id: guildId
            }, newVolume);
            
            logger.debug(`Volume change tracked: guild=${guildId}, ${oldVolume}% -> ${newVolume}%`);
        } catch (error) {
            logger.error('Failed to track volume change:', ensureError(error));
        }
    }
    
    // ============================================================================
    // Helper Methods
    // ============================================================================
    
    private categorizeAudioSource(source: string): string {
        if (source.includes('youtube.com') || source.includes('youtu.be')) {
            return 'youtube';
        } else if (source.includes('http')) {
            return 'stream';
        } else {
            return 'file';
        }
    }
    
    private getStateValue(state: string): number {
        switch (state) {
            case 'disconnected': return 0;
            case 'connecting': return 1;
            case 'ready': return 2;
            case 'reconnecting': return 3;
            default: return -1;
        }
    }
    
    private categorizeDuration(durationMs: number): string {
        const seconds = durationMs / 1000;
        if (seconds < 30) return 'very_short';
        if (seconds < 300) return 'short';
        if (seconds < 1800) return 'medium';
        if (seconds < 3600) return 'long';
        return 'very_long';
    }
    
    private updateActiveSessionsGauge(): void {
        const statusCounts = { active: 0, paused: 0, stopped: 0, error: 0 };
        
        for (const session of this.activeSessions.values()) {
            statusCounts[session.status]++;
        }
        
        for (const [status, count] of Object.entries(statusCounts)) {
            this.activeMusicSessionsGauge.set({ status }, count);
        }
    }
    
    private setupPeriodicCleanup(): void {
        // Clean up stale connections every 5 minutes
        setInterval(() => {
            this.cleanupStaleConnections();
        }, 5 * 60 * 1000);
    }
    
    private cleanupStaleConnections(): void {
        const now = Date.now();
        const staleThreshold = 10 * 60 * 1000; // 10 minutes
        
        for (const [guildId, connection] of this.voiceConnections.entries()) {
            if (now - connection.lastUpdate > staleThreshold) {
                this.voiceConnections.delete(guildId);
                logger.debug(`Cleaned up stale voice connection: ${guildId}`);
            }
        }
    }
    
    // ============================================================================
    // Health and Status Methods
    // ============================================================================
    
    getHealthStatus(): Record<string, any> {
        return {
            containerType: 'djcova',
            musicSessions: {
                active: this.activeSessions.size,
                totalCreated: this.totalSessionsCreated,
                currentGuilds: Array.from(this.activeSessions.keys())
            },
            voiceConnections: {
                tracked: this.voiceConnections.size,
                states: this.getVoiceConnectionSummary()
            },
            audioProcessing: {
                totalProcessed: this.totalAudioProcessed,
                currentQueue: this.audioProcessingQueue.size
            },
            lastUpdate: Date.now()
        };
    }
    
    private getVoiceConnectionSummary(): Record<string, number> {
        const summary: Record<string, number> = {};
        
        for (const connection of this.voiceConnections.values()) {
            summary[connection.state] = (summary[connection.state] || 0) + 1;
        }
        
        return summary;
    }
    
    getMetricsSummary(): Record<string, any> {
        return {
            musicSessions: {
                totalStarted: 'counter_metric',
                sessionDurations: 'histogram_metric',
                activeSessions: this.activeSessions.size
            },
            voiceConnections: {
                stateTransitions: 'counter_metric',
                latencyTracking: 'histogram_metric',
                currentConnections: this.voiceConnections.size
            },
            audioProcessing: {
                processingPerformance: 'histogram_metric',
                totalProcessed: this.totalAudioProcessed,
                bufferingEvents: 'histogram_metric'
            },
            idleManagement: {
                timerActivations: 'counter_metric',
                disconnectEvents: 'counter_metric',
                timerResets: 'counter_metric'
            },
            audioSources: {
                requestPerformance: 'histogram_metric',
                sourceTypes: 'counter_metric',
                volumeChanges: 'counter_metric'
            }
        };
    }
    
    async cleanup(): Promise<void> {
        try {
            // Clear all internal state
            this.activeSessions.clear();
            this.voiceConnections.clear();
            this.audioProcessingQueue.clear();
            
            // Reset gauges to zero
            this.updateActiveSessionsGauge();
            
            logger.info('DJCova metrics collector cleaned up successfully');
        } catch (error) {
            logger.error('Error during DJCova metrics cleanup:', ensureError(error));
            throw error;
        }
    }
}

// Factory function for creating DJCova metrics collector
export function createDJCovaMetrics(metrics: ProductionMetricsService, config: ContainerMetricsConfig = {}): DJCovaMetricsCollector {
    return new DJCovaMetricsCollector(metrics, config);
}