/**
 * Personality Service - Trait loading and evolution tracking
 *
 * Manages personality traits that can evolve over time through interactions
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { PersonalityEvolutionRow, CovaProfile } from '@/models/memory-types';

const logger = logLayer.withPrefix('PersonalityService');

export interface TraitSnapshot {
  name: string;
  value: number;
  lastChanged: Date | null;
  changeReason: string | null;
}

export class PersonalityService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Initialize traits from profile config
   */
  initializeFromProfile(profile: CovaProfile): void {
    logger.withMetadata({
      profile_id: profile.id,
      traits_count: profile.personality.traits.length,
    }).info('Initializing personality traits');

    // Store numeric traits (sarcasm, technical bias) as evolvable
    const numericTraits = [
      { name: 'sarcasm_level', value: profile.personality.speechPatterns.sarcasmLevel },
      { name: 'technical_bias', value: profile.personality.speechPatterns.technicalBias },
    ];

    const stmt = this.db.prepare(`
      INSERT INTO personality_evolution (profile_id, trait_name, trait_value, change_reason)
      VALUES (?, ?, ?, 'Initial configuration')
      ON CONFLICT(profile_id, trait_name)
      DO NOTHING
    `);

    for (const trait of numericTraits) {
      stmt.run(profile.id, trait.name, trait.value);
    }

    logger.withMetadata({
      profile_id: profile.id,
    }).debug('Personality traits initialized');
  }

  /**
   * Get current value of a trait
   */
  getTraitValue(profileId: string, traitName: string): number | null {
    const stmt = this.db.prepare(`
      SELECT trait_value
      FROM personality_evolution
      WHERE profile_id = ? AND trait_name = ?
    `);

    const row = stmt.get(profileId, traitName) as { trait_value: number } | undefined;
    return row?.trait_value ?? null;
  }

  /**
   * Get all traits for a profile
   */
  getTraits(profileId: string): TraitSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT trait_name, trait_value, change_reason, changed_at
      FROM personality_evolution
      WHERE profile_id = ?
      ORDER BY trait_name
    `);

    const rows = stmt.all(profileId) as PersonalityEvolutionRow[];

    return rows.map(row => ({
      name: row.trait_name,
      value: row.trait_value,
      lastChanged: row.changed_at ? new Date(row.changed_at) : null,
      changeReason: row.change_reason,
    }));
  }

  /**
   * Update a trait value with a reason
   */
  updateTrait(
    profileId: string,
    traitName: string,
    newValue: number,
    reason: string,
  ): void {
    // Validate newValue is a finite number
    if (!Number.isFinite(newValue)) {
      throw new Error('Invalid trait value: must be a finite number');
    }

    // Clamp value to 0-1 range
    const clampedValue = Math.max(0, Math.min(1, newValue));

    const stmt = this.db.prepare(`
      INSERT INTO personality_evolution (profile_id, trait_name, trait_value, change_reason)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(profile_id, trait_name)
      DO UPDATE SET trait_value = excluded.trait_value,
                    change_reason = excluded.change_reason,
                    changed_at = CURRENT_TIMESTAMP
    `);

    stmt.run(profileId, traitName, clampedValue, reason);

    logger.withMetadata({
      profile_id: profileId,
      trait_name: traitName,
      new_value: clampedValue,
      reason,
    }).info('Trait updated');
  }

  /**
   * Gradually adjust a trait value (for organic evolution)
   */
  nudgeTrait(
    profileId: string,
    traitName: string,
    adjustment: number,
    reason: string,
  ): void {
    // Validate adjustment is a finite number
    if (!Number.isFinite(adjustment)) {
      throw new Error('Invalid adjustment value: must be a finite number');
    }

    const currentValue = this.getTraitValue(profileId, traitName);

    if (currentValue === null) {
      logger.withMetadata({
        profile_id: profileId,
        trait_name: traitName,
      }).warn('Cannot nudge non-existent trait');
      return;
    }

    const newValue = currentValue + adjustment;
    this.updateTrait(profileId, traitName, newValue, reason);
  }

  /**
   * Get trait modifiers as a string for LLM context
   */
  getTraitModifiersForLlm(profileId: string): string {
    const traits = this.getTraits(profileId);

    if (traits.length === 0) {
      return '';
    }

    const descriptions: string[] = [];

    for (const trait of traits) {
      switch (trait.name) {
        case 'sarcasm_level':
          if (trait.value > 0.7) {
            descriptions.push('You\'ve become notably more sarcastic lately.');
          } else if (trait.value < 0.3) {
            descriptions.push('You\'ve been more sincere and direct recently.');
          }
          break;

        case 'technical_bias':
          if (trait.value > 0.7) {
            descriptions.push('You\'ve been leaning into technical discussions more.');
          } else if (trait.value < 0.3) {
            descriptions.push('You\'ve been keeping things more casual lately.');
          }
          break;
      }
    }

    return descriptions.join(' ');
  }

  /**
   * Analyze conversation for potential trait evolution
   *
   * This is a simple heuristic - could be expanded with ML/NLP
   */
  analyzeForEvolution(
    profileId: string,
    userMessage: string,
    botResponse: string,
  ): void {
    const combinedText = `${userMessage} ${botResponse}`.toLowerCase();

    // Technical content increases technical bias slightly
    const technicalKeywords = [
      'code', 'function', 'api', 'bug', 'error', 'debug',
      'typescript', 'javascript', 'python', 'database',
    ];
    const technicalMatches = technicalKeywords.filter(kw =>
      combinedText.includes(kw)
    ).length;

    if (technicalMatches >= 3) {
      this.nudgeTrait(profileId, 'technical_bias', 0.01, 'Heavy technical conversation');
    }

    // Sarcastic response patterns
    const sarcasticPatterns = ['oh really', 'wow, shocking', 'who knew', 'obviously'];
    const sarcasticMatches = sarcasticPatterns.filter(p =>
      combinedText.includes(p)
    ).length;

    if (sarcasticMatches > 0) {
      this.nudgeTrait(profileId, 'sarcasm_level', 0.01, 'Sarcastic interaction detected');
    }

    // Genuine/sincere interactions decrease sarcasm
    const sincerePatterns = ['thank you', 'appreciate', 'helpful', 'thanks'];
    const sincereMatches = sincerePatterns.filter(p =>
      combinedText.includes(p)
    ).length;

    if (sincereMatches >= 2) {
      this.nudgeTrait(profileId, 'sarcasm_level', -0.005, 'Sincere interaction detected');
    }
  }

  /**
   * Reset traits to profile defaults
   */
  resetTraits(profile: CovaProfile): void {
    const stmt = this.db.prepare(`
      DELETE FROM personality_evolution WHERE profile_id = ?
    `);

    stmt.run(profile.id);

    // Reinitialize
    this.initializeFromProfile(profile);

    logger.withMetadata({
      profile_id: profile.id,
    }).info('Traits reset to defaults');
  }
}
