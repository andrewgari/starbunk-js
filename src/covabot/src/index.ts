/**
 * CovaBot v2 - Multi-persona Discord Bot
 *
 * Entry point for the CovaBot service.
 * Requires environment variables:
 *   - DISCORD_TOKEN: Discord bot token
 *   - At least one LLM provider configured:
 *     - LOCAL_LLM_API_KEY (primary, recommended)
 *     - CLOUD_LLM_API_KEY (fallback)
 *   - COVABOT_PERSONALITIES_PATH (optional): Path to personality YAML files
 *   - COVABOT_DATABASE_PATH (optional): Path to SQLite database
 */

import { config } from 'dotenv';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import { setApplicationHealth } from '@starbunk/shared/observability/health-server';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { CovaBot, CovaBotConfig } from './cova-bot';

// Load environment variables
// Force rebuild: health server fix (PR #629)
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
  const localLlmApiKey = process.env.LOCAL_LLM_API_KEY;
  const cloudLlmApiKey = process.env.CLOUD_LLM_API_KEY;

  if (!localLlmApiKey && !cloudLlmApiKey) {
    logger.warn(
      'No LLM provider configured. At least one of LOCAL_LLM_API_KEY or CLOUD_LLM_API_KEY is recommended.',
    );
  }

  // Build configuration
  const botConfig: CovaBotConfig = {
    discordToken,
    personalitiesPath: process.env.COVABOT_PERSONALITIES_PATH,
    databasePath: process.env.COVABOT_DATABASE_PATH,
    // LLM providers (priority: LocalLLM > CloudLLM)
    localLlmApiKey,
    localLlmDefaultModel: process.env.LOCAL_LLM_DEFAULT_MODEL,
    cloudLlmApiKey,
    cloudLlmDefaultModel: process.env.CLOUD_LLM_DEFAULT_MODEL,
  };

  // Initialize and start the bot
  const bot = CovaBot.getInstance(botConfig);

  // Start health/metrics server
  let healthServer: Awaited<ReturnType<typeof initializeHealthServer>> | null = null;
  try {
    logger.info('Starting health/metrics server...');
    healthServer = await initializeHealthServer();
    logger.info('Health/metrics server started');
  } catch (error) {
    logger.withError(error).error('Failed to initialize health server');
    throw error;
  }

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.withMetadata({ signal }).info('Shutdown signal received');
    await bot.stop();
    if (healthServer) {
      await healthServer.stop();
    }
    await shutdownObservability(process.env.SERVICE_NAME || 'covabot');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', reason => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.withMetadata({ reason: message }).error('Unhandled promise rejection');
    setApplicationHealth('unhealthy', `Unhandled rejection: ${message}`);
  });

  process.on('uncaughtException', error => {
    logger.withError(error).error('Uncaught exception');
    setApplicationHealth('unhealthy', `Uncaught exception: ${error.message}`);
    process.exit(1);
  });

  try {
    await bot.start();
    setApplicationHealth('healthy');
    logger.info('CovaBot v2 is now running');
  } catch (error) {
    logger.withError(error).error('Failed to start CovaBot');
    setApplicationHealth('unhealthy', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error in CovaBot main:', error);
  process.exit(1);
});
