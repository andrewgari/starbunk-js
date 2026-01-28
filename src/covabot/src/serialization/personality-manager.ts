import { z } from 'zod';
import { PersonalitySchema, loadPersonalitiesFromDirectory, getDefaultPersonalitiesPath } from './personality-parser';
import type { CovaProfile } from '@/models/memory-types';
import { logLayer } from '@starbunk/shared/observability/log-layer';

const logger = logLayer.withPrefix('PersonalityManager');

export class PersonalityManager {
  private personalities: Map<string, CovaProfile> = new Map();

  constructor(configPath?: string) {
    this.loadPersonalities(configPath);
  }

  private loadPersonalities(configPath?: string) {
    const personalitiesPath = configPath || getDefaultPersonalitiesPath();
    logger.withMetadata({ path: personalitiesPath }).info('Loading personalities from config');
    
    try {
      const profiles = loadPersonalitiesFromDirectory(personalitiesPath);
      this.personalities = new Map(profiles.map(profile => [profile.id, profile]));
      
      logger.withMetadata({ 
        count: this.personalities.size,
        ids: Array.from(this.personalities.keys())
      }).info('Personalities loaded successfully');
    } catch (error) {
      logger.withError(error).error('Failed to load personalities');
      throw error;
    }
  }

  public getPersonalityById(id: string): CovaProfile | undefined {
    return this.personalities.get(id);
  }

  public getPersonalityByName(name: string): CovaProfile | undefined {
    for (const personality of this.personalities.values()) {
      if (personality.displayName === name) {
        return personality;
      }
    }
    return undefined;
  }

  public getAllPersonalities(): CovaProfile[] {
    return Array.from(this.personalities.values());
  }

  public getPersonalityCount(): number {
    return this.personalities.size;
  }
}

export type Personality = z.infer<typeof PersonalitySchema>;
