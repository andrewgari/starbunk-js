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
import loggerAdapter from '../services/loggerAdapter';

export class DJCova {
	private player: AudioPlayer;
	private resource: AudioResource | undefined;

	constructor() {
		loggerAdapter.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();
	}

	async start(url: string): Promise<void> {
		if (this.resource) {
			loggerAdapter.warn('Attempted to start playback while already playing');
			return;
		}

		loggerAdapter.info(`🎵 Starting playback from URL: ${url}`);

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
				this.resource.volume.setVolume(0.5);
			}

			loggerAdapter.debug('▶️ Playing resource...');
			this.player.play(this.resource);
			loggerAdapter.success('🎵 Audio resource created and playback started');
		} catch (error) {
			loggerAdapter.error('Failed to start audio playback', error as Error);
		}
	}

	play(): void {
		if (!this.resource) {
			loggerAdapter.warn('Attempted to play without an active audio resource');
			return;
		}

		loggerAdapter.debug('▶️ Playing audio resource');
		this.player.play(this.resource);
	}

	stop(): void {
		loggerAdapter.info('⏹️ Stopping audio playback');
		this.player.stop();
		this.resource = undefined;
	}

	pause(): void {
		loggerAdapter.info('⏸️ Pausing audio playback');
		this.player.pause();
	}

	changeVolume(vol: number): void {
		loggerAdapter.info(`🔊 Adjusting volume to ${vol}%`);
		if (this.resource?.volume) {
			this.resource.volume.setVolume(vol / 100);
		} else {
			loggerAdapter.warn('Attempted to change volume without active resource');
		}
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
		loggerAdapter.debug(`🎧 Subscribing to voice channel`);
		try {
			const subscription = channel.subscribe(this.player);
			if (subscription) {
				loggerAdapter.success('Player successfully subscribed to connection.');
			}
			return subscription;
		} catch (error) {
			loggerAdapter.error('Failed to subscribe player to the connection.');
			return undefined;
		}
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		loggerAdapter.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}
}
