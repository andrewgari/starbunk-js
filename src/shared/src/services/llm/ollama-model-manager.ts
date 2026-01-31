/**
 * Ollama Model Manager
 *
 * Handles model lifecycle operations:
 * - Auto-pull missing models on first use or startup
 * - Scheduled model updates (weekly by default)
 * - List available models
 * - Check if a model exists locally
 */

import { logLayer } from '../../observability/log-layer';

const logger = logLayer.withPrefix('OllamaModelManager');

interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaListResponse {
  models: OllamaModelInfo[];
}

interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface ModelManagerConfig {
  apiUrl: string;
  autoPullModels: boolean;
  pullTimeoutMs: number;
  /** Interval for scheduled model updates in ms (default: 7 days) */
  updateIntervalMs?: number;
  /** Enable scheduled model updates (default: true if OLLAMA_SCHEDULED_UPDATES !== 'false') */
  enableScheduledUpdates?: boolean;
}

// Default: 7 days in milliseconds
const DEFAULT_UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export class OllamaModelManager {
  private readonly apiUrl: string;
  private readonly autoPullEnabled: boolean;
  private readonly pullTimeoutMs: number;
  private readonly pullingModels: Set<string> = new Set();
  private readonly updateIntervalMs: number;
  private readonly enableScheduledUpdates: boolean;
  private scheduledModels: string[] = [];
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<ModelManagerConfig>) {
    this.apiUrl = config?.apiUrl || process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
    this.autoPullEnabled =
      config?.autoPullModels ?? process.env.OLLAMA_AUTO_PULL_MODELS !== 'false';
    this.pullTimeoutMs =
      config?.pullTimeoutMs ?? parseInt(process.env.OLLAMA_PULL_TIMEOUT_MS || '1200000', 10);
    this.updateIntervalMs =
      config?.updateIntervalMs ??
      parseInt(process.env.OLLAMA_UPDATE_INTERVAL_MS || String(DEFAULT_UPDATE_INTERVAL_MS), 10);
    this.enableScheduledUpdates =
      config?.enableScheduledUpdates ?? process.env.OLLAMA_SCHEDULED_UPDATES !== 'false';
  }

  /**
   * Check if a model is available locally
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      // Handle both "model" and "model:tag" formats
      const normalizedName = modelName.includes(':') ? modelName : `${modelName}:latest`;
      return models.some(m => m.name === normalizedName || m.name === modelName);
    } catch (error) {
      logger.withError(error).warn('Failed to check model availability');
      return false;
    }
  }

  /**
   * List all locally available models
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    const response = await fetch(`${this.apiUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = (await response.json()) as OllamaListResponse;
    return data.models || [];
  }

  /**
   * Pull a model if it's not available
   */
  async ensureModel(modelName: string): Promise<boolean> {
    // Check if model is already available
    if (await this.isModelAvailable(modelName)) {
      return true;
    }

    // Check if auto-pull is enabled
    if (!this.autoPullEnabled) {
      logger.warn(`Model "${modelName}" not available and auto-pull is disabled`);
      return false;
    }

    // Check if already pulling this model
    if (this.pullingModels.has(modelName)) {
      logger.debug(`Model "${modelName}" is already being pulled`);
      return false;
    }

    // Pull the model
    return this.pullModel(modelName);
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    if (this.pullingModels.has(modelName)) {
      return false;
    }

    this.pullingModels.add(modelName);
    logger.withMetadata({ model: modelName }).info('Starting model pull');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.pullTimeoutMs);

      const response = await fetch(`${this.apiUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Pull request failed: ${response.status}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let lastLogTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const progress = JSON.parse(line) as OllamaPullProgress;

            // Log progress every 10 seconds
            if (Date.now() - lastLogTime > 10000 || progress.status === 'success') {
              const pct =
                progress.total && progress.completed
                  ? Math.round((progress.completed / progress.total) * 100)
                  : null;

              logger
                .withMetadata({
                  model: modelName,
                  status: progress.status,
                  progress: pct ? `${pct}%` : undefined,
                })
                .info('Model pull progress');

              lastLogTime = Date.now();
            }
          } catch {
            // Ignore JSON parse errors for partial lines
          }
        }
      }

      logger.withMetadata({ model: modelName }).info('Model pull completed');
      return true;
    } catch (error) {
      logger.withError(error).withMetadata({ model: modelName }).error('Model pull failed');
      return false;
    } finally {
      this.pullingModels.delete(modelName);
    }
  }

  /**
   * Pull models on startup (non-blocking)
   */
  pullOnStartup(models: string[]): void {
    if (process.env.OLLAMA_PULL_ON_STARTUP === 'false') {
      logger.debug('Startup model pull disabled');
      return;
    }

    // Fire and forget - don't block startup
    Promise.all(models.map(m => this.ensureModel(m)))
      .then(results => {
        const pulled = results.filter(r => r).length;
        logger.withMetadata({ models, pulled }).info('Startup model check complete');
      })
      .catch(error => {
        logger.withError(error).warn('Startup model check failed');
      });
  }

  /**
   * Start scheduled model updates
   * Pulls/updates models on a regular interval (default: weekly)
   */
  startScheduledUpdates(models: string[]): void {
    if (!this.enableScheduledUpdates) {
      logger.debug('Scheduled model updates disabled');
      return;
    }

    if (this.updateTimer) {
      logger.warn('Scheduled updates already running');
      return;
    }

    this.scheduledModels = [...models];
    const intervalDays = Math.round(this.updateIntervalMs / (24 * 60 * 60 * 1000));

    logger
      .withMetadata({
        models: this.scheduledModels,
        interval_days: intervalDays,
        interval_ms: this.updateIntervalMs,
      })
      .info('Starting scheduled model updates');

    // Run update on interval
    this.updateTimer = setInterval(() => {
      this.runScheduledUpdate();
    }, this.updateIntervalMs);

    // Unref so it doesn't keep the process alive
    this.updateTimer.unref();
  }

  /**
   * Stop scheduled model updates
   */
  stopScheduledUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      logger.info('Scheduled model updates stopped');
    }
  }

  /**
   * Run a scheduled update (pull latest versions of all registered models)
   */
  private async runScheduledUpdate(): Promise<void> {
    if (this.scheduledModels.length === 0) {
      return;
    }

    logger.withMetadata({ models: this.scheduledModels }).info('Running scheduled model update');

    const results: { model: string; success: boolean; error?: string }[] = [];

    for (const model of this.scheduledModels) {
      try {
        // Always pull to get latest version (not just ensureModel)
        const success = await this.pullModel(model);
        results.push({ model, success });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ model, success: false, error: errorMessage });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    logger
      .withMetadata({
        total: this.scheduledModels.length,
        succeeded,
        failed: failed.length,
        failed_models: failed.map(f => f.model),
      })
      .info('Scheduled model update complete');
  }

  /**
   * Manually trigger an update of all scheduled models
   */
  async triggerUpdate(): Promise<{ model: string; success: boolean }[]> {
    if (this.scheduledModels.length === 0) {
      logger.warn('No models registered for updates');
      return [];
    }

    await this.runScheduledUpdate();

    // Return status of each model
    return this.scheduledModels.map(model => ({
      model,
      success: !this.pullingModels.has(model),
    }));
  }

  /**
   * Get the list of models being managed
   */
  getScheduledModels(): string[] {
    return [...this.scheduledModels];
  }

  /**
   * Add a model to the scheduled update list
   */
  addScheduledModel(model: string): void {
    if (!this.scheduledModels.includes(model)) {
      this.scheduledModels.push(model);
      logger.withMetadata({ model }).debug('Model added to scheduled updates');
    }
  }

  /**
   * Remove a model from the scheduled update list
   */
  removeScheduledModel(model: string): boolean {
    const index = this.scheduledModels.indexOf(model);
    if (index !== -1) {
      this.scheduledModels.splice(index, 1);
      logger.withMetadata({ model }).debug('Model removed from scheduled updates');
      return true;
    }
    return false;
  }

  /**
   * Check if scheduled updates are running
   */
  isScheduledUpdatesRunning(): boolean {
    return this.updateTimer !== null;
  }

  /**
   * Get update interval in human-readable format
   */
  getUpdateIntervalDescription(): string {
    const days = Math.round(this.updateIntervalMs / (24 * 60 * 60 * 1000));
    if (days === 1) return 'daily';
    if (days === 7) return 'weekly';
    if (days === 30) return 'monthly';
    return `every ${days} days`;
  }
}
