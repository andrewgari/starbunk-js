/**
 * PersonalityRepository - Data access layer for personality evolution tracking
 */

import { PostgresBaseRepository } from '@starbunk/shared';
import { PostgresService } from '@starbunk/shared/database';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { PersonalityEvolutionRow } from '@/models/memory-types';

const logger = logLayer.withPrefix('PersonalityRepository');

export class PersonalityRepository extends PostgresBaseRepository<PersonalityEvolutionRow> {
  constructor(pgService: PostgresService) {
    super(pgService);
  }

  /**
   * Get current personality traits for a profile
   */
  async getTraits(profileId: string): Promise<PersonalityEvolutionRow[]> {
    return await this.query<PersonalityEvolutionRow>(
      `SELECT profile_id, trait_name, trait_value, changed_at, change_reason
       FROM covabot_personality_evolution
       WHERE profile_id = $1
       ORDER BY trait_name`,
      [profileId],
    );
  }

  /**
   * Upsert a personality trait
   */
  async upsertTrait(
    profileId: string,
    traitName: string,
    traitValue: number,
    changeReason: string | null = null,
  ): Promise<void> {
    await this.execute(
      `INSERT INTO covabot_personality_evolution (profile_id, trait_name, trait_value, change_reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(profile_id, trait_name)
       DO UPDATE SET trait_value = excluded.trait_value, change_reason = excluded.change_reason, changed_at = CURRENT_TIMESTAMP`,
      [profileId, traitName, traitValue, changeReason],
    );

    logger
      .withMetadata({
        profile_id: profileId,
        trait_name: traitName,
        trait_value: traitValue,
      })
      .debug('Personality trait upserted');
  }

  /**
   * Get trait history for a profile
   */
  async getTraitHistory(profileId: string, traitName: string): Promise<PersonalityEvolutionRow[]> {
    return await this.query<PersonalityEvolutionRow>(
      `SELECT profile_id, trait_name, trait_value, changed_at, change_reason
       FROM covabot_personality_evolution
       WHERE profile_id = $1 AND trait_name = $2
       ORDER BY changed_at DESC`,
      [profileId, traitName],
    );
  }

  /**
   * Delete all traits for a profile
   */
  async deleteProfileTraits(profileId: string): Promise<void> {
    await this.execute(
      `DELETE FROM covabot_personality_evolution
       WHERE profile_id = $1`,
      [profileId],
    );

    logger
      .withMetadata({
        profile_id: profileId,
      })
      .info('Profile personality traits deleted');
  }

  /**
   * Get recent trait changes across all profiles
   */
  async getRecentChanges(limit: number = 20): Promise<PersonalityEvolutionRow[]> {
    return await this.query<PersonalityEvolutionRow>(
      `SELECT profile_id, trait_name, trait_value, changed_at, change_reason
       FROM covabot_personality_evolution
       WHERE changed_at IS NOT NULL
       ORDER BY changed_at DESC
       LIMIT $1`,
      [limit],
    );
  }
}
