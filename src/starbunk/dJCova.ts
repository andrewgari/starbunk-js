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
import { Logger } from '../services/Logger';

export class DJCova {
	private player: AudioPlayer;
	private resource: AudioResource | undefined;

	constructor() {
		Logger.debug('🎵 Initializing DJCova audio player');
		this.player = createAudioPlayer();
	}

	async start(url: string): Promise<void> {
		if (this.player.state.status === AudioPlayerStatus.Playing) {
			Logger.warn('Attempted to start playback while already playing');
			return;
		}

		try {
			Logger.info(`🎵 Starting playback from URL: ${url}`);
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

			Logger.debug('▶️ Playing resource...');
			this.player.play(this.resource);
			Logger.success('🎵 Audio resource created and playback started');
		} catch (error) {
			Logger.error('Failed to start audio playback', error as Error);
			throw error;
		}
	}

	play(): void {
		if (!this.resource) {
			Logger.warn('Attempted to play without an active audio resource');
			return;
		}
		Logger.debug('▶️ Playing audio resource');
		this.player.play(this.resource);
	}

	stop(): void {
		if (this.player.state.status !== AudioPlayerStatus.Idle) {
			Logger.info('⏹️ Stopping audio playback');
			this.player.stop();
		}
	}

	pause(): void {
		if (this.player.state.status === AudioPlayerStatus.Playing) {
			Logger.info('⏸️ Pausing audio playback');
			this.player.pause();
		}
	}

	changeVolume(vol: number): void {
		if (this.resource) {
			Logger.info(`🔊 Adjusting volume to ${vol}%`);
			this.resource.volume?.setVolume(vol / 100);
		} else {
			Logger.warn('Attempted to change volume without active resource');
		}
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
		Logger.debug(`🎧 Subscribing to voice channel`);
		const subscription = channel.subscribe(this.player);
		if (subscription) {
			Logger.success('Player successfully subscribed to connection.');
		} else {
			Logger.error('Failed to subscribe player to the connection.');
		}
		return subscription;
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		Logger.debug(`📡 Registering listener for ${status} status`);
		this.player.on(status, callback);
	}
}
