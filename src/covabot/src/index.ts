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

// Load environment variables from .env file
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
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  // Legacy aliases
  const localLlmApiKey = process.env.LOCAL_LLM_API_KEY;
  const cloudLlmApiKey = process.env.CLOUD_LLM_API_KEY;

  const hasLlmProvider =
    ollamaBaseUrl ||
    anthropicApiKey ||
    geminiApiKey ||
    openaiApiKey ||
    localLlmApiKey ||
    cloudLlmApiKey;

  if (!hasLlmProvider) {
    logger.warn(
      'No LLM provider configured. Set one of: OLLAMA_BASE_URL, ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY',
    );
    process.exit(1);
  }

  // Build configuration
  const botConfig: CovaBotConfig = {
    discordToken,
    personalitiesPath: process.env.COVABOT_PERSONALITIES_PATH,
    databasePath: process.env.COVABOT_DATABASE_PATH,
    // Ollama
    ollamaBaseUrl,
    ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL,
    // Anthropic
    anthropicApiKey,
    anthropicDefaultModel: process.env.ANTHROPIC_DEFAULT_MODEL,
    // Gemini
    geminiApiKey,
    geminiDefaultModel: process.env.GEMINI_DEFAULT_MODEL,
    // OpenAI
    openaiApiKey,
    openaiDefaultModel: process.env.OPENAI_DEFAULT_MODEL,
    // Legacy
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
