/**
 * Typed access to E2E environment variables.
 *
 * Does NOT throw at module load time — callers that need a configured
 * environment should check `isConfigured` first (or rely on global-setup
 * to abort the run early with a clean exit when vars are absent).
 */

const optional = (name: string): string => process.env[name] ?? '';

/**
 * True when all required Discord env vars are present.
 * global-setup.ts checks this and exits 0 when false so the suite is
 * skipped rather than failing in environments that don't have the tokens.
 */
export const isConfigured: boolean = !!process.env.E2E_DISCORD_SENDER_TOKEN;

export const env = {
  // CI sender bot (sends test messages, listens for responses)
  SENDER_TOKEN: optional('E2E_DISCORD_SENDER_TOKEN'),
  SENDER_BOT_ID: optional('E2E_DISCORD_SENDER_BOT_ID'),

  // "Enemy" bot account (used for BlueBot enemy tests)
  ENEMY_TOKEN: optional('E2E_DISCORD_ENEMY_TOKEN'),
  ENEMY_BOT_ID: optional('E2E_DISCORD_ENEMY_BOT_ID'),

  // Test Discord server
  GUILD_ID: optional('E2E_DISCORD_TEST_GUILD_ID'),

  // Per-bot test channels (text)
  CHANNEL_INFRA: optional('E2E_CHANNEL_INFRASTRUCTURE'),
  CHANNEL_BUNKBOT: optional('E2E_CHANNEL_BUNKBOT'),
  CHANNEL_BLUEBOT: optional('E2E_CHANNEL_BLUEBOT'),
  CHANNEL_COVABOT: optional('E2E_CHANNEL_COVABOT'),
  CHANNEL_DJCOVA: optional('E2E_CHANNEL_DJCOVA'),

  // DJCova voice channel
  VOICE_CHANNEL_DJCOVA: optional('E2E_VOICE_CHANNEL_DJCOVA'),

  // Bot user IDs (used to identify which messages are from which bot)
  BUNKBOT_BOT_ID: optional('E2E_BUNKBOT_BOT_ID'),
  BLUEBOT_BOT_ID: optional('E2E_BLUEBOT_BOT_ID'),
  COVABOT_BOT_ID: optional('E2E_COVABOT_BOT_ID'),
  DJCOVA_BOT_ID: optional('E2E_DJCOVA_BOT_ID'),

  // Delay between test messages (ms) — avoids Discord rate limits
  MESSAGE_DELAY_MS: parseInt(process.env.E2E_MESSAGE_DELAY_MS ?? '800') || 800,
};

/** Wait between messages to respect Discord rate limits */
export const rateLimit = (ms = env.MESSAGE_DELAY_MS): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
