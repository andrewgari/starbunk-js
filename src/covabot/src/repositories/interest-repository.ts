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
   * Get all interests for a profile
   */
  getInterests(profileId: string): KeywordInterestRow[] {
    const stmt = this.db.prepare(`
      SELECT profile_id, keyword, category, weight
      FROM keyword_interests
      WHERE profile_id = ?
      ORDER BY weight DESC
    `);

    return stmt.all(profileId) as KeywordInterestRow[];
  }

  /**
   * Upsert (insert or update) an interest
   */
  upsertInterest(
    profileId: string,
    keyword: string,
    category: string | null = null,
    weight: number = 1.0,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO keyword_interests (profile_id, keyword, category, weight)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(profile_id, keyword)
      DO UPDATE SET weight = excluded.weight, category = excluded.category
    `);

    stmt.run(profileId, keyword.toLowerCase().trim(), category, weight);

    logger
      .withMetadata({
        profile_id: profileId,
        keyword,
        weight,
      })
      .debug('Interest upserted');
  }

  /**
   * Delete a specific interest
   */
  deleteInterest(profileId: string, keyword: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM keyword_interests
      WHERE profile_id = ? AND keyword = ?
    `);

    const result = stmt.run(profileId, keyword.toLowerCase().trim());
    const deleted = result.changes > 0;

    if (deleted) {
      logger
        .withMetadata({
          profile_id: profileId,
          keyword,
        })
        .debug('Interest deleted');
    }

    return deleted;
  }

  /**
   * Adjust interest weight by a delta amount
   */
  adjustWeight(profileId: string, keyword: string, delta: number): void {
    const stmt = this.db.prepare(`
      UPDATE keyword_interests
      SET weight = MAX(0.1, MIN(2.0, weight + ?))
      WHERE profile_id = ? AND keyword = ?
    `);

    stmt.run(delta, profileId, keyword.toLowerCase().trim());

    logger
      .withMetadata({
        profile_id: profileId,
        keyword,
        delta,
      })
      .debug('Interest weight adjusted');
  }

  /**
   * Clear all interests for a profile
   */
  clearProfileInterests(profileId: string): number {
    const stmt = this.db.prepare(`
      DELETE FROM keyword_interests
      WHERE profile_id = ?
    `);

    const result = stmt.run(profileId);

    logger
      .withMetadata({
        profile_id: profileId,
        deleted_count: result.changes,
      })
      .info('Profile interests cleared');

    return result.changes;
  }

  /**
   * Initialize interests in batch (for loading from profile)
   */
  initializeFromInterests(profileId: string, interests: string[]): void {
    // Clear existing interests
    this.clearProfileInterests(profileId);

    const insertStmt = this.db.prepare(`
      INSERT INTO keyword_interests (profile_id, keyword, category, weight)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((interestList: string[]) => {
      for (const interest of interestList) {
        // Parse interest string - may include category prefix like "tech:typescript"
        const [category, keyword] = interest.includes(':')
          ? interest.split(':', 2)
          : [null, interest];

        insertStmt.run(profileId, keyword.toLowerCase().trim(), category || null, 1.0);
      }
    });

    insertMany(interests);

    logger
      .withMetadata({
        profile_id: profileId,
        keywords_inserted: interests.length,
      })
      .info('Profile interests initialized');
  }
}
