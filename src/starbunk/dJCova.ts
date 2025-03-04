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
import LoggerAdapter from '../services/LoggerAdapter';

export class DJCova {
	private player: AudioPlayer;
	private resource: AudioResource | undefined;

	constructor() {
		LoggerAdapter.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();
	}

	async start(url: string): Promise<void> {
		if (this.resource) {
			LoggerAdapter.warn('Attempted to start playback while already playing');
			return;
		}

		LoggerAdapter.info(`🎵 Starting playback from URL: ${url}`);

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

			LoggerAdapter.debug('▶️ Playing resource...');
			this.player.play(this.resource);
			LoggerAdapter.success('🎵 Audio resource created and playback started');
		} catch (error) {
			LoggerAdapter.error('Failed to start audio playback', error as Error);
		}
	}

	play(): void {
		if (!this.resource) {
			LoggerAdapter.warn('Attempted to play without an active audio resource');
			return;
		}

		LoggerAdapter.debug('▶️ Playing audio resource');
		this.player.play(this.resource);
	}

	stop(): void {
		LoggerAdapter.info('⏹️ Stopping audio playback');
		this.player.stop();
		this.resource = undefined;
	}

	pause(): void {
		LoggerAdapter.info('⏸️ Pausing audio playback');
		this.player.pause();
	}

	changeVolume(vol: number): void {
		LoggerAdapter.info(`🔊 Adjusting volume to ${vol}%`);
		if (this.resource?.volume) {
			this.resource.volume.setVolume(vol / 100);
		} else {
			LoggerAdapter.warn('Attempted to change volume without active resource');
		}
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
		LoggerAdapter.debug(`🎧 Subscribing to voice channel`);
		try {
			const subscription = channel.subscribe(this.player);
			if (subscription) {
				LoggerAdapter.success('Player successfully subscribed to connection.');
			}
			return subscription;
		} catch (error) {
			LoggerAdapter.error('Failed to subscribe player to the connection.');
			return undefined;
		}
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		LoggerAdapter.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}
}
