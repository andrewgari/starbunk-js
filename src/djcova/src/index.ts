// DJCova - Music service container
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { setupDJCovaLogging } from './observability/setup-logging';
import { logger } from './observability/logger';
import { ensureError } from './utils';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { initializeCommands } from '@starbunk/shared/discord/command-registry';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { getDJCovaMetrics } from './observability/djcova-metrics';
import { commands } from '@/commands';

// Setup logging mixins before creating any logger instances
setupDJCovaLogging();

// Initialize MetricsService with the DJCova service name before anything else
// creates the singleton with the wrong name (health server calls getMetricsService()
// internally). DJCovaMetrics will share this same registry.
const serviceName = process.env.SERVICE_NAME || 'djcova';
getMetricsService(serviceName);
getDJCovaMetrics();
// Main execution
async function main(): Promise<void> {
  logger.info('DJCova main() function starting...');

  if (process.env.CI_SMOKE_MODE === 'true') {
    logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
    runSmokeMode();
    return;
  }

  logger.debug('Reading DISCORD_TOKEN from environment variables...');
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    const error = new Error('DISCORD_TOKEN environment variable is required');
    logger.withError(error).error('DISCORD_TOKEN not found - aborting startup');
    throw error;
  }
  logger.debug('DISCORD_TOKEN found (length: ' + token.length + ' chars)');

  try {
    // Start health/metrics server
    logger.info('Starting health/metrics server...');
    globalHealthServer = await initializeHealthServer();
    logger.info('✅ Health/metrics server started');
  } catch (error) {
    logger
      .withError(error instanceof Error ? error : new Error(String(error)))
      .error('Failed to initialize health server');
    throw error;
  }

  try {
    // Create Discord client
    logger.info('Creating Discord client...');
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });
    logger.debug('Discord client created successfully');

    client.on(Events.ClientReady, () => {
      logger.info('🎵 DJCova is ready and connected to Discord');
      logger.info(`Bot user: ${client.user?.tag}`);
    });

    logger.info('Authenticating with Discord...');
    // Login to Discord
    await client.login(token);
    logger.info('✅ Discord authentication successful');

    // Initialize commands using shared registry
    logger.info('Initializing commands...');
    await initializeCommands(client, commands);
    logger.info('✅ DJCova commands initialized successfully');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger
      .withError(err)
      .withMetadata({ stack: err.stack })
      .error('Failed to initialize Discord client or commands');
    throw err;
  }
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
