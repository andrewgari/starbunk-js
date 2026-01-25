/**
 * SocialBatteryRepository - Data access layer for social battery state
 *
 * Provides a clean abstraction over social battery state operations,
 * managing rate-limiting and message frequency state persistence.
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { SocialBatteryStateRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('SocialBatteryRepository');

export class SocialBatteryRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get current social battery state for a channel and profile
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
   * Create initial state for a channel
   */
  createState(profileId: string, channelId: string, nowIso: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO social_battery_state (profile_id, channel_id, message_count, window_start, last_message_at)
      VALUES (?, ?, 1, ?, ?)
    `);

    stmt.run(profileId, channelId, nowIso, nowIso);

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
  resetWindow(profileId: string, channelId: string, nowIso: string): void {
    const stmt = this.db.prepare(`
      UPDATE social_battery_state
      SET message_count = 1, window_start = ?, last_message_at = ?
      WHERE profile_id = ? AND channel_id = ?
    `);

    stmt.run(nowIso, nowIso, profileId, channelId);

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
  incrementCount(profileId: string, channelId: string, nowIso: string): void {
    const stmt = this.db.prepare(`
      UPDATE social_battery_state
      SET message_count = message_count + 1, last_message_at = ?
      WHERE profile_id = ? AND channel_id = ?
    `);

    stmt.run(nowIso, profileId, channelId);

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
  deleteState(profileId: string, channelId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM social_battery_state
      WHERE profile_id = ? AND channel_id = ?
    `);

    stmt.run(profileId, channelId);

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
  resetProfile(profileId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM social_battery_state
      WHERE profile_id = ?
    `);

    stmt.run(profileId);

    logger
      .withMetadata({
        profile_id: profileId,
      })
      .info('Profile social battery state reset');
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
