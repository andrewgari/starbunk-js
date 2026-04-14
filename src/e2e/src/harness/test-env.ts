/**
 * Typed, validated access to E2E environment variables.
 * Fails fast at startup if any required variable is missing.
 */

const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required E2E env var: ${name}`);
  return val;
};

export const env = {
  // CI sender bot (sends test messages, listens for responses)
  SENDER_TOKEN: required('E2E_DISCORD_SENDER_TOKEN'),
  SENDER_BOT_ID: required('E2E_DISCORD_SENDER_BOT_ID'),

  // "Enemy" bot account (used for BlueBot enemy tests)
  ENEMY_TOKEN: required('E2E_DISCORD_ENEMY_TOKEN'),
  ENEMY_BOT_ID: required('E2E_DISCORD_ENEMY_BOT_ID'),

  // Test Discord server
  GUILD_ID: required('E2E_DISCORD_TEST_GUILD_ID'),

  // Per-bot test channels (text)
  CHANNEL_INFRA: required('E2E_CHANNEL_INFRASTRUCTURE'),
  CHANNEL_BUNKBOT: required('E2E_CHANNEL_BUNKBOT'),
  CHANNEL_BLUEBOT: required('E2E_CHANNEL_BLUEBOT'),
  CHANNEL_COVABOT: required('E2E_CHANNEL_COVABOT'),
  CHANNEL_DJCOVA: required('E2E_CHANNEL_DJCOVA'),

  // DJCova voice channel
  VOICE_CHANNEL_DJCOVA: required('E2E_VOICE_CHANNEL_DJCOVA'),

  // Bot user IDs (used to identify which messages are from which bot)
  BUNKBOT_BOT_ID: required('E2E_BUNKBOT_BOT_ID'),
  BLUEBOT_BOT_ID: required('E2E_BLUEBOT_BOT_ID'),
  COVABOT_BOT_ID: required('E2E_COVABOT_BOT_ID'),
  DJCOVA_BOT_ID: required('E2E_DJCOVA_BOT_ID'),

  // Delay between test messages (ms) — avoids Discord rate limits
  MESSAGE_DELAY_MS: parseInt(process.env.E2E_MESSAGE_DELAY_MS ?? '800'),
};

/** Wait between messages to respect Discord rate limits */
export const rateLimit = (ms = env.MESSAGE_DELAY_MS): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
