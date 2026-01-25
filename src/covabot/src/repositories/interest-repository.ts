/**
 * InterestRepository - Data access layer for user interests
 *
 * Provides a clean abstraction over interest operations,
 * managing keyword-based interest tracking and weight adjustments.
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { KeywordInterestRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('InterestRepository');

export class InterestRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get all interests for a user
   */
  getInterests(userId: string): KeywordInterestRow[] {
    const stmt = this.db.prepare(`
      SELECT profile_id, keyword, category, weight
      FROM keyword_interests
      WHERE profile_id = ?
      ORDER BY weight DESC
    `);

    return stmt.all(userId) as KeywordInterestRow[];
  }

  /**
   * Upsert (insert or update) an interest
   */
  upsertInterest(
    userId: string,
    keyword: string,
    weight: number,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO keyword_interests (profile_id, keyword, category, weight)
      VALUES (?, ?, NULL, ?)
      ON CONFLICT(profile_id, keyword)
      DO UPDATE SET weight = excluded.weight
    `);

    stmt.run(userId, keyword.toLowerCase().trim(), weight);

    logger.withMetadata({
      user_id: userId,
      keyword,
      weight,
    }).debug('Interest upserted');
  }

  /**
   * Delete a specific interest
   */
  deleteInterest(userId: string, keyword: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM keyword_interests
      WHERE profile_id = ? AND keyword = ?
    `);

    const result = stmt.run(userId, keyword.toLowerCase().trim());
    const deleted = result.changes > 0;

    if (deleted) {
      logger.withMetadata({
        user_id: userId,
        keyword,
      }).debug('Interest deleted');
    }

    return deleted;
  }

  /**
   * Adjust interest weight by a delta amount
   */
  adjustWeight(userId: string, keyword: string, delta: number): void {
    const stmt = this.db.prepare(`
      UPDATE keyword_interests
      SET weight = MAX(0.1, MIN(2.0, weight + ?))
      WHERE profile_id = ? AND keyword = ?
    `);

    stmt.run(delta, userId, keyword.toLowerCase().trim());

    logger.withMetadata({
      user_id: userId,
      keyword,
      delta,
    }).debug('Interest weight adjusted');
  }

  /**
   * Clear all interests for a user profile
   */
  clearProfileInterests(userId: string): number {
    const stmt = this.db.prepare(`
      DELETE FROM keyword_interests
      WHERE profile_id = ?
    `);

    const result = stmt.run(userId);

    logger.withMetadata({
      user_id: userId,
      deleted_count: result.changes,
    }).info('Profile interests cleared');

    return result.changes;
  }
}
