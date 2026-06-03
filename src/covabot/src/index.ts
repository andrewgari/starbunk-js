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
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { CovaBot, CovaBotConfig } from './cova-bot';
import { registerDependencyHealthChecks } from '@starbunk/shared/health/dependency-health';
import { registerConfigHealthCheck } from '@starbunk/shared/health/config-health';

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

  // Read singular LLM provider config
  let llmProvider = process.env.LLM_PROVIDER;
  let llmUrl = process.env.LLM_URL;
  let llmApiKey = process.env.LLM_API_KEY;
  let llmDefaultModel = process.env.LLM_DEFAULT_MODEL;

  // Fallback logic for backward compatibility if LLM_PROVIDER is not set
  if (!llmProvider) {
    if (process.env.GEMINI_API_KEY) {
      llmProvider = 'gemini';
      llmApiKey = process.env.GEMINI_API_KEY;
      llmDefaultModel = process.env.GEMINI_DEFAULT_MODEL;
    } else if (process.env.OLLAMA_BASE_URL || process.env.LOCAL_LLM_API_KEY) {
      llmProvider = 'ollama';
      llmUrl = process.env.OLLAMA_BASE_URL || process.env.LOCAL_LLM_API_KEY;
      llmDefaultModel = process.env.OLLAMA_DEFAULT_MODEL || process.env.LOCAL_LLM_DEFAULT_MODEL;
    } else if (process.env.ANTHROPIC_API_KEY) {
      llmProvider = 'anthropic';
      llmApiKey = process.env.ANTHROPIC_API_KEY;
      llmDefaultModel = process.env.ANTHROPIC_DEFAULT_MODEL;
    } else if (process.env.OPENAI_API_KEY || process.env.CLOUD_LLM_API_KEY) {
      llmProvider = 'openai';
      llmApiKey = process.env.OPENAI_API_KEY || process.env.CLOUD_LLM_API_KEY;
      llmDefaultModel = process.env.OPENAI_DEFAULT_MODEL || process.env.CLOUD_LLM_DEFAULT_MODEL;
    }
  }

  if (!llmProvider) {
    logger.warn('No LLM provider configured. Set LLM_PROVIDER and LLM_API_KEY (or LLM_URL).');
    process.exit(1);
  }

  // Build configuration
  const botConfig: CovaBotConfig = {
    discordToken,
    personalitiesPath: process.env.COVABOT_PERSONALITIES_PATH,
    databasePath: process.env.COVABOT_DATABASE_PATH,
    llmProvider,
    llmUrl,
    llmApiKey,
    llmDefaultModel,
  };

  // Initialize MetricsService with the correct service name BEFORE anything calls
  // getMetricsService() without a name (e.g. health server, covabot-metrics module).
  getMetricsService('covabot');

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

  // Register config validation health check
  registerConfigHealthCheck(['DISCORD_TOKEN'], 'covabot');

  // Register dependency health checks for Postgres and Redis if configured
  const postgresHost = process.env.POSTGRES_HOST;
  if (postgresHost) {
    registerDependencyHealthChecks({
      postgres: {
        host: postgresHost,
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        database: process.env.POSTGRES_DB || 'starbunk',
        user: process.env.POSTGRES_USER || 'starbunk',
        password: process.env.POSTGRES_PASSWORD || '',
      },
      redisUrl: process.env.REDIS_URL,
    });
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
