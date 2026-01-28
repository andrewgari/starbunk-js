import { z } from 'zod';
import { PersonalitySchema, getDefaultPersonalitiesPath } from './personality-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LiveData, ReadonlyLiveData } from '@starbunk/shared';

export interface PersonalityService {
  getPersonalityById(id: string): Personality | undefined;
  getPersonalityByName(name: string): Personality | undefined;
  activatePersonality(personality: Personality): void;
  getActivePersonality(): Personality | null | undefined;
  refreshPersonalities(): void;
  // LiveData-style observable accessors
  getPersonalitiesLive(): ReadonlyLiveData<readonly Personality[]>;
  getActivePersonalityLive(): ReadonlyLiveData<Personality | null>;
  // Convenience synchronous accessors
  getAllPersonalities(): readonly Personality[];
  getPersonalityCount(): number;
}

export class PersonalityManager {
  private personalities: Map<string, Personality> = new Map();
  private activePersonality: Personality | null = null;

  // LiveData streams for observers
  private readonly personalities$ = new LiveData<readonly Personality[]>([]);
  private readonly activePersonality$ = new LiveData<Personality | null>(null);

  // FS watch support
  private watcher?: fs.FSWatcher;
  private watchDebounce?: NodeJS.Timeout;

  constructor(configPath?: string) {
    this.loadPersonalities(configPath);
    this.startWatching();
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

    // Update stream after full scan
    this.publishPersonalities();
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
    this.activePersonality$.setValue(personality);
  }

  public getActivePersonality(): Personality | null | undefined {
    return this.activePersonality;
  }

  public refreshPersonalities(): void {
    // Snapshot current state for safe rollback in case refresh fails
    const prevPersonalities = new Map(this.personalities);
    const prevActiveId = this.activePersonality?.identity.botId ?? null;

    // Prepare a clean state to avoid stale or deleted entries lingering
    this.personalities = new Map();
    this.activePersonality = null;
    this.publishPersonalities();
    this.activePersonality$.setValue(null);

    try {
      this.loadPersonalities();
    } catch (error) {
      console.error('✗ Failed to refresh personalities:', error);
      // Roll back to previous known-good state
      this.personalities = prevPersonalities;
      this.activePersonality = prevActiveId ? prevPersonalities.get(prevActiveId) ?? null : null;
      this.publishPersonalities();
      this.activePersonality$.setValue(this.activePersonality);
      return;
    }

    // Restore previous active personality if it still exists after refresh
    if (prevActiveId) {
      const restored = this.getPersonalityById(prevActiveId);
      if (restored) {
        this.activePersonality = restored;
        this.activePersonality$.setValue(restored);
      } else {
        console.warn(`⚠ Active personality '${prevActiveId}' no longer exists after refresh`);
      }
    }
  }

  // LiveData accessors
  public getPersonalitiesLive(): ReadonlyLiveData<readonly Personality[]> {
    return this.personalities$.asReadonly();
  }

  public getActivePersonalityLive(): ReadonlyLiveData<Personality | null> {
    return this.activePersonality$.asReadonly();
  }

  // Convenience accessors maintained for synchronous reads
  public getAllPersonalities(): readonly Personality[] {
    return this.personalities$.getValue();
  }

  public getPersonalityCount(): number {
    return this.personalities.size;
  }

  private publishPersonalities(): void {
    // Ensure a stable array reference only when content changed
    const next = Array.from(this.personalities.values());
    this.personalities$.setValue(next);
  }

  // ---------------------------------------------------------------------------
  // File-system watching (auto-refresh)
  // ---------------------------------------------------------------------------
  private startWatching(): void {
    const dir = getDefaultPersonalitiesPath();
    try {
      // Close any existing watcher first
      this.stopWatching();
      this.watcher = fs.watch(dir, { persistent: true }, (_event, file) => {
        // Only react to YAML changes; filename can be undefined on some platforms
        if (file && !file.endsWith('.yml') && !file.endsWith('.yaml')) return;
        if (this.watchDebounce) clearTimeout(this.watchDebounce);
        this.watchDebounce = setTimeout(() => {
          try {
            this.refreshPersonalities();
          } catch (err) {
            console.error('✗ Auto-refresh failed:', err);
          }
        }, 500);
      });
      console.log(`👀 Watching personalities directory: ${dir}`);
    } catch (err) {
      console.warn(`⚠ Failed to watch personalities directory '${dir}':`, err);
    }
  }

  private stopWatching(): void {
    if (this.watchDebounce) {
      clearTimeout(this.watchDebounce);
      this.watchDebounce = undefined;
    }
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // ignore
      }
      this.watcher = undefined;
    }
  }

  public dispose(): void {
    this.stopWatching();
  }
}

export type Personality = z.infer<typeof PersonalitySchema>;

export class PersonalityFactory {
  public static createPersonality(config: z.input<typeof PersonalitySchema>): Personality {
    return PersonalitySchema.parse(config);
  }
}
