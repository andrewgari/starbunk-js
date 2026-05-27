import * as fs from 'fs';
import { LiveData, ReadonlyLiveData, getTraceService } from '@starbunk/shared';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { getDefaultPersonalityPath, loadPersonalityFromDirectory } from './personality-parser';
import type { CovaProfile } from '@/models/memory-types';

export interface PersonalityService {
  getPersonality(): CovaProfile | null;
  refreshPersonality(): void;
  getPersonalityLive(): ReadonlyLiveData<CovaProfile | null>;
}

export class PersonalityManager implements PersonalityService {
  private personality: CovaProfile | null = null;
  private readonly dir: string;
  private readonly logger = logLayer.withPrefix('PersonalityManager');
  private readonly tracing = getTraceService('covabot');

  // LiveData streams for observers
  private readonly personality$ = new LiveData<CovaProfile | null>(null);

  // FS watch support
  private watcher?: fs.FSWatcher;
  private watchDebounce?: NodeJS.Timeout;

  constructor(configPath?: string) {
    this.dir = configPath ?? getDefaultPersonalityPath();
    this.loadFromDirectory();
    if (fs.existsSync(this.dir)) {
      this.startWatching();
    } else {
      this.logger.warn(`Personality directory '${this.dir}' does not exist; watcher not started`);
    }
  }

  private loadFromDirectory(): void {
    const span = this.tracing.startSpan('PersonalityManager.loadFromDirectory', {
      'personality.dir': this.dir,
    });
    try {
      const profile = loadPersonalityFromDirectory(this.dir);
      this.personality = profile;
      this.personality$.setValue(this.personality);
      this.tracing.endSpanSuccess(span, {
        'personality.id': profile.id,
      });
    } catch (error) {
      this.tracing.endSpanError(span, error as Error);
      throw error; // Preserve existing behavior by rethrowing
    }
  }

  public getPersonality(): CovaProfile | null {
    return this.personality;
  }

  public refreshPersonality(): void {
    const span = this.tracing.startSpan('PersonalityManager.refreshPersonality', {
      'personality.dir': this.dir,
    });
    try {
      const profile = loadPersonalityFromDirectory(this.dir);
      this.personality = profile;
      this.personality$.setValue(this.personality);

      this.tracing.endSpanSuccess(span, {
        'personality.id': profile.id,
      });
    } catch (error) {
      this.logger.withError(error as Error).error('Failed to refresh personality');
      this.tracing.endSpanError(span, error as Error);
    }
  }

  // LiveData accessors
  public getPersonalityLive(): ReadonlyLiveData<CovaProfile | null> {
    return this.personality$.asReadonly();
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
        // React to YAML files and subdirectory changes (entries without extension).
        // Subdirectory names are reported without an extension when created/removed.
        // filename can be undefined on some platforms — always trigger in that case.
        if (file) {
          const ext = file.includes('.') ? file.slice(file.lastIndexOf('.')) : '';
          if (ext !== '' && ext !== '.yml' && ext !== '.yaml') return;
        }
        if (this.watchDebounce) clearTimeout(this.watchDebounce);
        this.watchDebounce = setTimeout(() => {
          try {
            this.refreshPersonality();
          } catch (err) {
            this.logger.withError(err as Error).error('Auto-refresh failed');
          }
        }, 500);
      });
    } catch (err) {
      this.logger.withError(err as Error).warn(`Failed to watch personality directory '${dir}'`);
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
