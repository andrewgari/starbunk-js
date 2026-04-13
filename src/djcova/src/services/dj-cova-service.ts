import { ChatInputCommandInteraction } from 'discord.js';
import { DJCova } from '../core/dj-cova';
import {
  validateVoiceChannelAccess,
  createVoiceConnection,
  subscribePlayerToConnection,
  disconnectVoiceConnection,
} from '../utils/voice-utils';
import { logger } from '../observability/logger';
import { getDJCovaMetrics } from '../observability/djcova-metrics';
import { DJCovaErrorCode } from '../errors';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { logError } from '@starbunk/shared/errors';

/**
 * DJCovaService - Business logic layer
 * Handles validation, orchestration, and coordinates between commands and DJCova
 */
export class DJCovaService {
  private djCova: DJCova;

  constructor(djCova: DJCova) {
    this.djCova = djCova;
  }

  /**
   * Play a YouTube URL in a voice channel
   */
  async play(interaction: ChatInputCommandInteraction, url: string): Promise<void> {
    const guildId = interaction.guild?.id ?? 'unknown';
    logger.info(`Play request received for URL: ${url}`);
    logger.debug(`Guild: ${guildId}, Channel: ${interaction.channelId}`);

    // Validate voice channel access
    logger.debug('Validating voice channel access...');
    const validation = validateVoiceChannelAccess(interaction);
    if (!validation.isValid) {
      const errorMsg = validation.errorMessage || 'Voice channel validation failed';
      logger.warn(`Voice channel validation failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    logger.debug('✅ Voice channel validation passed');

    const { voiceChannel } = validation;

    if (!voiceChannel) {
      const errorMsg = 'Voice channel is not available';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    logger.debug(`Voice channel: ${voiceChannel.name} (${voiceChannel.id})`);

    // Validate YouTube URL
    logger.debug('Validating YouTube URL...');
    if (!this.isValidYouTubeUrl(url)) {
      logger
        .withMetadata({ error_code: DJCovaErrorCode.DJCOVA_INVALID_URL, url, guild_id: guildId })
        .warn('Invalid YouTube URL provided');
      throw new Error('Please provide a valid YouTube URL (youtube.com or youtu.be)');
    }
    logger.debug('✅ YouTube URL validation passed');

    // Create voice connection
    logger.info('Creating voice connection...');
    const connection = createVoiceConnection(voiceChannel, voiceChannel.guild.voiceAdapterCreator);
    logger.debug('✅ Voice connection created');

    // Subscribe player to connection
    logger.debug('Subscribing player to connection...');
    const subscription = await subscribePlayerToConnection(connection, this.djCova.getPlayer());
    if (!subscription) {
      logError(
        logger,
        DJCovaErrorCode.DJCOVA_VOICE_JOIN_FAILED,
        'Failed to connect audio player to voice channel',
        {
          guild_id: guildId,
        },
      );
      getDJCovaMetrics().trackVoiceJoin(guildId, 'failed');
      getMetricsService().trackBotError(
        'djcova',
        DJCovaErrorCode.DJCOVA_VOICE_JOIN_FAILED,
        guildId,
      );
      throw new Error('Failed to connect audio player to voice channel');
    }
    getDJCovaMetrics().trackVoiceJoin(guildId, 'joined');
    logger.debug('✅ Player subscribed to connection');

    if (!interaction.guild) {
      const errorMsg = 'This command can only be used within a server (guild) context';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Initialize idle management with notification callback
    logger.debug('Setting up idle management with notification callback...');
    const notificationCallback = async (message: string) => {
      try {
        logger.debug(`Sending idle notification: ${message}`);
        await interaction.followUp({ content: message, ephemeral: false });
      } catch (error) {
        logger
          .withError(error instanceof Error ? error : new Error(String(error)))
          .error('Failed to send auto-disconnect notification');
      }
    };

    logger.debug('Initializing idle management...');
    this.djCova.initializeIdleManagement(
      interaction.guild.id,
      interaction.channelId,
      notificationCallback,
    );
    logger.debug('✅ Idle management initialized');

    // Register the subscription before play() so it can be tracked for cleanup.
    // play() uses stopAudioOnly() internally which preserves the voice subscription,
    // so the subscription is safe to register here.
    this.djCova.setSubscription(subscription);
    logger.info('Starting playback...');
    await this.djCova.play(url);
    logger.info('✅ Playback started successfully');
  }

  /**
   * Stop playback and disconnect
   */
  stop(interaction: ChatInputCommandInteraction): void {
    this.djCova.stop();

    if (interaction.guild?.id) {
      disconnectVoiceConnection(interaction.guild.id);
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (volume < 1 || volume > 100) {
      throw new Error('Volume must be between 1 and 100');
    }

    this.djCova.setVolume(volume);
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.djCova.getVolume();
  }

  /**
   * Validate YouTube URL
   * Protected to allow testing
   */
  protected isValidYouTubeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      const allowedHosts = new Set([
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'youtu.be',
        'www.youtu.be',
      ]);

      if (!allowedHosts.has(hostname)) {
        return false;
      }

      const pathname = parsed.pathname;

      // Short URLs: https://youtu.be/<id>
      if (hostname.endsWith('youtu.be')) {
        // Ensure there is at least one non-empty path segment (the video ID)
        const segments = pathname.split('/').filter(Boolean);
        return segments.length >= 1;
      }

      // Standard watch URLs: https://www.youtube.com/watch?v=<id>
      if (pathname.startsWith('/watch')) {
        const videoId = parsed.searchParams.get('v');
        return videoId !== null && videoId.length > 0;
      }

      // Shorts URLs: https://www.youtube.com/shorts/<id>
      if (pathname.startsWith('/shorts/')) {
        const segments = pathname.split('/').filter(Boolean);
        return segments.length >= 2; // ["shorts", "<id>"]
      }

      // Reject all other paths
      return false;
    } catch {
      // Invalid URL format
      return false;
    }
  }
}
