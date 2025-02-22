import { Logger } from '@/services/Logger';
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

interface DJCovaConfig {
	logger?: typeof Logger;
}

export class DJCova {
	private readonly logger: typeof Logger;
	private player: AudioPlayer;
	private resource: AudioResource | undefined;

	constructor(config: DJCovaConfig = {}) {
		this.logger = config.logger ?? Logger;
		this.logger.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();
	}

	async start(url: string): Promise<void> {
		if (this.player.state.status === AudioPlayerStatus.Playing) {
			this.logger.warn('Attempted to start playback while already playing');
			return;
		}

		try {
			this.logger.info(`🎵 Starting playback from URL: ${url}`);
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

			this.resource = createAudioResource(stream, {
				inputType: StreamType.WebmOpus,
				inlineVolume: true,
			});
			this.resource.volume?.setVolume(0.5);

			this.logger.debug('▶️ Playing resource...');
			this.player.play(this.resource);
			this.logger.success('🎵 Audio resource created and playback started');
		} catch (error) {
			this.logger.error('Failed to start audio playback', error as Error);
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
		}
	}

	pause(): void {
		if (this.player.state.status === AudioPlayerStatus.Playing) {
			this.logger.info('⏸️ Pausing audio playback');
			this.player.pause();
		}
	}

	changeVolume(vol: number): void {
		if (this.resource) {
			this.logger.info(`🔊 Adjusting volume to ${vol}%`);
			this.resource.volume?.setVolume(vol / 100);
		} else {
			this.logger.warn('Attempted to change volume without active resource');
		}
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
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
		this.logger.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}
}
