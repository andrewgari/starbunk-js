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

export class DJCova {
	private musicPlayer: AudioPlayer = createAudioPlayer();
	private activeResource: AudioResource | undefined;

	getMusicPlayer(): AudioPlayer {
		return this.musicPlayer;
	}

	async start(url: string): Promise<void> {
		if (this.musicPlayer.state.status === AudioPlayerStatus.Playing) {
			return;
		}

		try {
			console.log('[DEBUG] Fetching stream...');
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

			this.activeResource = createAudioResource(stream, {
				inputType: StreamType.WebmOpus,
				inlineVolume: true,
			});
			this.activeResource.volume?.setVolume(0.5);

			console.log('[DEBUG] Playing resource...');
			this.musicPlayer.play(this.activeResource);
			console.log('[DEBUG] Audio resource created and playing started.');
		} catch (error) {
			console.error('Error starting audio stream:', error);
		}
	}

	play(): void {
		if (this.activeResource) {
			this.musicPlayer.play(this.activeResource);
			console.log('Playing active resource.');
		} else {
			console.log('Active resource is null.');
		}
	}

	stop(): void {
		if (this.musicPlayer.state.status !== AudioPlayerStatus.Idle) {
			this.musicPlayer.stop();
			console.log('Playback stopped.');
		}
	}

	pause(): void {
		if (this.musicPlayer.state.status === AudioPlayerStatus.Playing) {
			this.musicPlayer.pause();
			console.log('Playback paused.');
		}
	}

	changeVolume(vol: number): void {
		this.activeResource?.volume?.setVolume(vol);
		console.log('Volume changed to:', vol);
	}

	subscribe(channel: VoiceConnection): PlayerSubscription | undefined {
		const subscription = channel.subscribe(this.musicPlayer);
		if (subscription) {
			console.log('Player successfully subscribed to connection.');
		} else {
			console.error('Failed to subscribe player to the connection.');
		}
		return subscription;
	}

	on(status: AudioPlayerStatus, callback: () => void): void {
		this.musicPlayer.on(status, callback);
	}
}
