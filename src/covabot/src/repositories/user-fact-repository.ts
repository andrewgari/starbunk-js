/**
 * UserFactRepository - Data access layer for user facts
 *
 * Provides a clean abstraction over user fact operations,
 * delegating to the database for persistence.
 */

import { PostgresBaseRepository } from '@starbunk/shared';
import { PostgresService } from '@starbunk/shared/database';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { UserFactRow, UserFact } from '@/models/memory-types';

const logger = logLayer.withPrefix('UserFactRepository');

export class UserFactRepository extends PostgresBaseRepository<UserFactRow> {
  constructor(pgService: PostgresService) {
    super(pgService);
  }

  /**
   * Store a user fact (INSERT or UPDATE)
   */
  async storeUserFact(
    userId: string,
    category: string,
    factKey: string,
    confidence: number = 1.0,
    profileId: string = '',
    factValue?: string,
  ): Promise<void> {
    // If factValue is not provided, use factKey as the value (for backward compatibility)
    const value = factValue || factKey;

    await this.execute(
      `INSERT INTO covabot_user_facts (profile_id, user_id, fact_type, fact_key, fact_value, confidence)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(profile_id, user_id, fact_type, fact_key)
       DO UPDATE SET fact_value = excluded.fact_value, confidence = excluded.confidence, learned_at = CURRENT_TIMESTAMP`,
      [profileId, userId, category, factKey, value, confidence],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        user_id: userId,
        category,
        fact_key: factKey,
      })
      .debug('User fact stored');
  }

  /**
   * Get all facts for a user
   */
  async getUserFacts(userId: string): Promise<UserFact[]> {
    const rows = await this.query<
      Pick<UserFactRow, 'fact_type' | 'fact_key' | 'fact_value' | 'confidence'>
    >(
      `SELECT fact_type, fact_key, fact_value, confidence
       FROM covabot_user_facts
       WHERE user_id = $1
       ORDER BY confidence DESC`,
      [userId],
    );

    const facts = rows.map(row => ({
      type: row.fact_type as UserFact['type'],
      key: row.fact_key,
      value: row.fact_value,
      confidence: row.confidence,
    }));

    logger
      .withMetadata({
        user_id: userId,
        facts_count: facts.length,
      })
      .debug('User facts retrieved');

    return facts;
  }

  /**
   * Get facts of a specific category for a user
   */
  async getUserFactsByType(userId: string, category: string): Promise<UserFact[]> {
    const rows = await this.query<
      Pick<UserFactRow, 'fact_type' | 'fact_key' | 'fact_value' | 'confidence'>
    >(
      `SELECT fact_type, fact_key, fact_value, confidence
       FROM covabot_user_facts
       WHERE user_id = $1 AND fact_type = $2
       ORDER BY confidence DESC`,
      [userId, category],
    );

    const facts = rows.map(row => ({
      type: row.fact_type as UserFact['type'],
      key: row.fact_key,
      value: row.fact_value,
      confidence: row.confidence,
    }));

    logger
      .withMetadata({
        user_id: userId,
        category,
        facts_count: facts.length,
      })
      .debug('User facts by type retrieved');

    return facts;
  }
}
