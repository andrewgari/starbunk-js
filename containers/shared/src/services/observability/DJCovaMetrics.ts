// DJCova Container-Specific Metrics Implementation
// Tracks music sessions, voice connections, audio processing performance,
// idle management, and audio source tracking for production monitoring

import * as promClient from 'prom-client';
import { logger } from '../logger';
import { ensureError } from '../../utils/errorUtils';
import { DJCovaMetrics, ContainerMetricsBase, ContainerMetricsConfig } from './ContainerMetrics';
import { ProductionMetricsService } from './ProductionMetricsService';

interface MusicSession {
	guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	userId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	startTime: number; // eslint-disable-line @typescript-eslint/no-unused-vars
	source: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	status: 'active' | 'paused' | 'stopped' | 'error'; // eslint-disable-line @typescript-eslint/no-unused-vars
}

interface VoiceConnectionState {
	guildId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
	state: 'connecting' | 'ready' | 'disconnected' | 'reconnecting'; // eslint-disable-line @typescript-eslint/no-unused-vars
	lastUpdate: number; // eslint-disable-line @typescript-eslint/no-unused-vars
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
		// eslint-disable-line @typescript-eslint/no-unused-vars
		super(metrics, 'djcova');
		this.initializeMetrics(config);

		// Set up periodic cleanup of stale connections
		this.setupPeriodicCleanup();

		logger.info('DJCova metrics collector initialized with production-ready music service tracking');
	}

	private initializeMetrics(config: ContainerMetricsConfig): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		// Music Session Metrics
		this.musicSessionCounter = new promClient.Counter({
			name: 'djcova_music_sessions_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of music sessions started', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'source_type', 'user_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.musicSessionDurationHistogram = new promClient.Histogram({
			name: 'djcova_music_session_duration_seconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Duration of music sessions in seconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'end_reason', 'source_type'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600, 7200], // Up to 2 hours // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.activeMusicSessionsGauge = new promClient.Gauge({
			name: 'djcova_active_music_sessions', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Number of currently active music sessions', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['status'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.musicSessionEndCounter = new promClient.Counter({
			name: 'djcova_music_session_ends_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total number of music sessions ended', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'end_reason', 'duration_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Voice Connection Health Metrics
		this.voiceConnectionStateGauge = new promClient.Gauge({
			name: 'djcova_voice_connection_state', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Voice connection state (0=disconnected, 1=connecting, 2=ready, 3=reconnecting)', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.voiceConnectionTransitionCounter = new promClient.Counter({
			name: 'djcova_voice_connection_transitions_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total voice connection state transitions', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'from_state', 'to_state'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.voiceConnectionLatencyHistogram = new promClient.Histogram({
			name: 'djcova_voice_connection_latency_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Voice connection latency in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.voiceConnectionErrorCounter = new promClient.Counter({
			name: 'djcova_voice_connection_errors_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total voice connection errors', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'error_type', 'recoverable'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Audio Processing Performance Metrics
		this.audioProcessingCounter = new promClient.Counter({
			name: 'djcova_audio_processing_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total audio processing operations', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'audio_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.audioProcessingTimeHistogram = new promClient.Histogram({
			name: 'djcova_audio_processing_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Audio processing time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'audio_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.audioBufferingHistogram = new promClient.Histogram({
			name: 'djcova_audio_buffering_duration_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Audio buffering time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'buffer_reason'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.audioQualityGauge = new promClient.Gauge({
			name: 'djcova_audio_quality_score', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Audio quality score (0-100)', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'quality_metric'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Idle Management Metrics
		this.idleTimerCounter = new promClient.Counter({
			name: 'djcova_idle_timers_started_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total idle timers started', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'timeout_seconds'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.idleDisconnectCounter = new promClient.Counter({
			name: 'djcova_idle_disconnects_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total idle disconnections', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'idle_duration_category'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.idleTimerResetCounter = new promClient.Counter({
			name: 'djcova_idle_timer_resets_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total idle timer resets due to activity', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'reset_reason'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.idleTimeoutGauge = new promClient.Gauge({
			name: 'djcova_idle_timeout_seconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Current idle timeout setting in seconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		// Audio Source Tracking Metrics
		this.audioSourceRequestCounter = new promClient.Counter({
			name: 'djcova_audio_source_requests_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total audio source requests', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['source_type', 'success', 'cache_hit'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.audioSourceResponseTimeHistogram = new promClient.Histogram({
			name: 'djcova_audio_source_response_time_ms', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Audio source response time in milliseconds', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['source_type', 'success'], // eslint-disable-line @typescript-eslint/no-unused-vars
			buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.volumeChangeCounter = new promClient.Counter({
			name: 'djcova_volume_changes_total', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Total volume changes', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id', 'change_type', 'user_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});

		this.currentVolumeGauge = new promClient.Gauge({
			name: 'djcova_current_volume_percent', // eslint-disable-line @typescript-eslint/no-unused-vars
			help: 'Current volume percentage', // eslint-disable-line @typescript-eslint/no-unused-vars
			labelNames: ['guild_id'], // eslint-disable-line @typescript-eslint/no-unused-vars
			registers: [this.registry], // eslint-disable-line @typescript-eslint/no-unused-vars
		});
	}

	// ============================================================================
	// Music Session Metrics Implementation
	// ============================================================================

	trackMusicSessionStart(guildId: string, userId: string, source: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const sourceType = this.categorizeAudioSource(source);

			// Increment session counter
			this.musicSessionCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				source_type: sourceType, // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: userId, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			// Track active session
			const session: MusicSession = {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				guildId,
				userId,
				startTime: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
				source: sourceType, // eslint-disable-line @typescript-eslint/no-unused-vars
				status: 'active', // eslint-disable-line @typescript-eslint/no-unused-vars
			};

			this.activeSessions.set(guildId, session);
			this.totalSessionsCreated++;

			// Update active sessions gauge
			this.updateActiveSessionsGauge();

			logger.info(`Music session started tracked: guild=${guildId}, source=${sourceType}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				userId,
				totalSessions: this.totalSessionsCreated, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track music session start:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackMusicSessionEnd(guildId: string, duration: number, reason: 'completed' | 'stopped' | 'error' | 'idle'): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const session = this.activeSessions.get(guildId);
			if (!session) {
				logger.warn(`Attempted to end non-existent music session: ${guildId}`); // eslint-disable-line @typescript-eslint/no-unused-vars
				return;
			}

			const durationSeconds = duration / 1000;
			const durationCategory = this.categorizeDuration(duration);

			// Record session duration
			this.musicSessionDurationHistogram.observe(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
					end_reason: reason, // eslint-disable-line @typescript-eslint/no-unused-vars
					source_type: session.source, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				durationSeconds,
			);

			// Increment session end counter
			this.musicSessionEndCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				end_reason: reason, // eslint-disable-line @typescript-eslint/no-unused-vars
				duration_category: durationCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			// Remove from active sessions
			this.activeSessions.delete(guildId);
			this.updateActiveSessionsGauge();

			logger.info(
				`Music session ended tracked: guild=${guildId}, duration=${durationSeconds}s, reason=${reason}`,
			); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track music session end:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Voice Connection Health Metrics Implementation
	// ============================================================================

	trackVoiceConnectionState(guildId: string, state: 'connecting' | 'ready' | 'disconnected' | 'reconnecting'): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const stateValue = this.getStateValue(state);
			const currentConnection = this.voiceConnections.get(guildId);

			// Track state transition if there was a previous state
			if (currentConnection) {
				this.voiceConnectionTransitionCounter.inc({
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
					from_state: currentConnection.state, // eslint-disable-line @typescript-eslint/no-unused-vars
					to_state: state, // eslint-disable-line @typescript-eslint/no-unused-vars
				});
			}

			// Update state gauge
			this.voiceConnectionStateGauge.set(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				stateValue,
			);

			// Update connection tracking
			this.voiceConnections.set(guildId, {
				guildId,
				state,
				lastUpdate: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
				latency: currentConnection?.latency, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.debug(`Voice connection state tracked: guild=${guildId}, state=${state}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				stateValue,
				hasTransition: !!currentConnection, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track voice connection state:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackVoiceConnectionLatency(guildId: string, latency: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.voiceConnectionLatencyHistogram.observe(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				latency,
			);

			// Update connection latency tracking
			const connection = this.voiceConnections.get(guildId);
			if (connection) {
				connection.latency = latency;
				this.voiceConnections.set(guildId, connection);
			}

			logger.debug(`Voice connection latency tracked: guild=${guildId}, latency=${latency}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track voice connection latency:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Audio Processing Performance Implementation
	// ============================================================================

	trackAudioProcessingStart(guildId: string, audioType: 'youtube' | 'file' | 'stream'): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const processingId = `${guildId}-${Date.now()}`;
			this.audioProcessingQueue.add(processingId);

			logger.debug(`Audio processing started: guild=${guildId}, type=${audioType}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				processingId,
				queueSize: this.audioProcessingQueue.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track audio processing start:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackAudioProcessingComplete(guildId: string, processingTime: number, success: boolean): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const audioType = 'youtube'; // Default, should be passed from caller in real implementation

			this.audioProcessingCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				audio_type: audioType, // eslint-disable-line @typescript-eslint/no-unused-vars
				success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.audioProcessingTimeHistogram.observe(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
					audio_type: audioType, // eslint-disable-line @typescript-eslint/no-unused-vars
					success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				processingTime,
			);

			this.totalAudioProcessed++;

			logger.debug(`Audio processing completed: guild=${guildId}, time=${processingTime}ms, success=${success}`, {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: this.totalAudioProcessed, // eslint-disable-line @typescript-eslint/no-unused-vars
			});
		} catch (error) {
			logger.error('Failed to track audio processing complete:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackAudioBufferingEvents(guildId: string, bufferTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const bufferReason = bufferTime > 1000 ? 'network_slow' : 'normal_buffering';

			this.audioBufferingHistogram.observe(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
					buffer_reason: bufferReason, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				bufferTime,
			);

			logger.debug(`Audio buffering tracked: guild=${guildId}, bufferTime=${bufferTime}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track audio buffering:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Idle Management Metrics Implementation
	// ============================================================================

	trackIdleTimerStart(guildId: string, timeoutSeconds: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.idleTimerCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				timeout_seconds: String(timeoutSeconds), // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.idleTimeoutGauge.set(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				timeoutSeconds,
			);

			logger.debug(`Idle timer started: guild=${guildId}, timeout=${timeoutSeconds}s`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track idle timer start:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackIdleDisconnect(guildId: string, idleDuration: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const durationCategory = this.categorizeDuration(idleDuration);

			this.idleDisconnectCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				idle_duration_category: durationCategory, // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.info(`Idle disconnect tracked: guild=${guildId}, duration=${idleDuration}ms`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track idle disconnect:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackIdleTimerReset(guildId: string): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			this.idleTimerResetCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				reset_reason: 'user_activity', // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			logger.debug(`Idle timer reset tracked: guild=${guildId}`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track idle timer reset:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Audio Source Tracking Implementation
	// ============================================================================

	trackAudioSourceRequest(source: string, success: boolean, responseTime: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const sourceType = this.categorizeAudioSource(source);

			this.audioSourceRequestCounter.inc({
				source_type: sourceType, // eslint-disable-line @typescript-eslint/no-unused-vars
				success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
				cache_hit: 'false', // Could be enhanced with actual cache hit detection // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.audioSourceResponseTimeHistogram.observe(
				{
					source_type: sourceType, // eslint-disable-line @typescript-eslint/no-unused-vars
					success: String(success), // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				responseTime,
			);

			logger.debug(
				`Audio source request tracked: type=${sourceType}, success=${success}, time=${responseTime}ms`,
			); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track audio source request:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	trackVolumeChange(guildId: string, oldVolume: number, newVolume: number): void {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		try {
			const changeType = newVolume > oldVolume ? 'increase' : newVolume < oldVolume ? 'decrease' : 'same';

			this.volumeChangeCounter.inc({
				guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				change_type: changeType, // eslint-disable-line @typescript-eslint/no-unused-vars
				user_id: 'system', // Could be enhanced with actual user ID // eslint-disable-line @typescript-eslint/no-unused-vars
			});

			this.currentVolumeGauge.set(
				{
					guild_id: guildId, // eslint-disable-line @typescript-eslint/no-unused-vars
				},
				newVolume,
			);

			logger.debug(`Volume change tracked: guild=${guildId}, ${oldVolume}% -> ${newVolume}%`); // eslint-disable-line @typescript-eslint/no-unused-vars
		} catch (error) {
			logger.error('Failed to track volume change:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	private categorizeAudioSource(source: string): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		if (source.includes('youtube.com') || source.includes('youtu.be')) {
			return 'youtube';
		} else if (source.includes('http')) {
			return 'stream';
		} else {
			return 'file';
		}
	}

	private getStateValue(state: string): number {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		switch (state) {
			case 'disconnected':
				return 0;
			case 'connecting':
				return 1;
			case 'ready':
				return 2;
			case 'reconnecting':
				return 3;
			default:
				return -1; // eslint-disable-line @typescript-eslint/no-unused-vars
		}
	}

	private categorizeDuration(durationMs: number): string {
		// eslint-disable-line @typescript-eslint/no-unused-vars
		const seconds = durationMs / 1000;
		if (seconds < 30) return 'very_short';
		if (seconds < 300) return 'short';
		if (seconds < 1800) return 'medium';
		if (seconds < 3600) return 'long';
		return 'very_long';
	}

	private updateActiveSessionsGauge(): void {
		const statusCounts = { active: 0, paused: 0, stopped: 0, error: 0 }; // eslint-disable-line @typescript-eslint/no-unused-vars

		for (const session of this.activeSessions.values()) {
			statusCounts[session.status]++;
		}

		for (const [status, count] of Object.entries(statusCounts)) {
			this.activeMusicSessionsGauge.set({ status }, count);
		}
	}

	private setupPeriodicCleanup(): void {
		// Clean up stale connections every 5 minutes
		setInterval(
			() => {
				this.cleanupStaleConnections();
			},
			5 * 60 * 1000,
		);
	}

	private cleanupStaleConnections(): void {
		const now = Date.now();
		const staleThreshold = 10 * 60 * 1000; // 10 minutes

		for (const [guildId, connection] of this.voiceConnections.entries()) {
			if (now - connection.lastUpdate > staleThreshold) {
				this.voiceConnections.delete(guildId);
				logger.debug(`Cleaned up stale voice connection: ${guildId}`); // eslint-disable-line @typescript-eslint/no-unused-vars
			}
		}
	}

	// ============================================================================
	// Health and Status Methods
	// ============================================================================

	getHealthStatus(): Record<string, any> {
		return {
			containerType: 'djcova', // eslint-disable-line @typescript-eslint/no-unused-vars
			musicSessions: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				active: this.activeSessions.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				totalCreated: this.totalSessionsCreated, // eslint-disable-line @typescript-eslint/no-unused-vars
				currentGuilds: Array.from(this.activeSessions.keys()), // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			voiceConnections: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				tracked: this.voiceConnections.size, // eslint-disable-line @typescript-eslint/no-unused-vars
				states: this.getVoiceConnectionSummary(), // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			audioProcessing: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: this.totalAudioProcessed, // eslint-disable-line @typescript-eslint/no-unused-vars
				currentQueue: this.audioProcessingQueue.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			lastUpdate: Date.now(), // eslint-disable-line @typescript-eslint/no-unused-vars
		};
	}

	private getVoiceConnectionSummary(): Record<string, number> {
		const summary: Record<string, number> = {}; // eslint-disable-line @typescript-eslint/no-unused-vars

		for (const connection of this.voiceConnections.values()) {
			summary[connection.state] = (summary[connection.state] || 0) + 1;
		}

		return summary;
	}

	getMetricsSummary(): Record<string, any> {
		return {
			musicSessions: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				totalStarted: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				sessionDurations: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				activeSessions: this.activeSessions.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			voiceConnections: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				stateTransitions: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				latencyTracking: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				currentConnections: this.voiceConnections.size, // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			audioProcessing: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				processingPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				totalProcessed: this.totalAudioProcessed, // eslint-disable-line @typescript-eslint/no-unused-vars
				bufferingEvents: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			idleManagement: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				timerActivations: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				disconnectEvents: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				timerResets: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
			audioSources: {
				// eslint-disable-line @typescript-eslint/no-unused-vars
				requestPerformance: 'histogram_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				sourceTypes: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
				volumeChanges: 'counter_metric', // eslint-disable-line @typescript-eslint/no-unused-vars
			},
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
			logger.error('Error during DJCova metrics cleanup:', ensureError(error)); // eslint-disable-line @typescript-eslint/no-unused-vars
			throw error;
		}
	}
}

// Factory function for creating DJCova metrics collector
export function createDJCovaMetrics(
	metrics: ProductionMetricsService,
	config: ContainerMetricsConfig = {},
): DJCovaMetricsCollector {
	// eslint-disable-line @typescript-eslint/no-unused-vars
	return new DJCovaMetricsCollector(metrics, config);
}
