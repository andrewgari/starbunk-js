import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { setupBlueBotLogging } from '@/observability/setup-logging';
import { logger } from '@/observability/logger';
import { BlueBot } from '@/blue-bot';
import { runSmokeTest } from '@starbunk/shared/health/smoke-test';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';

// Setup logging mixins before creating any logger instances
setupBlueBotLogging();

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  // GatewayIntentBits.GuildWebhooks,
];

async function main(): Promise<void> {
  // CI smoke mode: lightweight health endpoint without Discord login
  if (process.env.CI_SMOKE_MODE === 'true') {
    runSmokeTest('bluebot');
    return;
  }

  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    logger.error('Discord token not found in environment variables');
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  // Initialize observability
  logger
    .withMetadata({
      node_version: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'production',
    })
    .info('Starting BlueBot...');

  // Initialize metrics service (singleton pattern - will be used by other modules)
  getMetricsService('bluebot');

  // Start health/metrics server
  const healthServer = await initializeHealthServer();

  const client = new Client({ intents });

  logger.info('Logging in to Discord...');
  await client.login(token);
  logger
    .withMetadata({
      user_id: client.user?.id,
      user_tag: client.user?.tag,
    })
    .info('BlueBot connected to Discord');

  const bot = new BlueBot(client);
  await bot.start();

  // Set up graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await healthServer?.stop();
    client.destroy();
    await shutdownObservability(process.env.SERVICE_NAME || 'bluebot');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  main().catch(error => {
    logger.withError(error).error('Fatal error during BlueBot startup');
    process.exit(1);
  });
}
