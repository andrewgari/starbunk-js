/**
 * SocialBatteryRepository - Data access layer for social battery state
 *
 * Provides a clean abstraction over social battery state operations,
 * managing rate-limiting and message frequency state persistence.
 */

import Database from 'better-sqlite3';
import { BaseRepository } from '@starbunk/shared';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { SocialBatteryStateRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('SocialBatteryRepository');

export class SocialBatteryRepository extends BaseRepository<SocialBatteryStateRow> {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Get current social battery state for a channel and profile
   */
  async getState(profileId: string, channelId: string): Promise<SocialBatteryStateRow | null> {
    const rows = await this.query<SocialBatteryStateRow>(
      `SELECT profile_id, channel_id, message_count, window_start, last_message_at
       FROM social_battery_state
       WHERE profile_id = ? AND channel_id = ?`,
      [profileId, channelId]
    );

    return rows[0] || null;
  }

  /**
   * Create initial state for a channel
   */
  async createState(profileId: string, channelId: string, nowIso: string): Promise<void> {
    await this.execute(
      `INSERT INTO social_battery_state (profile_id, channel_id, message_count, window_start, last_message_at)
       VALUES (?, ?, 1, ?, ?)`,
      [profileId, channelId, nowIso, nowIso]
    );

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
    }).debug('Social battery state created');
  }

  /**
   * Reset the window for a channel
   */
  async resetWindow(profileId: string, channelId: string, nowIso: string): Promise<void> {
    await this.execute(
      `UPDATE social_battery_state
       SET message_count = 1, window_start = ?, last_message_at = ?
       WHERE profile_id = ? AND channel_id = ?`,
      [nowIso, nowIso, profileId, channelId]
    );

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
    }).debug('Social battery window reset');
  }

  /**
   * Increment message count for a channel
   */
  async incrementCount(profileId: string, channelId: string, nowIso: string): Promise<void> {
    await this.execute(
      `UPDATE social_battery_state
       SET message_count = message_count + 1, last_message_at = ?
       WHERE profile_id = ? AND channel_id = ?`,
      [nowIso, profileId, channelId]
    );

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
    }).debug('Social battery message count incremented');
  }

  /**
   * Delete state for a specific channel and profile
   */
  async deleteState(profileId: string, channelId: string): Promise<void> {
    await this.execute(
      `DELETE FROM social_battery_state
       WHERE profile_id = ? AND channel_id = ?`,
      [profileId, channelId]
    );

    logger.withMetadata({
      profile_id: profileId,
      channel_id: channelId,
    }).debug('Social battery state deleted');
  }

  /**
   * Reset all social battery state for a profile
   */
  async resetProfile(profileId: string): Promise<void> {
    await this.execute(
      `DELETE FROM social_battery_state
       WHERE profile_id = ?`,
      [profileId]
    );

    logger.withMetadata({
      profile_id: profileId,
    }).info('Profile social battery state reset');
  }

  /**
   * Get summary of activity across all channels for a profile
   */
  async getActivitySummary(profileId: string): Promise<{
    totalChannels: number;
    totalMessages: number;
    activeChannels: number;
  }> {
    const rows = await this.query<{
      total_channels: number;
      total_messages: number | null;
      active_channels: number;
    }>(
      `SELECT
         COUNT(*) as total_channels,
         SUM(message_count) as total_messages,
         SUM(CASE WHEN last_message_at > datetime('now', '-1 hour') THEN 1 ELSE 0 END) as active_channels
       FROM social_battery_state
       WHERE profile_id = ?`,
      [profileId]
    );

    const row = rows[0];

    return {
      totalChannels: row.total_channels,
      totalMessages: row.total_messages || 0,
      activeChannels: row.active_channels,
    };
  }
}

