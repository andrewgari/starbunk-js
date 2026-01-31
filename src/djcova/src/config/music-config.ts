// Music configuration for DJCova
import { logger } from '../observability/logger';

export interface MusicConfig {
  idleTimeoutSeconds: number;
}

/**
 * Get music configuration from environment variables
 */
export function getMusicConfig(): MusicConfig {
  const idleTimeoutSeconds = parseInt(process.env.MUSIC_IDLE_TIMEOUT_SECONDS || '30', 10);

  // Validate timeout value
  if (isNaN(idleTimeoutSeconds) || idleTimeoutSeconds < 5 || idleTimeoutSeconds > 3600) {
    logger.warn(
      `Invalid MUSIC_IDLE_TIMEOUT_SECONDS value: ${process.env.MUSIC_IDLE_TIMEOUT_SECONDS}, using default 30 seconds`,
    );
    return { idleTimeoutSeconds: 30 };
  }

  logger.info(`Music idle timeout configured: ${idleTimeoutSeconds} seconds`);

  return {
    idleTimeoutSeconds,
  };
}
