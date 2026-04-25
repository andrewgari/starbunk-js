/**
 * Social Battery Service — per-channel rate limiting for natural conversation pacing.
 *
 * Enforces two independent throttles per (profile, channel) pair:
 *   1. **Window limit**: at most N messages within a rolling time window
 *   2. **Cooldown**: a minimum gap between consecutive messages
 *
 * State is persisted in Postgres so limits survive process restarts.
 * Direct @mentions bypass rate limits upstream (in ResponseDecisionService)
 * so the bot always responds when explicitly addressed.
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import { SocialBatteryStateRow, SocialBatteryCheck } from '@/models/memory-types';
import { SocialBatteryRepository } from '@/repositories/social-battery-repository';
import { VERBOSE_LOGGING } from '@/utils/verbose-mode';

const logger = logLayer.withPrefix('SocialBatteryService');

/**
 * Runtime rate-limit config used by this service — camelCase TypeScript convention.
 * Note: memory-types.ts defines a structurally similar interface also called
 * SocialBatteryConfig but in snake_case, matching the YAML schema. That one
 * documents the raw config shape; this one is what callers pass at runtime.
 */
export interface SocialBatteryConfig {
  maxMessages: number;
  windowMinutes: number;
  cooldownSeconds: number;
}

export class SocialBatteryService {
  private socialBatteryRepo: SocialBatteryRepository;

  constructor(socialBatteryRepo: SocialBatteryRepository) {
    this.socialBatteryRepo = socialBatteryRepo;
  }

  /**
   * Check if the bot can speak in a channel
   */
  async canSpeak(
    profileId: string,
    channelId: string,
    config: SocialBatteryConfig,
  ): Promise<SocialBatteryCheck> {
    const state = await this.getState(profileId, channelId);
    const now = new Date();

    // No state yet - can speak
    if (!state) {
      return {
        canSpeak: true,
        currentCount: 0,
        maxAllowed: config.maxMessages,
        reason: 'ok',
      };
    }

    // Check cooldown
    if (state.last_message_at) {
      const lastMessage = new Date(state.last_message_at);
      const secondsSinceLastMessage = (now.getTime() - lastMessage.getTime()) / 1000;

      if (secondsSinceLastMessage < config.cooldownSeconds) {
        const secondsRemaining = Math.ceil(config.cooldownSeconds - secondsSinceLastMessage);
        const meta = {
          profile_id: profileId,
          channel_id: channelId,
          cooldown_seconds: config.cooldownSeconds,
          seconds_remaining: secondsRemaining,
        };
        if (VERBOSE_LOGGING) {
          logger
            .withMetadata(meta)
            .info(`Cooldown active — ${secondsRemaining}s remaining before next response`);
        } else {
          logger.withMetadata(meta).debug('Cooldown active');
        }

        return {
          canSpeak: false,
          currentCount: state.message_count,
          maxAllowed: config.maxMessages,
          reason: 'cooldown',
          windowResetSeconds: secondsRemaining,
        };
      }
    }

    // Check rate limit window
    if (state.window_start) {
      const windowStart = new Date(state.window_start);
      const minutesSinceWindowStart = (now.getTime() - windowStart.getTime()) / (1000 * 60);

      // Window expired - reset
      if (minutesSinceWindowStart >= config.windowMinutes) {
        return {
          canSpeak: true,
          currentCount: 0,
          maxAllowed: config.maxMessages,
          reason: 'ok',
        };
      }

      // Check message count within window
      if (state.message_count >= config.maxMessages) {
        const windowResetSeconds = Math.ceil(
          config.windowMinutes * 60 - minutesSinceWindowStart * 60,
        );

        const meta = {
          profile_id: profileId,
          channel_id: channelId,
          message_count: state.message_count,
          max_messages: config.maxMessages,
          window_minutes: config.windowMinutes,
          window_reset_seconds: windowResetSeconds,
        };
        if (VERBOSE_LOGGING) {
          logger
            .withMetadata(meta)
            .info(
              `Rate limited — sent ${state.message_count}/${config.maxMessages} messages this window, resets in ${windowResetSeconds}s`,
            );
        } else {
          logger.withMetadata(meta).debug('Rate limited');
        }

        return {
          canSpeak: false,
          currentCount: state.message_count,
          maxAllowed: config.maxMessages,
          reason: 'rate_limited',
          windowResetSeconds,
        };
      }
    }

    return {
      canSpeak: true,
      currentCount: state.message_count,
      maxAllowed: config.maxMessages,
      reason: 'ok',
    };
  }

  /**
   * Record that a message was sent
   */
  async recordMessage(
    profileId: string,
    channelId: string,
    config: SocialBatteryConfig,
  ): Promise<void> {
    const state = await this.getState(profileId, channelId);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!state) {
      // Create new state
      await this.socialBatteryRepo.createState(profileId, channelId, nowIso);
    } else {
      // Check if window needs reset
      const windowStart = state.window_start ? new Date(state.window_start) : now;
      const minutesSinceWindowStart = (now.getTime() - windowStart.getTime()) / (1000 * 60);

      if (minutesSinceWindowStart >= config.windowMinutes) {
        // Reset window
        await this.socialBatteryRepo.resetWindow(profileId, channelId, nowIso);
      } else {
        // Increment count
        await this.socialBatteryRepo.incrementCount(profileId, channelId, nowIso);
      }
    }

    logger
      .withMetadata({
        profile_id: profileId,
        channel_id: channelId,
      })
      .debug('Message recorded');
  }

  /**
   * Get current state for a channel
   */
  async getState(profileId: string, channelId: string): Promise<SocialBatteryStateRow | null> {
    return await this.socialBatteryRepo.getState(profileId, channelId);
  }

  /**
   * Reset state for a channel (admin function)
   */
  async resetChannel(profileId: string, channelId: string): Promise<void> {
    await this.socialBatteryRepo.deleteState(profileId, channelId);

    logger
      .withMetadata({
        profile_id: profileId,
        channel_id: channelId,
      })
      .info('Channel state reset');
  }

  /**
   * Reset all states for a profile (admin function)
   */
  async resetProfile(profileId: string): Promise<void> {
    await this.socialBatteryRepo.resetProfile(profileId);

    logger.withMetadata({ profile_id: profileId }).info('Profile state reset');
  }

  /**
   * Get summary of activity across all channels for a profile
   */
  async getActivitySummary(profileId: string): Promise<{
    totalChannels: number;
    totalMessages: number;
    activeChannels: number;
  }> {
    return await this.socialBatteryRepo.getActivitySummary(profileId);
  }
}
