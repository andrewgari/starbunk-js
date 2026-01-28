import z from 'zod';
import { PersonalitySchema } from './personality-parser';

export class PersonalityManager {
  private personalities: Map<string, Personality> = new Map();

  constructor() {
    this.loadPersonalities();
  }

  private loadPersonalities() {
    // TODO: Load personalities from config
  }

  public getPersonalityById(id: string): Personality | undefined {
    return this.personalities.get(id);
  }

  public getPersonalityByName(name: string): Personality | undefined {
    for (const personality of this.personalities.values()) {
      if (personality.identity.displayName === name) {
        return personality;
      }
    }
    return undefined;
  }
}

export type Personality = z.infer<typeof PersonalitySchema>;
