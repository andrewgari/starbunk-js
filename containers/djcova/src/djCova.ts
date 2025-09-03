import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	createAudioResource,
	PlayerSubscription,
	StreamType,
	VoiceConnection,
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import { logger } from '@starbunk/shared';
import fs from 'fs';
import { Readable } from 'stream';
import { IdleManager, createIdleManager, IdleManagerConfig } from './services/idleManager';
import { getMusicConfig } from './config/musicConfig';

export class DJCova {
	private player: AudioPlayer;
	private resource: AudioResource | undefined;
	private volume: number = 50; // Default volume 50%
	private idleManager: IdleManager | null = null;
	private currentGuildId: string | null = null;
	private currentChannelId: string | null = null;
	private notificationCallback: ((message: string) => Promise<void>) | null = null;

	// Event listener references for proper cleanup
	private onPlayingListener: (() => void) | null = null;
	private onIdleListener: (() => void) | null = null;
	private onErrorListener: ((error: Error) => void) | null = null;

	constructor() {
		logger.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();

		// Set up audio player event listeners for idle management
		this.setupIdleManagement();
	}

	async start(url: string): Promise<void> {
		if (this.resource) {
			logger.warn('Attempted to start playback while already playing');
			return;
		}

		logger.info('🎵 Starting playback');

		try {
			let stream: Readable;
			let inputType: StreamType = StreamType.Arbitrary;

			if (ytdl.validateURL(url)) {
				stream = ytdl(url, {
					filter: 'audioonly',
					quality: 'highestaudio',
					highWaterMark: 1 << 25,
					dlChunkSize: 0,
					requestOptions: {
						headers: {
							'User-Agent':
								'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
							'Accept-Language': 'en-US,en;q=0.9',
						},
					},
				});
				inputType = StreamType.WebmOpus;
			} else {
				if (/^https?:\/\//.test(url)) {
					try {
						const response = await fetch(url);
						if (!response.ok || !response.body) {
							logger.error(
								`Failed to fetch audio file from ${url}: ${response.status} ${response.statusText}`,
							);
							return;
						}
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						stream = Readable.fromWeb(response.body as any);
					} catch (error) {
						logger.error(`Failed to fetch audio file from ${url}`, error as Error);
						return;
					}
				} else {
					try {
						await fs.promises.access(url, fs.constants.R_OK);
						stream = fs.createReadStream(url);
					} catch (error) {
						logger.error(`Failed to access local audio file at ${url}`, error as Error);
						return;
					}
				}
			}

			this.resource = createAudioResource(stream, {
				inputType,
				inlineVolume: true,
			});

			if (this.resource.volume) {
				this.resource.volume.setVolume(this.volume / 100);
			}

			logger.debug('▶️ Playing resource...');
			this.player.play(this.resource);
			logger.success('🎵 Audio resource created and playback started');
		} catch (error) {
			logger.error('Failed to start audio playback', error as Error);
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

	stop(): void {
		logger.info('⏹️ Stopping audio playback');
		this.player.stop();
		this.resource = undefined;
	}

	pause(): void {
		logger.info('⏸️ Pausing audio playback');
		this.player.pause();
	}

	changeVolume(vol: number): void {
		logger.info(`🔊 Adjusting volume to ${vol}%`);
		this.volume = Math.max(0, Math.min(vol, 100));
		if (this.resource?.volume) {
			this.resource.volume.setVolume(this.volume / 100);
		} else {
			logger.warn('Attempted to change volume without active resource');
		}
	}

	getVolume(): number {
		return this.volume;
	}

	getPlayer(): AudioPlayer {
		return this.player;
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
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

	on(status: AudioPlayerStatus, callback: () => void): void {
		logger.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}

	/**
	 * Set up idle management for auto-disconnect functionality
	 */
	private setupIdleManagement(): void {
		// Create listener functions as class properties for proper cleanup
		this.onPlayingListener = () => {
			logger.debug('Audio player started playing, resetting idle timer');
			if (this.idleManager) {
				this.idleManager.resetIdleTimer();
			}
		};

		this.onIdleListener = () => {
			logger.debug('Audio player became idle, starting idle timer');
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

		this.idleManager = createIdleManager(idleConfig);
		logger.info(`Idle management initialized for guild ${guildId} with ${config.idleTimeoutSeconds}s timeout`);
	}

	/**
	 * Handle auto-disconnect due to inactivity
	 */
	private async handleAutoDisconnect(reason: string): Promise<void> {
		try {
			// Stop the music player
			this.stop();

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
