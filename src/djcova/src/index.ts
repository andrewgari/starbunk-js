// DJCova - Music service container
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { setupDJCovaLogging } from './observability/setup-logging';
import { logger } from './observability/logger';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { initializeCommands } from '@starbunk/shared/discord/command-registry';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { getDJCovaMetrics } from './observability/djcova-metrics';
import { SharedErrorCode, logError } from '@starbunk/shared/errors';
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
    logError(logger, SharedErrorCode.CONFIG_MISSING, 'DISCORD_TOKEN not found - aborting startup', {
      config_key: 'DISCORD_TOKEN',
    });
    throw error;
  }
  logger.debug('DISCORD_TOKEN found (length: ' + token.length + ' chars)');

  try {
    // Start health/metrics server
    logger.info('Starting health/metrics server...');
    globalHealthServer = await initializeHealthServer();
    logger.info('✅ Health/metrics server started');
  } catch (error) {
    logError(logger, SharedErrorCode.UNKNOWN, 'Failed to initialize health server', {
      cause: error,
    });
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
    logError(
      logger,
      SharedErrorCode.DISCORD_API_ERROR,
      'Failed to initialize Discord client or commands',
      {
        cause: error,
      },
    );
    throw error instanceof Error ? error : new Error(String(error));
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
  logError(logger, SharedErrorCode.UNKNOWN, 'Uncaught exception - process will exit', {
    cause: error,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logError(logger, SharedErrorCode.UNKNOWN, 'Unhandled promise rejection - process will exit', {
    cause: reason,
    reason: String(reason),
  });
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    logError(logger, SharedErrorCode.UNKNOWN, 'Fatal error in main - process will exit', {
      cause: error,
    });
    process.exit(1);
  });
}
