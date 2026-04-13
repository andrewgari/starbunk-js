import { ensureError } from './ensure-error';

/**
 * Minimal logger interface required by logError.
 * Satisfied by any LogLayer instance (including test mocks).
 */
interface StructuredLogger {
  withError(error: Error): this;
  withMetadata(metadata: Record<string, unknown>): this;
  error(message: string): void;
}

/**
 * Options passed to logError.
 * - `cause` — the underlying Error (or unknown thrown value). Attached via .withError().
 * - any other key — forwarded as structured log metadata alongside error_code.
 */
export interface LogErrorOptions {
  cause?: unknown;
  [key: string]: unknown;
}

/**
 * Log a structured error with a mandatory error code.
 *
 * This is the ONLY way errors should be logged in Starbunk. The `code`
 * parameter is positional and required so it cannot be accidentally omitted.
 * All error logs will carry a machine-readable `error_code` field that Loki
 * and Grafana can filter and alert on.
 *
 * @example
 * // With an underlying error:
 * logError(logger, DJCovaErrorCode.DJCOVA_YTDLP_SPAWN_FAILED, 'yt-dlp failed to start', {
 *   cause: error,
 *   url,
 * });
 *
 * @example
 * // Without an underlying error (structural / logic failure):
 * logError(logger, DJCovaErrorCode.DJCOVA_VOICE_JOIN_FAILED, 'Player subscription returned undefined', {
 *   guild_id: guildId,
 * });
 */
export function logError(
  logger: StructuredLogger,
  code: string,
  message: string,
  options?: LogErrorOptions,
): void {
  const { cause, ...context } = options ?? {};
  const metadata: Record<string, unknown> = { error_code: code, ...context };

  if (cause !== undefined) {
    logger.withError(ensureError(cause)).withMetadata(metadata).error(message);
  } else {
    logger.withMetadata(metadata).error(message);
  }
}
