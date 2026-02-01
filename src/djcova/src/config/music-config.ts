// Music configuration for DJCova
import { logger } from '../observability/logger';

export interface MusicConfig {
  idleTimeoutSeconds: number;
  connectionHealthIntervalMs: number;
  connectionHealthFailureThreshold: number;
}

/**
 * Parse and validate an integer environment variable
 */
function parseEnvInt(
  envVar: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
  varName: string,
  unit: string = '',
): number {
  const value = parseInt(envVar || String(defaultValue), 10);
  if (isNaN(value) || value < min || value > max) {
    logger.warn(`Invalid ${varName} value: ${envVar}, using default ${defaultValue}${unit}`);
    return defaultValue;
  }
  return value;
}

/**
 * Get music configuration from environment variables
 */
export function getMusicConfig(): MusicConfig {
  const idleTimeoutSeconds = parseEnvInt(
    process.env.MUSIC_IDLE_TIMEOUT_SECONDS,
    30,
    5,
    3600,
    'MUSIC_IDLE_TIMEOUT_SECONDS',
    ' seconds',
  );

  const connectionHealthIntervalMs = parseEnvInt(
    process.env.CONNECTION_HEALTH_INTERVAL_MS,
    5000,
    1000,
    60000,
    'CONNECTION_HEALTH_INTERVAL_MS',
    'ms',
  );

  const connectionHealthFailureThreshold = parseEnvInt(
    process.env.CONNECTION_HEALTH_FAILURE_THRESHOLD,
    3,
    1,
    10,
    'CONNECTION_HEALTH_FAILURE_THRESHOLD',
  );

  logger.info(
    `Music idle timeout configured: ${idleTimeoutSeconds} seconds, Health monitor: interval=${connectionHealthIntervalMs}ms, threshold=${connectionHealthFailureThreshold}`,
  );

  return {
    idleTimeoutSeconds,
    connectionHealthIntervalMs,
    connectionHealthFailureThreshold,
  };
}
