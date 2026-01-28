import * as fs from 'fs';
import { LiveData, ReadonlyLiveData } from '@starbunk/shared';
import { getDefaultPersonalitiesPath, loadPersonalitiesFromDirectory } from './personality-parser';
import type { CovaProfile } from '@/models/memory-types';

export interface PersonalityService {
  getPersonalityById(id: string): CovaProfile | undefined;
  getPersonalityByName(name: string): CovaProfile | undefined;
  activatePersonality(personality: CovaProfile): void;
  getActivePersonality(): CovaProfile | null | undefined;
  refreshPersonalities(): void;
  getPersonalitiesLive(): ReadonlyLiveData<readonly CovaProfile[]>;
  getActivePersonalityLive(): ReadonlyLiveData<CovaProfile | null>;
  getAllPersonalities(): readonly CovaProfile[];
  getPersonalityCount(): number;
}

export class PersonalityManager {
  private personalities: Map<string, CovaProfile> = new Map();
  private activePersonality: CovaProfile | null = null;
  private readonly dir: string;

  // LiveData streams for observers
  private readonly personalities$ = new LiveData<readonly CovaProfile[]>([]);
  private readonly activePersonality$ = new LiveData<CovaProfile | null>(null);

  // FS watch support
  private watcher?: fs.FSWatcher;
  private watchDebounce?: NodeJS.Timeout;

  constructor(configPath?: string) {
    this.dir = configPath ?? getDefaultPersonalitiesPath();
    this.loadFromDirectory();
    this.startWatching();
  }

  private loadFromDirectory(): void {
    this.personalities.clear();
    const profiles = loadPersonalitiesFromDirectory(this.dir);
    for (const profile of profiles) {
      this.personalities.set(profile.id, profile);
    }
    this.publishPersonalities();
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

  public activatePersonality(personality: CovaProfile): void {
    this.activePersonality = personality;
    this.activePersonality$.setValue(personality);
  }

  public getActivePersonality(): CovaProfile | null | undefined {
    return this.activePersonality;
  }

  public refreshPersonalities(): void {
    // Snapshot current state for safe rollback in case refresh fails
    const prevPersonalities = new Map(this.personalities);
    const prevActiveId = this.activePersonality?.id ?? null;

    // Prepare a clean state to avoid stale or deleted entries lingering
    this.personalities = new Map();
    this.activePersonality = null;
    this.publishPersonalities();
    this.activePersonality$.setValue(null);

    try {
      this.loadFromDirectory();
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
  public getPersonalitiesLive(): ReadonlyLiveData<readonly CovaProfile[]> {
    return this.personalities$.asReadonly();
  }

  public getActivePersonalityLive(): ReadonlyLiveData<CovaProfile | null> {
    return this.activePersonality$.asReadonly();
  }

  // Convenience accessors maintained for synchronous reads
  public getAllPersonalities(): readonly CovaProfile[] {
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
    const dir = this.dir;
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
