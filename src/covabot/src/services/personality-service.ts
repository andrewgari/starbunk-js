/**
 * Personality Service - Trait loading and evolution tracking
 *
 * Manages personality traits that can evolve over time through interactions
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import { CovaProfile } from '@/models/memory-types';
import { PersonalityRepository } from '@/repositories/personality-repository';

const logger = logLayer.withPrefix('PersonalityService');

export interface TraitSnapshot {
  name: string;
  value: number;
  lastChanged: Date | null;
  changeReason: string | null;
}

export class PersonalityService {
  private repository: PersonalityRepository;

  constructor(repository: PersonalityRepository) {
    this.repository = repository;
  }

  /**
   * Initialize traits from profile config
   */
  async initializeFromProfile(profile: CovaProfile): Promise<void> {
    logger
      .withMetadata({
        profile_id: profile.id,
        traits_count: profile.personality.traits.length,
      })
      .info('Initializing personality traits');

    // Store numeric traits (sarcasm, technical bias) as evolvable
    const numericTraits = [
      { name: 'sarcasm_level', value: profile.personality.speechPatterns.sarcasmLevel },
      { name: 'technical_bias', value: profile.personality.speechPatterns.technicalBias },
    ];

    for (const trait of numericTraits) {
      await this.repository.upsertTrait(
        profile.id,
        trait.name,
        trait.value,
        'Initial configuration',
      );
    }

    logger
      .withMetadata({
        profile_id: profile.id,
      })
      .debug('Personality traits initialized');
  }

  /**
   * Get current value of a trait
   */
  async getTraitValue(profileId: string, traitName: string): Promise<number | null> {
    const traits = await this.repository.getTraits(profileId);
    const trait = traits.find(t => t.trait_name === traitName);
    return trait?.trait_value ?? null;
  }

  /**
   * Get all traits for a profile
   */
  async getTraits(profileId: string): Promise<TraitSnapshot[]> {
    const rows = await this.repository.getTraits(profileId);

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
  async updateTrait(
    profileId: string,
    traitName: string,
    newValue: number,
    reason: string,
  ): Promise<void> {
    // Validate newValue is a finite number
    if (!Number.isFinite(newValue)) {
      throw new Error('Invalid trait value: must be a finite number');
    }

    // Clamp value to 0-1 range
    const clampedValue = Math.max(0, Math.min(1, newValue));

    await this.repository.upsertTrait(profileId, traitName, clampedValue, reason);

    logger
      .withMetadata({
        profile_id: profileId,
        trait_name: traitName,
        new_value: clampedValue,
        reason,
      })
      .info('Trait updated');
  }

  /**
   * Gradually adjust a trait value (for organic evolution)
   */
  async nudgeTrait(
    profileId: string,
    traitName: string,
    adjustment: number,
    reason: string,
  ): Promise<void> {
    // Validate adjustment is a finite number
    if (!Number.isFinite(adjustment)) {
      throw new Error('Invalid adjustment value: must be a finite number');
    }

    const currentValue = await this.getTraitValue(profileId, traitName);

    if (currentValue === null) {
      logger
        .withMetadata({
          profile_id: profileId,
          trait_name: traitName,
        })
        .warn('Cannot nudge non-existent trait');
      return;
    }

    const newValue = currentValue + adjustment;
    await this.updateTrait(profileId, traitName, newValue, reason);
  }

  /**
   * Get trait modifiers as a string for LLM context
   */
  async getTraitModifiersForLlm(profileId: string): Promise<string> {
    const traits = await this.getTraits(profileId);

    if (traits.length === 0) {
      return '';
    }

    const descriptions: string[] = [];

    for (const trait of traits) {
      switch (trait.name) {
        case 'sarcasm_level':
          if (trait.value > 0.7) {
            descriptions.push("You've become notably more sarcastic lately.");
          } else if (trait.value < 0.3) {
            descriptions.push("You've been more sincere and direct recently.");
          }
          break;

        case 'technical_bias':
          if (trait.value > 0.7) {
            descriptions.push("You've been leaning into technical discussions more.");
          } else if (trait.value < 0.3) {
            descriptions.push("You've been keeping things more casual lately.");
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
  async analyzeForEvolution(
    profileId: string,
    userMessage: string,
    botResponse: string,
  ): Promise<void> {
    const combinedText = `${userMessage} ${botResponse}`.toLowerCase();

    // Technical content increases technical bias slightly
    const technicalKeywords = [
      'code',
      'function',
      'api',
      'bug',
      'error',
      'debug',
      'typescript',
      'javascript',
      'python',
      'database',
    ];
    const technicalMatches = technicalKeywords.filter(kw => combinedText.includes(kw)).length;

    if (technicalMatches >= 3) {
      await this.nudgeTrait(profileId, 'technical_bias', 0.01, 'Heavy technical conversation');
    }

    // Sarcastic response patterns
    const sarcasticPatterns = ['oh really', 'wow, shocking', 'who knew', 'obviously'];
    const sarcasticMatches = sarcasticPatterns.filter(p => combinedText.includes(p)).length;

    if (sarcasticMatches > 0) {
      await this.nudgeTrait(profileId, 'sarcasm_level', 0.01, 'Sarcastic interaction detected');
    }

    // Genuine/sincere interactions decrease sarcasm
    const sincerePatterns = ['thank you', 'appreciate', 'helpful', 'thanks'];
    const sincereMatches = sincerePatterns.filter(p => combinedText.includes(p)).length;

    if (sincereMatches >= 2) {
      await this.nudgeTrait(profileId, 'sarcasm_level', -0.005, 'Sincere interaction detected');
    }
  }

  /**
   * Reset traits to profile defaults
   */
  async resetTraits(profile: CovaProfile): Promise<void> {
    await this.repository.deleteProfileTraits(profile.id);

    // Reinitialize
    await this.initializeFromProfile(profile);

    logger
      .withMetadata({
        profile_id: profile.id,
      })
      .info('Traits reset to defaults');
  }
}
