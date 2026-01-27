/**
 * Interest Service - Keyword-based saliency matching
 *
 * Replaces Qdrant vector embeddings with simpler keyword matching
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import { CovaProfile, InterestMatch, KeywordInterestRow } from '@/models/memory-types';
import { InterestRepository } from '@/repositories/interest-repository';

const logger = logLayer.withPrefix('InterestService');

export class InterestService {
  private interestRepo: InterestRepository;

  constructor(interestRepo: InterestRepository) {
    this.interestRepo = interestRepo;
  }

  /**
   * Initialize keyword interests from a profile's configuration
   */
  async initializeFromProfile(profile: CovaProfile): Promise<void> {
    logger.withMetadata({
      profile_id: profile.id,
      interests_count: profile.personality.interests.length,
    }).info('Initializing interests from profile');

    await this.interestRepo.initializeFromInterests(profile.id, profile.personality.interests);
  }

  /**
   * Add a new keyword interest
   */
  async addInterest(
    profileId: string,
    keyword: string,
    category: string | null = null,
    weight: number = 1.0,
  ): Promise<void> {
    await this.interestRepo.upsertInterest(profileId, keyword, category, weight);

    logger.withMetadata({
      profile_id: profileId,
      keyword,
      weight,
    }).debug('Interest added');
  }

  /**
   * Remove a keyword interest
   */
  async removeInterest(profileId: string, keyword: string): Promise<boolean> {
    return await this.interestRepo.deleteInterest(profileId, keyword);
  }

  /**
   * Get all interests for a profile
   */
  async getInterests(profileId: string): Promise<KeywordInterestRow[]> {
    return await this.interestRepo.getInterests(profileId);
  }

  /**
   * Calculate interest score for a message
   *
   * Uses keyword matching with word boundaries and stemming-lite
   */
  async calculateInterestScore(profileId: string, messageContent: string): Promise<{
    score: number;
    matches: InterestMatch[];
  }> {
    const interests = await this.getInterests(profileId);

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
  async isInterested(
    profileId: string,
    messageContent: string,
    threshold: number = 0.3,
  ): Promise<{
    interested: boolean;
    score: number;
    topMatch: InterestMatch | null;
  }> {
    const { score, matches } = await this.calculateInterestScore(profileId, messageContent);

    return {
      interested: score >= threshold,
      score,
      topMatch: matches.length > 0 ? matches[0] : null,
    };
  }

  /**
   * Update interest weight based on engagement
   */
  async adjustInterestWeight(
    profileId: string,
    keyword: string,
    adjustment: number,
  ): Promise<void> {
    await this.interestRepo.adjustWeight(profileId, keyword, adjustment);

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
