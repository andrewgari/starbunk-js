/**
 * CovaBot v2 - Multi-persona Discord Bot
 *
 * Entry point for the CovaBot service.
 * Requires environment variables:
 *   - DISCORD_TOKEN: Discord bot token
 *   - OPENAI_API_KEY: OpenAI API key
 *   - COVABOT_PERSONALITIES_PATH (optional): Path to personality YAML files
 *   - COVABOT_DATABASE_PATH (optional): Path to SQLite database
 */

import { config } from 'dotenv';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { CovaBot, CovaBotConfig } from './cova-bot';

// Load environment variables
config();

const logger = logLayer.withPrefix('CovaBot:Main');

async function main(): Promise<void> {
  logger.info('CovaBot v2 starting...');

  // Validate required environment variables
  const discordToken = process.env.DISCORD_TOKEN;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!discordToken) {
    logger.error('DISCORD_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!openaiApiKey) {
    logger.error('OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Build configuration
  const botConfig: CovaBotConfig = {
    discordToken,
    openaiApiKey,
    personalitiesPath: process.env.COVABOT_PERSONALITIES_PATH,
    databasePath: process.env.COVABOT_DATABASE_PATH,
  };

  // Initialize and start the bot
  const bot = CovaBot.getInstance(botConfig);

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.withMetadata({ signal }).info('Shutdown signal received');
    await bot.stop();
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

