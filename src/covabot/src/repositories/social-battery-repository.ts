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
   * Get current social battery state for a user in a channel
   */
  getState(channelId: string, userId: string): SocialBatteryStateRow | null {
    const stmt = this.db.prepare(`
      SELECT profile_id, channel_id, message_count, window_start, last_message_at
      FROM social_battery_state
      WHERE channel_id = ? AND profile_id = ?
    `);

    const row = stmt.get(channelId, userId) as SocialBatteryStateRow | undefined;
    return row || null;
  }

  /**
   * Upsert (insert or update) social battery state
   */
  upsertState(
    channelId: string,
    userId: string,
    level: number,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO social_battery_state (profile_id, channel_id, message_count, window_start, last_message_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(profile_id, channel_id)
      DO UPDATE SET message_count = ?, last_message_at = datetime('now')
    `);

    stmt.run(userId, channelId, level, level);

    logger.withMetadata({
      channel_id: channelId,
      user_id: userId,
      level,
    }).debug('Social battery state upserted');
  }

  /**
   * Reset all social battery state for a channel
   */
  resetChannel(channelId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM social_battery_state
      WHERE channel_id = ?
    `);

    stmt.run(channelId);

    logger.withMetadata({
      channel_id: channelId,
    }).info('Channel social battery state reset');
  }

  /**
   * Reset all social battery state for a user
   */
  resetProfile(userId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM social_battery_state
      WHERE profile_id = ?
    `);

    stmt.run(userId);

    logger.withMetadata({
      user_id: userId,
    }).info('User social battery state reset');
  }
}
