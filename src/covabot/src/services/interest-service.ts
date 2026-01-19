/**
 * Interest Service - Keyword-based saliency matching
 *
 * Replaces Qdrant vector embeddings with simpler keyword matching
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { CovaProfile, InterestMatch, KeywordInterestRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('InterestService');

export class InterestService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Initialize keyword interests from a profile's configuration
   */
  async initializeFromProfile(profile: CovaProfile): Promise<void> {
    logger.withMetadata({
      profile_id: profile.id,
      interests_count: profile.personality.interests.length,
    }).info('Initializing interests from profile');

    // Clear existing interests for this profile
    const deleteStmt = this.db.prepare('DELETE FROM keyword_interests WHERE profile_id = ?');
    deleteStmt.run(profile.id);

    // Insert new interests
    const insertStmt = this.db.prepare(`
      INSERT INTO keyword_interests (profile_id, keyword, category, weight)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((interests: string[]) => {
      for (const interest of interests) {
        // Parse interest string - may include category prefix like "tech:typescript"
        const [category, keyword] = interest.includes(':')
          ? interest.split(':', 2)
          : [null, interest];

        insertStmt.run(profile.id, keyword.toLowerCase().trim(), category, 1.0);
      }
    });

    insertMany(profile.personality.interests);

    logger.withMetadata({
      profile_id: profile.id,
      keywords_inserted: profile.personality.interests.length,
    }).info('Interests initialized');
  }

  /**
   * Add a new keyword interest
   */
  addInterest(
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

    logger.withMetadata({
      profile_id: profileId,
      keyword,
      weight,
    }).debug('Interest added');
  }

  /**
   * Remove a keyword interest
   */
  removeInterest(profileId: string, keyword: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM keyword_interests
      WHERE profile_id = ? AND keyword = ?
    `);

    const result = stmt.run(profileId, keyword.toLowerCase().trim());
    return result.changes > 0;
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
   * Calculate interest score for a message
   *
   * Uses keyword matching with word boundaries and stemming-lite
   */
  calculateInterestScore(profileId: string, messageContent: string): {
    score: number;
    matches: InterestMatch[];
  } {
    const interests = this.getInterests(profileId);

    if (interests.length === 0) {
      return { score: 0, matches: [] };
    }

    const normalizedMessage = messageContent.toLowerCase();
    const matches: InterestMatch[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const interest of interests) {
      totalWeight += interest.weight;

      // Check for word boundary match
      const pattern = new RegExp(`\\b${this.escapeRegex(interest.keyword)}\\b`, 'i');
      if (pattern.test(normalizedMessage)) {
        matches.push({
          keyword: interest.keyword,
          category: interest.category,
          weight: interest.weight,
          score: interest.weight,
        });
        matchedWeight += interest.weight;
      }
    }

    // Normalize score to 0-1 range
    // Use a softer normalization that doesn't require all keywords to match
    const score = matches.length > 0
      ? Math.min(1, matchedWeight / Math.min(totalWeight, 3)) // Cap at 3 keywords worth
      : 0;

    logger.withMetadata({
      profile_id: profileId,
      message_preview: messageContent.substring(0, 50),
      matches_count: matches.length,
      score: score.toFixed(3),
    }).debug('Interest score calculated');

    return { score, matches };
  }

  /**
   * Check if a message matches any interest keywords above threshold
   */
  isInterested(
    profileId: string,
    messageContent: string,
    threshold: number = 0.3,
  ): {
    interested: boolean;
    score: number;
    topMatch: InterestMatch | null;
  } {
    const { score, matches } = this.calculateInterestScore(profileId, messageContent);

    return {
      interested: score >= threshold,
      score,
      topMatch: matches.length > 0 ? matches[0] : null,
    };
  }

  /**
   * Update interest weight based on engagement
   */
  adjustInterestWeight(
    profileId: string,
    keyword: string,
    adjustment: number,
  ): void {
    const stmt = this.db.prepare(`
      UPDATE keyword_interests
      SET weight = MAX(0.1, MIN(2.0, weight + ?))
      WHERE profile_id = ? AND keyword = ?
    `);

    stmt.run(adjustment, profileId, keyword.toLowerCase().trim());

    logger.withMetadata({
      profile_id: profileId,
      keyword,
      adjustment,
    }).debug('Interest weight adjusted');
  }

  /**
   * Escape special regex characters in keyword
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
