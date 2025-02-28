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
import { Logger } from '../services/logger';

interface DJCovaConfig {
	logger?: typeof Logger;
}

export class DJCova {
	private readonly logger: typeof Logger;
	private player: AudioPlayer;
	private resource: AudioResource | undefined;
	private currentUrl: string | undefined;

	constructor(config: DJCovaConfig = {}) {
		this.logger = config.logger ?? Logger;
		this.logger.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();

		// Set up error handling for the player
		this.player.on('error', (error) => {
			this.logger.error('Audio player error', error);
			this.resource = undefined;
		});
	}

	async start(url: string): Promise<void> {
		if (!url) {
			this.logger.error('Invalid URL provided');
			throw new Error('Invalid URL provided');
		}

		if (this.player.state.status === AudioPlayerStatus.Playing) {
			this.logger.warn('Attempted to start playback while already playing');
			this.stop(); // Stop current playback before starting new one
		}

		try {
			this.logger.info(`🎵 Starting playback from URL: ${url}`);
			this.currentUrl = url;

			const stream = ytdl(url, {
				filter: 'audioonly',
				quality: 'lowestaudio',
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

			// Handle stream errors
			stream.on('error', (error) => {
				this.logger.error('Stream error', error);
				throw error;
			});

			this.resource = createAudioResource(stream, {
				inputType: StreamType.WebmOpus,
				inlineVolume: true,
			});

			if (!this.resource) {
				throw new Error('Failed to create audio resource');
			}

			this.resource.volume?.setVolume(0.5);

			this.logger.debug('▶️ Playing resource...');
			this.player.play(this.resource);
			this.logger.success('🎵 Audio resource created and playback started');
		} catch (error) {
			this.logger.error('Failed to start audio playback', error as Error);
			this.resource = undefined;
			this.currentUrl = undefined;
			throw error;
		}
	}

	play(): void {
		if (!this.resource) {
			this.logger.warn('Attempted to play without an active audio resource');
			return;
		}
		this.logger.debug('▶️ Playing audio resource');
		this.player.play(this.resource);
	}

	stop(): void {
		if (this.player.state.status !== AudioPlayerStatus.Idle) {
			this.logger.info('⏹️ Stopping audio playback');
			this.player.stop();
			this.resource = undefined;
			this.currentUrl = undefined;
		}
	}

	pause(): void {
		if (this.player.state.status === AudioPlayerStatus.Playing) {
			this.logger.info('⏸️ Pausing audio playback');
			this.player.pause();
		}
	}

	resume(): void {
		if (this.player.state.status === AudioPlayerStatus.Paused) {
			this.logger.info('▶️ Resuming audio playback');
			this.player.unpause();
		}
	}

	changeVolume(vol: number): void {
		if (!this.resource?.volume) {
			this.logger.warn('Attempted to change volume without active resource');
			return;
		}

		// Ensure volume is within valid range
		const normalizedVolume = Math.max(0, Math.min(100, vol)) / 100;
		this.logger.info(`🔊 Adjusting volume to ${vol}%`);
		this.resource.volume.setVolume(normalizedVolume);
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
		if (!channel) {
			this.logger.error('Attempted to subscribe to undefined voice connection');
			return undefined;
		}

		this.logger.debug(`🎧 Subscribing to voice channel`);
		const subscription = channel.subscribe(this.player);

		if (subscription) {
			this.logger.success('Player successfully subscribed to connection.');
		} else {
			this.logger.error('Failed to subscribe player to the connection.');
		}

		return subscription;
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		if (!callback) {
			this.logger.warn(`Attempted to register undefined callback for ${status}`);
			return;
		}

		this.logger.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}

	getCurrentUrl(): string | undefined {
		return this.currentUrl;
	}

	getPlayerStatus(): AudioPlayerStatus {
		return this.player.state.status;
	}
}
