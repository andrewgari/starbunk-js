import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  demuxProbe,
  NoSubscriberBehavior,
  joinVoiceChannel,
} from '@discordjs/voice';
import { ChildProcess } from 'child_process';
import { getYouTubeAudioStream } from '../utils/ytdlp';
import { IdleManager, createIdleManager, IdleManagerConfig } from '../services/idle-manager';
import { getMusicConfig } from '../config/music-config';
import ffmpegPath from 'ffmpeg-static';
import { logger } from '../observability/logger';

type AudioPlayerLike = ReturnType<typeof createAudioPlayer>;
type AudioResourceLike = ReturnType<typeof createAudioResource>;
type VoiceConnectionLike = ReturnType<typeof joinVoiceChannel>;
type PlayerSubscriptionLike = ReturnType<VoiceConnectionLike['subscribe']>;

/**
 * DJCova - Clean music playback engine
 * Handles audio player, streams, volume, and idle management
 */
export class DJCova {
  private readonly player: AudioPlayerLike;
  private currentResource: AudioResourceLike | undefined;

  /**
   * Backwards-compatible alias for the old `resource` property name.
   * Some tests (and possibly external consumers) still access `djCovaAny.resource`.
   */
  public get resource(): AudioResourceLike | undefined {
    return this.currentResource;
  }

  public set resource(value: AudioResourceLike | undefined) {
    this.currentResource = value;
  }
  private currentSubscription: PlayerSubscriptionLike | undefined;
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
    // Cleanup any existing resources BEFORE starting new play
    logger.debug('Cleaning up any existing resources before new play');
    this.cleanup();

    logger.info(`🎵 Playing: ${url}`);

    try {
      const { stream, process } = getYouTubeAudioStream(url);
      this.ytdlpProcess = process;

      const probeResult = await demuxProbe(stream);
      this.currentResource = createAudioResource(probeResult.stream, {
        inputType: probeResult.type,
        inlineVolume: true,
      });

      if (this.currentResource.volume) {
        this.currentResource.volume.setVolume(this.volume / 100);
      }

      this.player.play(this.currentResource);
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
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

    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume / 100);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getPlayer(): AudioPlayerLike {
    return this.player;
  }

  /**
   * Register the player subscription for lifecycle management
   * Called by DJCovaService immediately after player subscription is created
   */
  setSubscription(subscription: PlayerSubscriptionLike | undefined): void {
    logger.debug('Setting player subscription for lifecycle management');
    this.currentSubscription = subscription;
  }

  initializeIdleManagement(
    guildId: string,
    channelId: string,
    notificationCallback?: (message: string) => Promise<void>,
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
    // Step 1: Unsubscribe from current subscription FIRST
    if (this.currentSubscription) {
      try {
        logger.debug('Unsubscribing from player subscription');
        this.currentSubscription.unsubscribe();
      } catch (error) {
        logger
          .withError(error instanceof Error ? error : new Error(String(error)))
          .warn('Error unsubscribing from player subscription');
      }
      this.currentSubscription = undefined;
    }

    // Step 2: Kill yt-dlp process with SIGKILL
    if (this.ytdlpProcess) {
      try {
        logger.debug('Killing yt-dlp process');
        this.ytdlpProcess.kill('SIGKILL');
      } catch (error) {
        logger
          .withError(error instanceof Error ? error : new Error(String(error)))
          .warn('Error killing yt-dlp process');
      }
      this.ytdlpProcess = null;
    }

    // Step 3: Clear resource reference
    if (this.currentResource) {
      logger.debug('Clearing audio resource');
      this.currentResource = undefined;
    }

    logger.debug('Cleanup complete: subscription, process, and resource cleared');
  }

  destroy(): void {
    this.stop();
    this.idleManager?.destroy();
    this.idleManager = null;
    this.player.removeAllListeners();
    logger.info('DJCova destroyed');
  }
}
