import {
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
	StreamType,
	demuxProbe,
	NoSubscriberBehavior,
} from '@discordjs/voice';
// Local structural types derived from factory return types
type AudioPlayerLike = ReturnType<typeof createAudioPlayer>;
type PlayerSubscriptionLike = { unsubscribe(): void };
type VoiceConnectionLike = { subscribe: (p: AudioPlayerLike) => PlayerSubscriptionLike | undefined };
import { getYouTubeAudioStream, getVideoInfo } from './utils/ytdlp';
import { logger, type DJCovaMetrics } from '@starbunk/shared';
import { Readable } from 'stream';
import { IdleManager, createIdleManager, IdleManagerConfig } from './services/idle-manager';
import { getMusicConfig } from './config/music-config';
import { disconnectVoiceConnection } from './utils/voice-utils';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';

const YOUTUBE_URL_REGEX =
	/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

export class DJCova {
	private player: AudioPlayerLike;
	private resource: ReturnType<typeof createAudioResource> | undefined;
	private volume: number = 10; // Default volume 10%
	private idleManager: IdleManager | null = null;
	private currentGuildId: string | null = null;
	private currentChannelId: string | null = null;
	private notificationCallback: ((message: string) => Promise<void>) | null = null;
	private metrics?: DJCovaMetrics;

	// Event listener references for proper cleanup
	private onPlayingListener: (() => void) | null = null;
	private onIdleListener: (() => void) | null = null;
	private onErrorListener: ((error: Error) => void) | null = null;

	// Session tracking for metrics
	private currentSessionStart?: number;
	private currentSource?: string;
	private ytdlpProcess: ReturnType<typeof spawn> | null = null;

	constructor(metrics?: DJCovaMetrics) {
		logger.debug('🎵 Initializing DJCova audio player');

		// Set FFMPEG_PATH environment variable for @discordjs/voice
		if (ffmpegPath && !process.env.FFMPEG_PATH) {
			process.env.FFMPEG_PATH = ffmpegPath;
			logger.debug(`Set FFMPEG_PATH to: ${ffmpegPath}`);
		}

		// Create audio player with proper behavior configuration
		this.player = createAudioPlayer({
			behaviors: {
				// Continue playing even if no subscribers (prevents premature stopping)
				noSubscriber: NoSubscriberBehavior.Play,
			},
		});
		this.metrics = metrics;

		// Set up audio player event listeners for idle management
		this.setupIdleManagement();

		// Set up error handler for the audio player
		this.player.on('error', (error: Error) => {
			logger.error('Audio player error:', error);
			// Track error in metrics
			if (this.metrics && this.currentGuildId) {
				this.metrics.trackAudioProcessingComplete(this.currentGuildId, 0, false);
			}
		});
	}

	async start(source: string | Readable): Promise<void> {
		if (this.resource) {
			logger.warn('Attempted to start playback while already playing');
			return;
		}

		const startTime = Date.now();
		this.currentSessionStart = startTime;
		this.currentSource = typeof source === 'string' ? source : 'file';

		// Track music session start
		if (this.metrics && this.currentGuildId) {
			this.metrics.trackMusicSessionStart(
				this.currentGuildId,
				'system', // userId would come from command context
				this.currentSource,
			);
		}

		logger.info('🎵 Starting playback');

		try {
			// Track audio processing start
			if (this.metrics && this.currentGuildId) {
				const audioType =
					typeof source === 'string'
						? source.includes('youtube') || source.includes('youtu.be')
							? 'youtube'
							: 'stream'
						: 'file';
				this.metrics.trackAudioProcessingStart(this.currentGuildId, audioType);
			}

			let stream: Readable;

			if (typeof source === 'string') {
				if (!YOUTUBE_URL_REGEX.test(source)) {
					throw new Error('Invalid YouTube URL provided.');
				}

				// YouTube URL - use yt-dlp to extract audio

				logger.info(`🎬 Fetching YouTube audio from: ${source}`);

				try {
					// OPTIMIZATION: Start audio stream immediately without waiting for video info

					// This reduces perceived latency from ~10-13s to ~5-7s

					const { stream: ytdlpStream, process: ytdlpProc } = getYouTubeAudioStream(source);

					this.ytdlpProcess = ytdlpProc;

					stream = ytdlpStream;

					logger.info('✅ Audio stream created successfully');

					// Get video info in parallel (non-blocking)

					// This will log the video title a few seconds later, but won't delay playback

					getVideoInfo(source)
						.then((videoInfo) => {
							logger.info(`📺 Video: ${videoInfo.title} (${videoInfo.duration}s)`);
						})

						.catch((error) => {
							logger.debug(
								'Could not fetch video info:',
								error instanceof Error ? error : new Error(String(error)),
							);
						});

					// Add error handler for the stream

					stream.on('error', (error: Error) => {
						logger.error('❌ Audio stream error:', error);
					});
				} catch (ytdlpError) {
					logger.error(
						'❌ Failed to create yt-dlp stream:',
						ytdlpError instanceof Error ? ytdlpError : new Error(String(ytdlpError)),
					);

					throw new Error(
						'Failed to fetch YouTube audio. The video may be unavailable, age-restricted, or private.',
					);
				}
			} else {
				// Direct stream (file upload)

				logger.info('📁 Using direct stream from file upload');

				stream = source;
			}

			// Use demuxProbe to automatically detect the stream type

			// This is the recommended approach for @discordjs/voice

			logger.debug('Probing stream to detect format...');

			// Add timeout to demuxProbe to prevent indefinite hangs

			const PROBE_TIMEOUT_MS = 15000; // 15 second timeout

			const probePromise = demuxProbe(stream);

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() => reject(new Error('Stream probe timeout - yt-dlp may not be responding')),
					PROBE_TIMEOUT_MS,
				);
			});

			let probedStream: Readable;

			let type: number;

			try {
				const result = await Promise.race([probePromise, timeoutPromise]);

				probedStream = result.stream;

				type = result.type;

				logger.debug(`Detected stream type: ${StreamType[type]}`);
			} catch (error) {
				// Clean up the stream on probe failure

				if (stream && typeof stream.destroy === 'function') {
					stream.destroy();
				}

				throw error;
			}

			// Create audio resource with the probed stream and detected type

			this.resource = createAudioResource(probedStream, {
				inputType: type,

				inlineVolume: true,
			});

			// Set up error handler for the audio resource

			this.resource.playStream.on('error', (error: Error) => {
				logger.error('Audio stream error:', error);
			});

			if (this.resource.volume) {
				this.resource.volume.setVolume(this.volume / 100);
			}

			logger.debug('▶️ Playing resource...');

			this.player.play(this.resource);

			// Track successful audio processing

			const processingTime = Date.now() - startTime;

			if (this.metrics && this.currentGuildId) {
				this.metrics.trackAudioProcessingComplete(this.currentGuildId, processingTime, true);
			}

			logger.success('🎵 Audio resource created and playback started');
		} catch (error) {
			// Track failed audio processing

			const processingTime = Date.now() - startTime;

			if (this.metrics && this.currentGuildId) {
				this.metrics.trackAudioProcessingComplete(this.currentGuildId, processingTime, false);
			}

			logger.error('Failed to start audio playback', error as Error);

			// End the session due to error

			if (this.currentSessionStart && this.metrics && this.currentGuildId) {
				const sessionDuration = Date.now() - this.currentSessionStart;

				this.metrics.trackMusicSessionEnd(this.currentGuildId, sessionDuration, 'error');
			}

			// Clean up resource reference

			this.resource = undefined;

			this.currentSessionStart = undefined;

			this.currentSource = undefined;

			throw error;
		}
	}

	play(): void {
		if (!this.resource) {
			logger.warn('Attempted to play without an active audio resource');

			return;
		}

		logger.debug('▶️ Playing audio resource');

		this.player.play(this.resource);
	}

	stop(reason: 'stopped' | 'completed' | 'error' | 'idle' = 'stopped'): void {
		logger.info('⏹️ Stopping audio playback');

		if (this.ytdlpProcess) {
			try {
				this.ytdlpProcess.kill('SIGKILL');
			} catch {}

			this.ytdlpProcess = null;
		}

		// Track session end if there was an active session

		if (this.currentSessionStart && this.metrics && this.currentGuildId) {
			const sessionDuration = Date.now() - this.currentSessionStart;

			this.metrics.trackMusicSessionEnd(this.currentGuildId, sessionDuration, reason);
		}

		this.player.stop();

		this.resource = undefined;

		this.currentSessionStart = undefined;

		this.currentSource = undefined;
	}

	pause(): void {
		logger.info('⏸️ Pausing audio playback');

		this.player.pause();
	}

	changeVolume(vol: number): void {
		const oldVolume = this.volume;

		logger.info(`🔊 Adjusting volume to ${vol}%`);

		this.volume = Math.max(0, Math.min(vol, 100));

		// Track volume change

		if (this.metrics && this.currentGuildId) {
			this.metrics.trackVolumeChange(this.currentGuildId, oldVolume, this.volume);
		}

		if (this.resource?.volume) {
			this.resource.volume.setVolume(this.volume / 100);
		} else {
			logger.warn('Attempted to change volume without active resource');
		}
	}

	getVolume(): number {
		return this.volume;
	}

	getPlayer(): AudioPlayerLike {
		return this.player;
	}

	subscribe(channel: VoiceConnectionLike): PlayerSubscriptionLike | undefined {
		logger.debug(`🎧 Subscribing to voice channel`);

		try {
			const subscription = channel.subscribe(this.player);

			if (subscription) {
				logger.success('Player successfully subscribed to connection.');
			}

			return subscription;
		} catch (_error) {
			logger.error('Failed to subscribe player to the connection.');

			return undefined;
		}
	}

	on(status: Parameters<AudioPlayerLike['on']>[0], callback: () => void): void {
		logger.debug(`📡 Registering listener for ${status} status`);

		this.player.on(status, callback);
	}

	/**

				 * Set up idle management for auto-disconnect functionality

				 */

	private setupIdleManagement(): void {
		// Create listener functions as class properties for proper cleanup

		this.onPlayingListener = () => {
			logger.info('🎶 Audio playback started');

			logger.debug('Resetting idle timer');

			if (this.idleManager) {
				this.idleManager.resetIdleTimer();

				// Track idle timer reset

				if (this.metrics && this.currentGuildId) {
					this.metrics.trackIdleTimerReset(this.currentGuildId);
				}
			}
		};

		this.onIdleListener = () => {
			logger.info('⏹️ Audio playback ended');

			logger.debug('Starting idle timer');

			if (this.idleManager) {
				this.idleManager.startIdleTimer();
			}
		};

		this.onErrorListener = (error: Error) => {
			logger.error('Audio player error:', error);

			if (this.idleManager) {
				this.idleManager.startIdleTimer();
			}
		};

		// Register the event listeners

		this.player.on(AudioPlayerStatus.Playing, this.onPlayingListener);

		this.player.on(AudioPlayerStatus.Idle, this.onIdleListener);

		this.player.on('error', this.onErrorListener);
	}

	/**

				 * Initialize idle management for a specific guild and channel

				 */

	initializeIdleManagement(
		guildId: string,

		channelId?: string,

		notificationCallback?: (message: string) => Promise<void>,
	): void {
		// Clean up existing idle manager

		if (this.idleManager) {
			this.idleManager.destroy();
		}

		this.currentGuildId = guildId;

		this.currentChannelId = channelId || null;

		this.notificationCallback = notificationCallback || null;

		const config = getMusicConfig();

		const idleConfig: IdleManagerConfig = {
			timeoutSeconds: config.idleTimeoutSeconds,

			guildId,

			channelId,

			onDisconnect: async (reason: string) => {
				await this.handleAutoDisconnect(reason);
			},
		};

		// Track idle timer start

		if (this.metrics) {
			this.metrics.trackIdleTimerStart(guildId, config.idleTimeoutSeconds);
		}

		this.idleManager = createIdleManager(idleConfig);

		logger.info(`Idle management initialized for guild ${guildId} with ${config.idleTimeoutSeconds}s timeout`);
	}

	/**

				 * Handle auto-disconnect due to inactivity

				 */

	private async handleAutoDisconnect(reason: string): Promise<void> {
		try {
			// Track idle disconnect

			if (this.metrics && this.currentGuildId && this.currentSessionStart) {
				const idleDuration = Date.now() - this.currentSessionStart;

				this.metrics.trackIdleDisconnect(this.currentGuildId, idleDuration);
			}

			// Stop the music player (this will also track session end)

			this.stop('idle');

			// CRITICAL: Actually leave the voice channel

			// Without this, the bot stays in voice channel and can't rejoin properly

			if (this.currentGuildId) {
				disconnectVoiceConnection(this.currentGuildId);

				logger.debug(`Disconnected from voice channel in guild ${this.currentGuildId}`);
			}

			// Send notification to users

			const message = `🔇 ${reason}`;

			if (this.notificationCallback) {
				await this.notificationCallback(message);
			}

			logger.info(`Auto-disconnect completed for guild ${this.currentGuildId}: ${reason}`);
		} catch (error) {
			logger.error('Error during auto-disconnect:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**

				 * Manually disconnect and cleanup idle management

				 */

	disconnect(): void {
		if (this.idleManager) {
			this.idleManager.cancelIdleTimer();
		}

		this.stop();

		logger.debug('Manual disconnect completed');
	}

	/**

				 * Get idle management status

				 */

	getIdleStatus(): { isActive: boolean; timeoutSeconds: number } | null {
		if (!this.idleManager) {
			return null;
		}

		return {
			isActive: this.idleManager.isIdleTimerActive(),

			timeoutSeconds: this.idleManager.getTimeoutSeconds(),
		};
	}

	/**

				 * Cleanup resources when destroying the music player

				 */

	destroy(): void {
		// Remove event listeners to prevent memory leaks

		if (this.onPlayingListener) {
			this.player.off(AudioPlayerStatus.Playing, this.onPlayingListener);

			this.onPlayingListener = null;
		}

		if (this.onIdleListener) {
			this.player.off(AudioPlayerStatus.Idle, this.onIdleListener);

			this.onIdleListener = null;
		}

		if (this.onErrorListener) {
			this.player.off('error', this.onErrorListener);

			this.onErrorListener = null;
		}

		// Cleanup idle manager

		if (this.idleManager) {
			this.idleManager.destroy();

			this.idleManager = null;
		}

		// Stop the music player

		this.stop();

		logger.debug('DJCova music player destroyed with proper cleanup');
	}
}
