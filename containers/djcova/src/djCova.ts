import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	AudioPlayerError,
	PlayerSubscription,
	StreamType,
	VoiceConnection,
	createAudioPlayer,
	createAudioResource,
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import type { Readable } from 'stream';
import { logger } from '@starbunk/shared';
import { createIdleManager, IdleManager } from './services/idleManager';

export class DJCova {
	private player: AudioPlayer;
	private resource: AudioResource | undefined;
	private volume = 50; // percentage

	private idleManager: IdleManager | null = null;
	private currentGuildId: string | null = null;
	private currentChannelId: string | null = null;
	private notificationCallback: ((message: string) => Promise<void>) | undefined;

	private onPlayingListener?: () => void;
	private onIdleListener?: () => void;
	private onErrorListener?: (error: AudioPlayerError) => void;

	constructor() {
		logger.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();
		this.setupIdleManagement();
	}

	async start(source: string | Readable): Promise<void> {
		if (this.resource) {
			logger.warn('Attempted to start playback while already playing');
			return;
		}

		try {
			let audio: Readable;
			if (typeof source === 'string') {
				logger.info(`🎵 Starting playback from URL: ${source}`);
				audio = ytdl(source, {
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
				}) as unknown as Readable;
			} else {
				logger.info('🎵 Starting playback from provided audio stream');
				audio = source;
			}

			// If youtube (string), assume WebmOpus; otherwise allow arbitrary
			const inputType = typeof source === 'string' ? StreamType.WebmOpus : StreamType.Arbitrary;

			this.resource = createAudioResource(audio, {
				inputType,
				inlineVolume: true,
			});

			if (this.resource.volume) {
				this.resource.volume.setVolume(this.volume / 100);
			}

			logger.debug('▶️ Playing resource...');
			this.player.play(this.resource);
		} catch (error) {
			logger.error('Failed to start audio playback', error as Error);
		}
	}

	play(): void {
		if (!this.resource) {
			logger.warn('Attempted to play without an active audio resource');
			return;
		}
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
		this.volume = Math.max(0, Math.min(vol, 100));
		if (this.resource?.volume) {
			this.resource.volume.setVolume(this.volume / 100);
		}
	}

	getVolume(): number {
		return this.volume;
	}

	getPlayer(): AudioPlayer {
		return this.player;
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
		try {
			const subscription = channel.subscribe(this.player);
			if (subscription) {
				logger.debug('Player subscribed to connection');
			}
			return subscription;
		} catch (error) {
			logger.error('Failed to subscribe player to the connection.', error as Error);
			return undefined;
		}
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		this.player.on(status, callback);
	}

	/** Set up base idle management listeners (no guild context yet) */
	private setupIdleManagement(): void {
		// hook player events for idle timer management when configured
		this.onPlayingListener = () => {
			if (this.idleManager) {
				this.idleManager.resetIdleTimer();
			}
		};
		this.onIdleListener = () => {
			if (this.idleManager) {
				this.idleManager.startIdleTimer();
			}
		};
		this.onErrorListener = (err: AudioPlayerError) => {
			logger.error('Audio player error', err);
		};

		this.player.on(AudioPlayerStatus.Playing, this.onPlayingListener);
		this.player.on(AudioPlayerStatus.Idle, this.onIdleListener);
		this.player.on('error', this.onErrorListener);
	}

	/** Initialize idle management for a specific guild/channel */
	initializeIdleManagement(
		guildId: string,
		channelId?: string,
		notificationCallback?: (message: string) => Promise<void>,
	): void {
		this.currentGuildId = guildId;
		this.currentChannelId = channelId ?? null;
		this.notificationCallback = notificationCallback;

		const timeoutSeconds = Number(process.env.MUSIC_IDLE_TIMEOUT_SECONDS ?? '30');
		this.idleManager = createIdleManager({
			guildId,
			channelId,
			timeoutSeconds,
			onDisconnect: async (reason: string) => {
				await this.handleAutoDisconnect(reason);
			},
		});
	}

	/** Handle auto-disconnect (idle) */
	private async handleAutoDisconnect(reason: string): Promise<void> {
		try {
			this.stop();
			if (this.notificationCallback) {
				await this.notificationCallback(`🔇 ${reason}`);
			}
		} catch (err) {
			logger.error('Error during auto-disconnect', err as Error);
		}
	}

	/** Manual disconnect and cleanup */
	disconnect(): void {
		this.stop();
		if (this.idleManager) {
			this.idleManager.cancelIdleTimer();
		}
	}

	/** Idle status snapshot */
	getIdleStatus(): { isActive: boolean; timeoutSeconds: number } | null {
		if (!this.idleManager) return null;
		return {
			isActive: this.idleManager.isIdleTimerActive(),
			timeoutSeconds: this.idleManager.getTimeoutSeconds(),
		};
	}

	/** Cleanup resources */
	destroy(): void {
		try {
			this.disconnect();
			if (this.onPlayingListener) this.player.off(AudioPlayerStatus.Playing, this.onPlayingListener);
			if (this.onIdleListener) this.player.off(AudioPlayerStatus.Idle, this.onIdleListener);
			if (this.onErrorListener) this.player.off('error', this.onErrorListener);
		} catch {
			// ignore
		}
	}
}
