import * as fs from 'fs';
import { LiveData, ReadonlyLiveData, getTraceService } from '@starbunk/shared';
import { logLayer } from '@starbunk/shared/observability/log-layer';
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

export class PersonalityManager implements PersonalityService {
  private personalities: Map<string, CovaProfile> = new Map();
  private activePersonality: CovaProfile | null = null;
  private readonly dir: string;
  private readonly logger = logLayer.withPrefix('PersonalityManager');
  private readonly tracing = getTraceService('covabot');

  // LiveData streams for observers
  private readonly personalities$ = new LiveData<readonly CovaProfile[]>([]);
  private readonly activePersonality$ = new LiveData<CovaProfile | null>(null);

  // FS watch support
  private watcher?: fs.FSWatcher;
  private watchDebounce?: NodeJS.Timeout;

  constructor(configPath?: string) {
    this.dir = configPath ?? getDefaultPersonalitiesPath();
    this.loadFromDirectory();
    if (fs.existsSync(this.dir)) {
      this.startWatching();
    } else {
      this.logger.warn(`Personalities directory '${this.dir}' does not exist; watcher not started`);
    }
  }

  private loadFromDirectory(): void {
    const span = this.tracing.startSpan('PersonalityManager.loadFromDirectory', {
      'personality.dir': this.dir,
    });
    try {
      this.personalities.clear();
      const profiles = loadPersonalitiesFromDirectory(this.dir);
      for (const profile of profiles) {
        this.personalities.set(profile.id, profile);
      }
      this.publishPersonalities();
      this.tracing.endSpanSuccess(span, {
        'personalities.count': this.personalities.size,
      });
    } catch (error) {
      this.tracing.endSpanError(span, error as Error);
      throw error; // Preserve existing behavior by rethrowing
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

  public activatePersonality(personality: CovaProfile): void {
    this.activePersonality = personality;
    this.activePersonality$.setValue(personality);
  }

  public getActivePersonality(): CovaProfile | null {
    return this.activePersonality;
  }

  public refreshPersonalities(): void {
    // Atomic refresh: only publish new state after successful load
    const prevActiveId = this.activePersonality?.id ?? null;
    const span = this.tracing.startSpan('PersonalityManager.refreshPersonalities', {
      'personality.dir': this.dir,
      'personality.prev_active_id': prevActiveId ?? 'null',
    });
    try {
      const profiles = loadPersonalitiesFromDirectory(this.dir);
      const nextPersonalities = new Map<string, CovaProfile>();
      for (const profile of profiles) {
        nextPersonalities.set(profile.id, profile);
      }

      // Swap in new state atomically
      this.personalities = nextPersonalities;
      this.publishPersonalities();

      // Restore previous active personality if available
      const restored = prevActiveId ? this.getPersonalityById(prevActiveId) : null;
      if (prevActiveId && !restored) {
        this.logger.warn(`Active personality '${prevActiveId}' no longer exists after refresh`);
      }
      this.activePersonality = restored ?? null;
      this.activePersonality$.setValue(this.activePersonality);

      this.tracing.endSpanSuccess(span, {
        'personalities.count': this.personalities.size,
        'personality.restored_active_id': this.activePersonality?.id ?? 'null',
      });
    } catch (error) {
      // On failure, keep previous state untouched
      this.logger.withError(error as Error).error('Failed to refresh personalities');
      this.tracing.endSpanError(span, error as Error);
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
            this.logger.withError(err as Error).error('Auto-refresh failed');
          }
        }, 500);
      });
    } catch (err) {
      this.logger.withError(err as Error).warn(`Failed to watch personalities directory '${dir}'`);
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
      } catch (err) {
        this.logger.withError(err as Error).warn('Failed to close personality watcher');
      }
      this.watcher = undefined;
    }
  }

  public dispose(): void {
    this.stopWatching();
  }
}
