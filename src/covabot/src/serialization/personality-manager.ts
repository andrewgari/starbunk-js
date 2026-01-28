import { z } from 'zod';
import { PersonalitySchema } from './personality-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

export class PersonalityManager {
  private personalities: Map<string, Personality> = new Map();
  private activePersonality: Personality | null = null;

  constructor(configPath?: string) {
    this.loadPersonalities(configPath);
  }

  private loadPersonalities(_?: string) {
    const configPath = path.join(process.cwd(), 'config');

    // Scan for bot directories
    const botDirs = fs.readdirSync(configPath).filter(file => {
      const fullPath = path.join(configPath, file);
      return fs.statSync(fullPath).isDirectory();
    });

    // Load personality files from each bot directory
    for (const botDir of botDirs) {
      const personalityPath = path.join(configPath, botDir, 'personality.yml');

      if (fs.existsSync(personalityPath)) {
        try {
          const fileContent = fs.readFileSync(personalityPath, 'utf-8');
          const configData = yaml.parse(fileContent);

          // Validate and create personality using PersonalityFactory
          const personality = PersonalityFactory.createPersonality(configData);

          // Store by botId for quick lookup
          this.personalities.set(personality.identity.botId, personality);

          console.log(`✓ Loaded personality: ${personality.identity.displayName}`);
        } catch (error) {
          console.error(`✗ Failed to load personality from ${personalityPath}:`, error);
        }
      }
    }

    if (this.personalities.size === 0) {
      console.warn('⚠ No personalities loaded from config');
    }
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

  public activatePersonality(personality: Personality): void {
    this.activePersonality = personality;
  }

  public getActivePersonality(): Personality | null | undefined {
    return this.activePersonality;
  }
}

export type Personality = z.infer<typeof PersonalitySchema>;

export class PersonalityFactory {
  public static createPersonality(config: z.input<typeof PersonalitySchema>): Personality {
    return PersonalitySchema.parse(config);
  }
}
