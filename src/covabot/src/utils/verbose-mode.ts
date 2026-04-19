/**
 * Verbose logging mode for CovaBot.
 *
 * Set COVABOT_VERBOSE=true to promote key decision logs from debug → info.
 * This makes CovaBot's sociability reasoning visible without full debug noise.
 *
 * Additionally, set COVABOT_LOG_PROMPTS=true to log the raw LLM responses
 * (very verbose — for deep prompt debugging only).
 */

export const VERBOSE_LOGGING = process.env.COVABOT_VERBOSE === 'true';
export const LOG_PROMPTS = process.env.COVABOT_LOG_PROMPTS === 'true';
