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
  private isCleaningUp: boolean = false;

  constructor() {
    logger.debug('DJCova constructor: initializing...');

    // Set FFMPEG path for audio processing
    if (ffmpegPath && !process.env.FFMPEG_PATH) {
      logger.debug(`Setting FFMPEG_PATH from ffmpeg-static: ${ffmpegPath}`);
      process.env.FFMPEG_PATH = ffmpegPath;
    } else if (process.env.FFMPEG_PATH) {
      logger.debug(`FFMPEG_PATH already set: ${process.env.FFMPEG_PATH}`);
    } else {
      logger.warn('No FFMPEG_PATH set and ffmpeg-static not available');
    }

    try {
      this.player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
      logger.debug('Audio player created successfully');
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .error('Failed to create audio player');
      throw error;
    }

    this.setupEventHandlers();
    logger.info('✅ DJCova initialized');
  }

  private setupEventHandlers(): void {
    logger.debug('Setting up audio player event handlers...');

    this.player.on(AudioPlayerStatus.Playing, () => {
      logger.info('▶️ Playback started');
      logger.debug('Resetting idle timer due to playback start');
      this.idleManager?.resetIdleTimer();
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      logger.info('⏸️ Playback idle');
      logger.debug('Starting idle timer due to playback idle');
      this.idleManager?.startIdleTimer();
    });

    this.player.on('error', (error: Error) => {
      logger.withError(error).error('❌ Audio player error');
      logger.debug('Triggering cleanup due to player error');
      this.cleanup();
    });

    this.player.on(AudioPlayerStatus.Buffering, () => {
      logger.debug('Audio player is buffering...');
    });

    this.player.on(AudioPlayerStatus.AutoPaused, () => {
      logger.debug('Audio player auto-paused');
    });

    logger.debug('Audio player event handlers registered');
  }

  async play(url: string): Promise<void> {
    logger.info(`🎵 Playing: ${url}`);
    logger.debug('Stopping any existing playback...');
    this.stop();
    logger.debug('Creating audio stream from URL...');

    try {
      logger.debug(`Calling getYouTubeAudioStream for URL: ${url}`);
      const { stream, process } = getYouTubeAudioStream(url);
      logger.debug(`✅ YouTube audio stream created, process PID: ${process.pid}`);
      this.ytdlpProcess = process;

      logger.debug('Probing audio stream format...');
      const probeResult = await demuxProbe(stream);
      logger.debug(`✅ Stream probe complete, type: ${probeResult.type}`);

      this.currentResource = createAudioResource(probeResult.stream, {
        inputType: probeResult.type,
        inlineVolume: true,
      });
      logger.debug('✅ Audio resource created');

      if (this.currentResource.volume) {
        const volumePercent = this.volume;
        const volumeFloat = this.volume / 100;
        this.currentResource.volume.setVolume(volumeFloat);
        logger.debug(`Volume set to ${volumePercent}% (${volumeFloat})`);
      } else {
        logger.warn('Audio resource has no volume property');
      }

      logger.debug('Calling player.play() with audio resource...');
      this.player.play(this.currentResource);
      logger.info('✅ Audio playback started');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger
        .withError(err)
        .withMetadata({
          stack: err.stack,
          url,
          ytdlpProcessPid: this.ytdlpProcess?.pid,
        })
        .error('❌ Failed to play audio');
      logger.debug('Cleaning up resources after play error...');
      this.cleanup();
      throw err;
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
    logger.debug(`Initializing idle management for guild ${guildId}, channel ${channelId}`);

    if (this.idleManager) {
      logger.debug(`Destroying existing idle manager for guild ${guildId}`);
      this.idleManager.destroy();
    }

    this.notificationCallback = notificationCallback || null;
    logger.debug(`Notification callback ${notificationCallback ? 'registered' : 'not provided'}`);

    const config = getMusicConfig();
    logger.debug(`Music config: idleTimeoutSeconds=${config.idleTimeoutSeconds}`);

    const idleConfig: IdleManagerConfig = {
      timeoutSeconds: config.idleTimeoutSeconds,
      guildId,
      channelId,
      onDisconnect: async (reason: string) => {
        logger.info(`Idle manager triggered disconnect: ${reason}`);
        this.stop();
        if (this.notificationCallback) {
          logger.debug('Sending idle disconnect notification...');
          try {
            await this.notificationCallback(reason);
          } catch (error) {
            logger
              .withError(error instanceof Error ? error : new Error(String(error)))
              .warn('Failed to send idle disconnect notification');
          }
        }
      },
    };

    this.idleManager = createIdleManager(idleConfig);
    logger.info(
      `✅ Idle management initialized for guild ${guildId} with timeout ${config.idleTimeoutSeconds}s`,
    );
  }

  private cleanup(): void {
    // Prevent concurrent cleanup calls
    if (this.isCleaningUp) {
      logger.debug('Cleanup already in progress, skipping');
      return;
    }

    logger.debug('Starting cleanup...');
    this.isCleaningUp = true;

    try {
      // Step 1: Unsubscribe from current subscription FIRST
      if (this.currentSubscription) {
        try {
          logger.debug('Unsubscribing from player subscription');
          this.currentSubscription.unsubscribe();
          logger.debug('✅ Unsubscribed from player subscription');
        } catch (error) {
          logger
            .withError(error instanceof Error ? error : new Error(String(error)))
            .warn('⚠️ Error unsubscribing from player subscription');
        }
        this.currentSubscription = undefined;
      }

      // Step 2: Kill yt-dlp process with SIGKILL
      if (this.ytdlpProcess) {
        try {
          const pidToKill = this.ytdlpProcess.pid || 'unknown';
          logger.debug(`Killing yt-dlp process (PID: ${pidToKill})`);
          this.ytdlpProcess.kill('SIGKILL');
          logger.debug(`✅ yt-dlp process killed`);
        } catch (error) {
          logger
            .withError(error instanceof Error ? error : new Error(String(error)))
            .warn('⚠️ Error killing yt-dlp process');
        }
        this.ytdlpProcess = null;
      }

      // Step 3: Clear resource reference
      if (this.currentResource) {
        logger.debug('Clearing audio resource');
        this.currentResource = undefined;
        logger.debug('✅ Audio resource cleared');
      }

      logger.debug('✅ Cleanup complete: subscription, process, and resource cleared');
    } finally {
      this.isCleaningUp = false;
    }
  }

  destroy(): void {
    logger.debug('Destroying DJCova...');
    this.stop();

    if (this.idleManager) {
      logger.debug('Destroying idle manager...');
      this.idleManager.destroy();
      this.idleManager = null;
    }

    this.player.removeAllListeners();
    logger.info('✅ DJCova destroyed');
  }
}
