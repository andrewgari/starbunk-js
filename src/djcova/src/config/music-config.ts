// Music configuration for DJCova
import { logger } from '../observability/logger';

export interface MusicConfig {
  idleTimeoutSeconds: number;
  connectionHealthIntervalMs: number;
  connectionHealthFailureThreshold: number;
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
    return {
      idleTimeoutSeconds: 30,
      connectionHealthIntervalMs: 5000,
      connectionHealthFailureThreshold: 3,
    };
  }

  // Health monitor configuration
  let connectionHealthIntervalMs = parseInt(
    process.env.CONNECTION_HEALTH_INTERVAL_MS || '5000',
    10,
  );

  if (
    isNaN(connectionHealthIntervalMs) ||
    connectionHealthIntervalMs < 1000 ||
    connectionHealthIntervalMs > 60000
  ) {
    logger.warn(
      `Invalid CONNECTION_HEALTH_INTERVAL_MS value: ${process.env.CONNECTION_HEALTH_INTERVAL_MS}, using default 5000ms`,
    );
    connectionHealthIntervalMs = 5000;
  }

  let connectionHealthFailureThreshold = parseInt(
    process.env.CONNECTION_HEALTH_FAILURE_THRESHOLD || '3',
    10,
  );

  if (
    isNaN(connectionHealthFailureThreshold) ||
    connectionHealthFailureThreshold < 1 ||
    connectionHealthFailureThreshold > 10
  ) {
    logger.warn(
      `Invalid CONNECTION_HEALTH_FAILURE_THRESHOLD value: ${process.env.CONNECTION_HEALTH_FAILURE_THRESHOLD}, using default 3`,
    );
    connectionHealthFailureThreshold = 3;
  }

  logger.info(
    `Music idle timeout configured: ${idleTimeoutSeconds} seconds, Health monitor: interval=${connectionHealthIntervalMs}ms, threshold=${connectionHealthFailureThreshold}`,
  );

  return {
    idleTimeoutSeconds,
    connectionHealthIntervalMs,
    connectionHealthFailureThreshold,
  };
}
