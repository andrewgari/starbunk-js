/**
 * InterestRepository - Data access layer for user interests
 *
 * Provides a clean abstraction over interest operations,
 * managing keyword-based interest tracking and weight adjustments.
 */

import Database from 'better-sqlite3';
import { BaseRepository } from '@starbunk/shared';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { KeywordInterestRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('InterestRepository');

export class InterestRepository extends BaseRepository<KeywordInterestRow> {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Get all interests for a profile
   */
  async getInterests(profileId: string): Promise<KeywordInterestRow[]> {
    return await this.query<KeywordInterestRow>(
      `SELECT profile_id, keyword, category, weight
       FROM keyword_interests
       WHERE profile_id = ?
       ORDER BY weight DESC`,
      [profileId],
    );
  }

  /**
   * Upsert (insert or update) an interest
   */
  async upsertInterest(
    profileId: string,
    keyword: string,
    category: string | null = null,
    weight: number = 1.0,
  ): Promise<void> {
    await this.execute(
      `INSERT INTO keyword_interests (profile_id, keyword, category, weight)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(profile_id, keyword)
       DO UPDATE SET weight = excluded.weight, category = excluded.category`,
      [profileId, keyword.toLowerCase().trim(), category, weight],
    );

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
  async deleteInterest(profileId: string, keyword: string): Promise<boolean> {
    const changes = await this.execute(
      `DELETE FROM keyword_interests
       WHERE profile_id = ? AND keyword = ?`,
      [profileId, keyword.toLowerCase().trim()],
    );

    const deleted = changes > 0;

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
  async adjustWeight(profileId: string, keyword: string, delta: number): Promise<void> {
    await this.execute(
      `UPDATE keyword_interests
       SET weight = MAX(0.1, MIN(2.0, weight + ?))
       WHERE profile_id = ? AND keyword = ?`,
      [delta, profileId, keyword.toLowerCase().trim()],
    );

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
  async clearProfileInterests(profileId: string): Promise<number> {
    const changes = await this.execute(
      `DELETE FROM keyword_interests
       WHERE profile_id = ?`,
      [profileId],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        deleted_count: changes,
      })
      .info('Profile interests cleared');

    return changes;
  }

  /**
   * Initialize interests in batch (for loading from profile)
   */
  async initializeFromInterests(profileId: string, interests: string[]): Promise<void> {
    // Clear existing interests
    await this.clearProfileInterests(profileId);

    // Insert new interests
    for (const interest of interests) {
      // Parse interest string - may include category prefix like "tech:typescript"
      const [category, keyword] = interest.includes(':')
        ? interest.split(':', 2)
        : [null, interest];

      await this.execute(
        `INSERT INTO keyword_interests (profile_id, keyword, category, weight)
         VALUES (?, ?, ?, ?)`,
        [profileId, keyword.toLowerCase().trim(), category || null, 1.0],
      );
    }

    logger
      .withMetadata({
        profile_id: profileId,
        keywords_inserted: interests.length,
      })
      .info('Profile interests initialized');
  }
}
