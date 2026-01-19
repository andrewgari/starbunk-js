/**
 * Social Battery Service - Rate limiting with SQLite persistence
 *
 * Manages message frequency to prevent spam and create natural conversation pacing
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { SocialBatteryStateRow, SocialBatteryCheck } from '@/models/memory-types';

const logger = logLayer.withPrefix('SocialBatteryService');

export interface SocialBatteryConfig {
  maxMessages: number;
  windowMinutes: number;
  cooldownSeconds: number;
}

export class SocialBatteryService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Check if the bot can speak in a channel
   */
  canSpeak(
    profileId: string,
    channelId: string,
    config: SocialBatteryConfig,
  ): SocialBatteryCheck {
    const state = this.getState(profileId, channelId);
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
        logger.withMetadata({
          profile_id: profileId,
          channel_id: channelId,
          seconds_remaining: config.cooldownSeconds - secondsSinceLastMessage,
        }).debug('Cooldown active');

        return {
          canSpeak: false,
          currentCount: state.message_count,
          maxAllowed: config.maxMessages,
          reason: 'cooldown',
          windowResetSeconds: Math.ceil(config.cooldownSeconds - secondsSinceLastMessage),
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
          (config.windowMinutes * 60) - (minutesSinceWindowStart * 60)
        );

        logger.withMetadata({
          profile_id: profileId,
          channel_id: channelId,
          message_count: state.message_count,
          max_messages: config.maxMessages,
          window_reset_seconds: windowResetSeconds,
        }).debug('Rate limited');

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
  recordMessage(profileId: string, channelId: string, config: SocialBatteryConfig): void {
    const state = this.getState(profileId, channelId);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!state) {
      // Create new state
      const stmt = this.db.prepare(`
        INSERT INTO social_battery_state (profile_id, channel_id, message_count, window_start, last_message_at)
        VALUES (?, ?, 1, ?, ?)
      `);
      stmt.run(profileId, channelId, nowIso, nowIso);
    } else {
      // Check if window needs reset
      const windowStart = state.window_start ? new Date(state.window_start) : now;
      const minutesSinceWindowStart = (now.getTime() - windowStart.getTime()) / (1000 * 60);

      if (minutesSinceWindowStart >= config.windowMinutes) {
        // Reset window
        const stmt = this.db.prepare(`
          UPDATE social_battery_state
          SET message_count = 1, window_start = ?, last_message_at = ?
          WHERE profile_id = ? AND channel_id = ?
        `);
        stmt.run(nowIso, nowIso, profileId, channelId);
      } else {
        // Increment count
        const stmt = this.db.prepare(`
          UPDATE social_battery_state
          SET message_count = message_count + 1, last_message_at = ?
          WHERE profile_id = ? AND channel_id = ?
        `);
        stmt.run(nowIso, profileId, channelId);
      }
    }

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
    }).debug('Message recorded');
  }

  /**
   * Get current state for a channel
   */
  getState(profileId: string, channelId: string): SocialBatteryStateRow | null {
    const stmt = this.db.prepare(`
      SELECT profile_id, channel_id, message_count, window_start, last_message_at
      FROM social_battery_state
      WHERE profile_id = ? AND channel_id = ?
    `);

    const row = stmt.get(profileId, channelId) as SocialBatteryStateRow | undefined;
    return row || null;
  }

  /**
   * Reset state for a channel (admin function)
   */
  resetChannel(profileId: string, channelId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM social_battery_state
      WHERE profile_id = ? AND channel_id = ?
    `);

    stmt.run(profileId, channelId);

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
    }).info('Channel state reset');
  }

  /**
   * Reset all states for a profile (admin function)
   */
  resetProfile(profileId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM social_battery_state
      WHERE profile_id = ?
    `);

    stmt.run(profileId);

    logger.withMetadata({ profile_id: profileId }).info('Profile state reset');
  }

  /**
   * Get summary of activity across all channels for a profile
   */
  getActivitySummary(profileId: string): {
    totalChannels: number;
    totalMessages: number;
    activeChannels: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_channels,
        SUM(message_count) as total_messages,
        SUM(CASE WHEN last_message_at > datetime('now', '-1 hour') THEN 1 ELSE 0 END) as active_channels
      FROM social_battery_state
      WHERE profile_id = ?
    `);

    const row = stmt.get(profileId) as {
      total_channels: number;
      total_messages: number | null;
      active_channels: number;
    };

    return {
      totalChannels: row.total_channels,
      totalMessages: row.total_messages || 0,
      activeChannels: row.active_channels,
    };
  }
}
