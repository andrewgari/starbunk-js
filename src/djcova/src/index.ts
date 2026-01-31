// DJCova - Music service container
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { setupDJCovaLogging } from './observability/setup-logging';
import { logger } from './observability/logger';
import { ensureError } from './utils';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { initializeCommands } from '@starbunk/shared/discord/command-registry';
import { commands } from '@/commands';

// Setup logging mixins before creating any logger instances
setupDJCovaLogging();
// Main execution
async function main(): Promise<void> {
  if (process.env.CI_SMOKE_MODE === 'true') {
    logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
    runSmokeMode();
    return;
  }

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }

  // Start health/metrics server
  globalHealthServer = await initializeHealthServer();

  // Create Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  client.on(Events.ClientReady, () => {
    logger.info('DJCova is ready and connected to Discord');
  });

  // Login to Discord
  await client.login(token);

  // Initialize commands using shared registry
  await initializeCommands(client, commands);
  logger.info('DJCova commands initialized successfully');
}

// Graceful shutdown
let globalHealthServer: Awaited<ReturnType<typeof initializeHealthServer>> | undefined;

process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down DJCova...');
  await globalHealthServer?.stop();
  await shutdownObservability(process.env.SERVICE_NAME || 'djcova');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down DJCova...');
  await globalHealthServer?.stop();
  await shutdownObservability(process.env.SERVICE_NAME || 'djcova');
  process.exit(0);
});

// Global error handlers to properly log unhandled errors with structured logging
process.on('uncaughtException', (error: Error) => {
  logger
    .withError(error)
    .withMetadata({
      stack: error.stack,
    })
    .error('Uncaught exception - process will exit');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const error = ensureError(reason);
  logger
    .withError(error)
    .withMetadata({
      reason: String(reason),
    })
    .error('Unhandled promise rejection - process will exit');
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    logger
      .withError(ensureError(error))
      .withMetadata({
        stack: error.stack,
      })
      .error('Fatal error in main - process will exit');
    process.exit(1);
  });
}
