import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  demuxProbe,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { ChildProcess } from 'child_process';
import { getYouTubeAudioStream } from '../utils/ytdlp';
import { IdleManager, createIdleManager, IdleManagerConfig } from '../services/idle-manager';
import { getMusicConfig } from '../config/music-config';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../observability/logger';

type AudioPlayerLike = ReturnType<typeof createAudioPlayer>;

/**
 * DJCova - Clean music playback engine
 * Handles audio player, streams, volume, and idle management
 */
export class DJCova {
	private readonly player: AudioPlayerLike;
	private resource: ReturnType<typeof createAudioResource> | undefined;
	private volume: number = 10;
	private idleManager: IdleManager | null = null;
	private ytdlpProcess: ChildProcess | null = null;
	private notificationCallback: ((message: string) => Promise<void>) | null = null;

	constructor() {
		// Set FFMPEG path for audio processing
		if (ffmpegPath && !process.env.FFMPEG_PATH) {
			process.env.FFMPEG_PATH = ffmpegPath;
		}

		this.player = createAudioPlayer({
			behaviors: {
				noSubscriber: NoSubscriberBehavior.Play,
			},
		});

		this.setupEventHandlers();
		logger.info('DJCova initialized');
	}

	private setupEventHandlers(): void {
		this.player.on(AudioPlayerStatus.Playing, () => {
			logger.info('▶️ Playback started');
			this.idleManager?.resetIdleTimer();
		});

		this.player.on(AudioPlayerStatus.Idle, () => {
			logger.info('⏸️ Playback idle');
			this.idleManager?.startIdleTimer();
		});

		this.player.on('error', (error: Error) => {
			logger.withError(error).error('Audio player error');
			this.cleanup();
		});
	}

	async play(url: string): Promise<void> {
		if (this.resource) {
			logger.warn('Already playing, stopping current track');
			this.stop();
		}

		logger.info(`🎵 Playing: ${url}`);

		try {
			const { stream, process } = getYouTubeAudioStream(url);
			this.ytdlpProcess = process;

			const probeResult = await demuxProbe(stream);
			this.resource = createAudioResource(probeResult.stream, {
				inputType: probeResult.type,
				inlineVolume: true,
			});

			if (this.resource.volume) {
				this.resource.volume.setVolume(this.volume / 100);
			}

			this.player.play(this.resource);
		} catch (error) {
			logger.withError(error instanceof Error ? error : new Error(String(error)))
				.error('Failed to play audio');
			this.cleanup();
			throw error;
		}
	}

	stop(): void {
		logger.info('⏹️ Stopping playback');
		this.cleanup();
		this.player.stop();
	}

	setVolume(vol: number): void {
		this.volume = Math.max(0, Math.min(vol, 100));
		logger.info(`🔊 Volume set to ${this.volume}%`);

		if (this.resource?.volume) {
			this.resource.volume.setVolume(this.volume / 100);
		}
	}

	getVolume(): number {
		return this.volume;
	}

	getPlayer(): AudioPlayerLike {
		return this.player;
	}

	initializeIdleManagement(
		guildId: string,
		channelId: string,
		notificationCallback?: (message: string) => Promise<void>
	): void {
		this.idleManager?.destroy();

		this.notificationCallback = notificationCallback || null;

		const config = getMusicConfig();
		const idleConfig: IdleManagerConfig = {
			timeoutSeconds: config.idleTimeoutSeconds,
			guildId,
			channelId,
			onDisconnect: async (reason: string) => {
				this.stop();
				if (this.notificationCallback) {
					await this.notificationCallback(reason);
				}
			},
		};

		this.idleManager = createIdleManager(idleConfig);
		logger.debug(`Idle management initialized for guild ${guildId}`);
	}

	private cleanup(): void {
		if (this.ytdlpProcess) {
			try {
				this.ytdlpProcess.kill('SIGKILL');
			} catch {}
			this.ytdlpProcess = null;
		}
		this.resource = undefined;
	}

	destroy(): void {
		this.stop();
		this.idleManager?.destroy();
		this.idleManager = null;
		this.player.removeAllListeners();
		logger.info('DJCova destroyed');
	}
}
