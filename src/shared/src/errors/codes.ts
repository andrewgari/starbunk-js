/**
 * Starbunk shared error codes
 *
 * Application-agnostic codes reusable across all containers (bunkbot, djcova, covabot, bluebot).
 * Container-specific codes must be defined in that container's own errors/ directory.
 */
export const SharedErrorCode = {
  NIL_REFERENCE: 'NIL_REFERENCE',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  CONFIG_MISSING: 'CONFIG_MISSING',
  TIMEOUT: 'TIMEOUT',
  PARSE_FAILED: 'PARSE_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  DISCORD_API_ERROR: 'DISCORD_API_ERROR',
  DISCORD_GATEWAY_ERROR: 'DISCORD_GATEWAY_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type SharedErrorCode = (typeof SharedErrorCode)[keyof typeof SharedErrorCode];
