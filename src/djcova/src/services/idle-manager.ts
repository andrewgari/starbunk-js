// Idle Manager Service for DJCova auto-disconnect functionality
import { disconnectVoiceConnection } from '../utils/voice-utils';
import { logger } from '../observability/logger';

export interface IdleManagerConfig {
  timeoutSeconds: number;
  guildId: string;
  channelId?: string;
  onDisconnect?: (reason: string) => Promise<void>;
}

export class IdleManager {
  private timer: NodeJS.Timeout | null = null;
  private config: IdleManagerConfig;
  private isActive = false;

  constructor(config: IdleManagerConfig) {
    this.config = config;
    logger.debug(
      `IdleManager initialized for guild ${config.guildId} with ${config.timeoutSeconds}s timeout`,
    );
  }

  /**
   * Start the idle timer
   * This should be called when music stops playing
   */
  startIdleTimer(): void {
    if (this.timer) {
      // Reset existing timer
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.isActive = true;
    logger.debug(`Starting idle timer for ${this.config.timeoutSeconds} seconds`);

    this.timer = setTimeout(async () => {
      await this.handleIdleTimeout();
    }, this.config.timeoutSeconds * 1000);
  }

  /**
   * Reset the idle timer
   * This should be called when new music starts playing
   */
  resetIdleTimer(): void {
    if (this.timer) {
      logger.debug('Resetting idle timer');
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isActive = false;
  }

  /**
   * Cancel the idle timer
   * This should be called when manually disconnecting
   */
  cancelIdleTimer(): void {
    if (this.timer) {
      logger.debug('Cancelling idle timer');
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isActive = false;
  }

  /**
   * Check if the idle timer is currently active
   */
  isIdleTimerActive(): boolean {
    return this.isActive && this.timer !== null;
  }

  /**
   * Get the current timeout configuration
   */
  getTimeoutSeconds(): number {
    return this.config.timeoutSeconds;
  }

  /**
   * Update the configuration
   */
  updateConfig(newConfig: Partial<IdleManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug(`IdleManager config updated for guild ${this.config.guildId}`);
  }

  /**
   * Handle idle timeout - disconnect and cleanup
   */
  private async handleIdleTimeout(): Promise<void> {
    try {
      logger.info(
        `Idle timeout reached for guild ${this.config.guildId}, disconnecting from voice channel`,
      );

      // Disconnect from voice channel
      disconnectVoiceConnection(this.config.guildId);

      // Notify about disconnection
      const reason = `Disconnected from voice channel due to ${this.config.timeoutSeconds} seconds of inactivity`;

      if (this.config.onDisconnect) {
        await this.config.onDisconnect(reason);
      }

      // Clean up timer state
      this.timer = null;
      this.isActive = false;

      logger.info(
        `Successfully disconnected from voice channel in guild ${this.config.guildId} due to inactivity`,
      );
    } catch (error) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .error('Error handling idle timeout');

      // Still clean up timer state even if disconnect failed
      this.timer = null;
      this.isActive = false;
    }
  }

  /**
   * Cleanup resources when destroying the idle manager
   */
  destroy(): void {
    this.cancelIdleTimer();
    logger.debug(`IdleManager destroyed for guild ${this.config.guildId}`);
  }
}

/**
 * Factory function to create IdleManager instances
 */
export function createIdleManager(config: IdleManagerConfig): IdleManager {
  return new IdleManager(config);
}
