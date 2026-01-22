/**
 * CovaBot v2 - Multi-persona Discord Bot
 *
 * Entry point for the CovaBot service.
 * Requires environment variables:
 *   - DISCORD_TOKEN: Discord bot token
 *   - At least one LLM provider configured:
 *     - OLLAMA_API_URL (primary, recommended)
 *     - GEMINI_API_KEY (fallback)
 *     - OPENAI_API_KEY (fallback)
 *   - COVABOT_PERSONALITIES_PATH (optional): Path to personality YAML files
 *   - COVABOT_DATABASE_PATH (optional): Path to SQLite database
 */

import { config } from 'dotenv';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { CovaBot, CovaBotConfig } from './cova-bot';

// Load environment variables
config();

const logger = logLayer.withPrefix('CovaBot:Main');

async function main(): Promise<void> {
  logger.info('CovaBot v2 starting...');

  // Check for CI smoke mode
  if (process.env.CI_SMOKE_MODE === 'true') {
    logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
    runSmokeMode();
    return;
  }

  // Validate required environment variables
  const discordToken = process.env.DISCORD_TOKEN;

  if (!discordToken) {
    logger.error('DISCORD_TOKEN environment variable is required');
    process.exit(1);
  }

  // Check if at least one LLM provider is configured
  const ollamaApiUrl = process.env.OLLAMA_API_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!ollamaApiUrl && !geminiApiKey && !openaiApiKey) {
    logger.warn('No LLM provider configured. At least one of OLLAMA_API_URL, GEMINI_API_KEY, or OPENAI_API_KEY is recommended.');
  }

  // Build configuration
  const botConfig: CovaBotConfig = {
    discordToken,
    personalitiesPath: process.env.COVABOT_PERSONALITIES_PATH,
    databasePath: process.env.COVABOT_DATABASE_PATH,
    // LLM providers (priority: Ollama > Gemini > OpenAI)
    ollamaApiUrl,
    ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL,
    geminiApiKey,
    geminiDefaultModel: process.env.GEMINI_DEFAULT_MODEL,
    openaiApiKey,
    openaiDefaultModel: process.env.OPENAI_DEFAULT_MODEL,
  };

  // Initialize and start the bot
  const bot = CovaBot.getInstance(botConfig);

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.withMetadata({ signal }).info('Shutdown signal received');
    await bot.stop();
    await shutdownObservability(process.env.SERVICE_NAME || 'covabot');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await bot.start();
    logger.info('CovaBot v2 is now running');
  } catch (error) {
    logger.withError(error).error('Failed to start CovaBot');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error in CovaBot main:', error);
  process.exit(1);
});

