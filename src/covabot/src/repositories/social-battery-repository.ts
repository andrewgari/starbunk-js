/**
 * SocialBatteryRepository - Data access layer for social battery state
 *
 * Provides a clean abstraction over social battery state operations,
 * managing rate-limiting and message frequency state persistence.
 */

import { PostgresBaseRepository } from '@starbunk/shared';
import { PostgresService } from '@starbunk/shared/database';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { SocialBatteryStateRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('SocialBatteryRepository');

export class SocialBatteryRepository extends PostgresBaseRepository<SocialBatteryStateRow> {
  constructor(pgService: PostgresService) {
    super(pgService);
  }

  /**
   * Get current social battery state for a channel and profile
   */
  async getState(profileId: string, channelId: string): Promise<SocialBatteryStateRow | null> {
    const rows = await this.query<SocialBatteryStateRow>(
      `SELECT profile_id, channel_id, message_count, window_start, last_message_at
       FROM covabot_social_battery
       WHERE profile_id = $1 AND channel_id = $2`,
      [profileId, channelId],
    );

    return rows[0] || null;
  }

  /**
   * Create initial state for a channel
   */
  async createState(profileId: string, channelId: string, nowIso: string): Promise<void> {
    await this.execute(
      `INSERT INTO covabot_social_battery (profile_id, channel_id, message_count, window_start, last_message_at)
       VALUES ($1, $2, 1, $3, $4)`,
      [profileId, channelId, nowIso, nowIso],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        channel_id: channelId,
      })
      .debug('Social battery state created');
  }

  /**
   * Reset the window for a channel
   */
  async resetWindow(profileId: string, channelId: string, nowIso: string): Promise<void> {
    await this.execute(
      `UPDATE covabot_social_battery
       SET message_count = 1, window_start = $1, last_message_at = $2
       WHERE profile_id = $3 AND channel_id = $4`,
      [nowIso, nowIso, profileId, channelId],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        channel_id: channelId,
      })
      .debug('Social battery window reset');
  }

  /**
   * Increment message count for a channel
   */
  async incrementCount(profileId: string, channelId: string, nowIso: string): Promise<void> {
    await this.execute(
      `UPDATE covabot_social_battery
       SET message_count = message_count + 1, last_message_at = $1
       WHERE profile_id = $2 AND channel_id = $3`,
      [nowIso, profileId, channelId],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        channel_id: channelId,
      })
      .debug('Social battery message count incremented');
  }

  /**
   * Delete state for a specific channel and profile
   */
  async deleteState(profileId: string, channelId: string): Promise<void> {
    await this.execute(
      `DELETE FROM covabot_social_battery
       WHERE profile_id = $1 AND channel_id = $2`,
      [profileId, channelId],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        channel_id: channelId,
      })
      .debug('Social battery state deleted');
  }

  /**
   * Reset all social battery state for a profile
   */
  async resetProfile(profileId: string): Promise<void> {
    await this.execute(
      `DELETE FROM covabot_social_battery
       WHERE profile_id = $1`,
      [profileId],
    );

    logger
      .withMetadata({
        profile_id: profileId,
      })
      .info('Profile social battery state reset');
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
         SUM(CASE WHEN last_message_at > NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END) as active_channels
       FROM covabot_social_battery
       WHERE profile_id = $1`,
      [profileId],
    );

    const row = rows[0];

    return {
      totalChannels: row.total_channels,
      totalMessages: row.total_messages || 0,
      activeChannels: row.active_channels,
    };
  }
}
