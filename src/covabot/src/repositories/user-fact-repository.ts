/**
 * UserFactRepository - Data access layer for user facts
 *
 * Provides a clean abstraction over user fact operations,
 * delegating to the database for persistence.
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { UserFactRow, UserFact } from '@/models/memory-types';

const logger = logLayer.withPrefix('UserFactRepository');

export class UserFactRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Store a user fact (INSERT or UPDATE)
   */
  storeUserFact(
    userId: string,
    category: string,
    fact: string,
    confidence: number = 1.0,
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_facts (profile_id, user_id, fact_type, fact_key, fact_value, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, user_id, fact_type, fact_key)
      DO UPDATE SET fact_value = excluded.fact_value, confidence = excluded.confidence, learned_at = CURRENT_TIMESTAMP
    `);

    // Note: profile_id is empty string as placeholder - in real usage, it would be passed
    stmt.run('', userId, category, fact, fact, confidence);

    logger.withMetadata({
      user_id: userId,
      category,
      fact_key: fact,
    }).debug('User fact stored');
  }

  /**
   * Get all facts for a user
   */
  getUserFacts(userId: string): UserFact[] {
    const stmt = this.db.prepare(`
      SELECT fact_type, fact_key, fact_value, confidence
      FROM user_facts
      WHERE user_id = ?
      ORDER BY confidence DESC
    `);

    const rows = stmt.all(userId) as Pick<
      UserFactRow,
      'fact_type' | 'fact_key' | 'fact_value' | 'confidence'
    >[];

    const facts = rows.map(row => ({
      type: row.fact_type as UserFact['type'],
      key: row.fact_key,
      value: row.fact_value,
      confidence: row.confidence,
    }));

    logger.withMetadata({
      user_id: userId,
      facts_count: facts.length,
    }).debug('User facts retrieved');

    return facts;
  }

  /**
   * Get facts of a specific category for a user
   */
  getUserFactsByType(userId: string, category: string): UserFact[] {
    const stmt = this.db.prepare(`
      SELECT fact_type, fact_key, fact_value, confidence
      FROM user_facts
      WHERE user_id = ? AND fact_type = ?
      ORDER BY confidence DESC
    `);

    const rows = stmt.all(userId, category) as Pick<
      UserFactRow,
      'fact_type' | 'fact_key' | 'fact_value' | 'confidence'
    >[];

    const facts = rows.map(row => ({
      type: row.fact_type as UserFact['type'],
      key: row.fact_key,
      value: row.fact_value,
      confidence: row.confidence,
    }));

    logger.withMetadata({
      user_id: userId,
      category,
      facts_count: facts.length,
    }).debug('User facts by type retrieved');

    return facts;
  }
}
