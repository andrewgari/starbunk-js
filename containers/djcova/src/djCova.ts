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

export class DJCova {
	private player: AudioPlayer;
	private resource: AudioResource | undefined;
	private volume: number = 50; // Default volume 50%

	constructor() {
		logger.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();
	}

	async start(url: string): Promise<void> {
		if (this.resource) {
			logger.warn('Attempted to start playback while already playing');
			return;
		}

		logger.info(`🎵 Starting playback from URL: ${url}`);

		try {
			const stream = ytdl(url, {
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

			this.resource = createAudioResource(stream, {
				inputType: StreamType.WebmOpus,
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
		} catch (error) {
			logger.error('Failed to subscribe player to the connection.');
			return undefined;
		}
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		logger.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}
}
