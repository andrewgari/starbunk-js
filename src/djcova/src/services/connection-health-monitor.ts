import { VoiceConnectionStatus } from '@discordjs/voice';
import { logger } from '../observability/logger';

/**
 * Interface for voice connection - uses Discord.js connection type
 */
export interface VoiceConnectionLike {
  state: { status: (typeof VoiceConnectionStatus)[keyof typeof VoiceConnectionStatus] };
  rejoin?: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
}

/**
 * Configuration for ConnectionHealthMonitor
 */
export interface ConnectionHealthMonitorConfig {
  connection: VoiceConnectionLike;
  guildId: string;
  intervalMs?: number;
  failureThreshold?: number;
  onThresholdExceeded?: (message: string) => Promise<void>;
}

/**
 * Monitors the health of a Discord voice connection
 * - Checks connection status periodically (default 5s)
 * - Detects when connection leaves Ready status
 * - Auto-reconnects on failure
 * - Notifies user after consecutive failures (default 3)
 * - Prevents notification spam with single-notification-per-incident flag
 */
export class ConnectionHealthMonitor {
  // State
  private checkTimer: NodeJS.Timeout | null = null;
  private failureCount: number = 0;
  private notificationSent: boolean = false;
  private isDestroyed: boolean = false;

  // Config (captured at construction)
  private connection: VoiceConnectionLike;
  private guildId: string;
  private intervalMs: number;
  private failureThreshold: number;
  private onThresholdExceeded?: (message: string) => Promise<void>;

  constructor(config: ConnectionHealthMonitorConfig) {
    this.connection = config.connection;
    this.guildId = config.guildId;
    this.intervalMs = config.intervalMs ?? 5000;
    this.failureThreshold = config.failureThreshold ?? 3;
    this.onThresholdExceeded = config.onThresholdExceeded;

    logger.debug(`ConnectionHealthMonitor initialized for guild: ${this.guildId}`, {
      intervalMs: this.intervalMs,
      failureThreshold: this.failureThreshold,
      hasCallback: !!this.onThresholdExceeded,
    } as any);
  }

  /**
   * Start the health check interval
   * Sets up periodic health checks every intervalMs
   */
  public start(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    logger.debug(`Health monitor started for guild: ${this.guildId}`);

    this.checkTimer = setInterval(async () => {
      await this.runHealthCheck();
    }, this.intervalMs);
  }

  /**
   * Stop the health check and clean up resources
   * Safe to call multiple times; idempotent
   */
  public destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.isDestroyed = true;
    logger.debug(`Health monitor destroyed for guild: ${this.guildId}`);
  }

  /**
   * Run a single health check
   * - Checks connection status
   * - Detects failures and increments counter
   * - Triggers reconnect on first failure
   * - Checks notification threshold
   * - Resets on recovery
   */
  private async runHealthCheck(): Promise<void> {
    if (this.isDestroyed) {
      return;
    }

    try {
      const status = this.connection?.state?.status;

      logger.debug(`Health check running for guild: ${this.guildId}`, {
        currentStatus: status,
        failureCount: this.failureCount,
      } as any);

      // Treat Ready, Connecting, and Signalling as healthy states
      if (
        status === VoiceConnectionStatus.Ready ||
        status === VoiceConnectionStatus.Connecting ||
        status === VoiceConnectionStatus.Signalling
      ) {
        this.resetFailures();
      } else {
        this.failureCount++;

        if (this.failureCount === 1) {
          await this.triggerReconnect();
        }

        await this.notifyOnThreshold();
      }
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .debug(`Health check error for guild: ${this.guildId}`);
    }
  }

  /**
   * Reset failure counter and notification flag
   * Called when connection returns to Ready state
   */
  private resetFailures(): void {
    const previousFailureCount = this.failureCount;
    this.failureCount = 0;
    this.notificationSent = false;

    logger.debug(`Connection health recovered for guild: ${this.guildId}`, {
      previousFailureCount,
    } as any);
  }

  /**
   * Trigger auto-reconnect on first failure
   * Uses Discord.js connection.rejoin() method
   */
  private async triggerReconnect(): Promise<void> {
    try {
      logger.debug(`Auto-reconnecting due to health check for guild: ${this.guildId}`);

      if (this.connection?.rejoin && typeof this.connection.rejoin === 'function') {
        this.connection.rejoin();
      } else {
        logger.debug(`rejoin() method not available on connection for guild: ${this.guildId}`);
      }
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .debug(`Reconnect attempt failed for guild: ${this.guildId}`);
    }
  }

  /**
   * Check if failure threshold is exceeded and notify user
   * Only sends notification once per failure incident (prevents spam)
   */
  private async notifyOnThreshold(): Promise<void> {
    try {
      if (this.failureCount >= this.failureThreshold && !this.notificationSent) {
        this.notificationSent = true;

        logger.debug(`Connection health threshold exceeded for guild: ${this.guildId}`, {
          failureCount: this.failureCount,
          threshold: this.failureThreshold,
        } as any);

        if (this.onThresholdExceeded) {
          const message =
            '⚠️ Voice connection health degraded - attempted recovery. Please re-join if issues persist.';
          await this.onThresholdExceeded(message);
        }
      }
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .debug(`Notification send failed for guild: ${this.guildId}`);
    }
  }
}

/**
 * Factory function to create a new ConnectionHealthMonitor
 */
export function createConnectionHealthMonitor(
  config: ConnectionHealthMonitorConfig,
): ConnectionHealthMonitor {
  return new ConnectionHealthMonitor(config);
}
