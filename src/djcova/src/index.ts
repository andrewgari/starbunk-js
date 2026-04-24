// DJCova - Music service container
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { setupDJCovaLogging } from './observability/setup-logging';
import { logger } from './observability/logger';
import { Client, Events, GatewayIntentBits, Message, VoiceChannel } from 'discord.js';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import {
  setApplicationHealth,
  registerHealthCheckModule,
} from '@starbunk/shared/observability/health-server';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { initializeCommands } from '@starbunk/shared/discord/command-registry';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { getDJCovaMetrics } from './observability/djcova-metrics';
import { SharedErrorCode, logError } from '@starbunk/shared/errors';
import { commands } from '@/commands';
import { getDJCovaService } from '@/core/djcova-factory';
import { registerDJCovaHealthModule } from './health/djcova-health';

// Setup logging mixins before creating any logger instances
setupDJCovaLogging();

// Voice/connection health state — updated by Discord client events
const djcovaHealth = {
  discordReady: false,
  commandsReady: false,
  startedAt: Date.now(),
  lastErrorAt: null as number | null,
  errorCount: 0,
};

registerHealthCheckModule({
  name: 'bot_activity',
  getHealth: async () => {
    const uptimeMs = Date.now() - djcovaHealth.startedAt;
    const warnings: string[] = [];
    let status: 'ok' | 'degraded' | 'critical' = 'ok';

    if (!djcovaHealth.discordReady) {
      status = 'degraded';
      warnings.push('Discord client not ready');
    }
    if (!djcovaHealth.commandsReady) {
      status = status === 'ok' ? 'degraded' : status;
      warnings.push('Commands not initialized');
    }
    if (djcovaHealth.errorCount > 0) {
      const lastErrorAgo = djcovaHealth.lastErrorAt ? Date.now() - djcovaHealth.lastErrorAt : null;
      if (lastErrorAgo !== null && lastErrorAgo < 5 * 60 * 1000) {
        status = status === 'ok' ? 'degraded' : status;
        warnings.push(
          `${djcovaHealth.errorCount} Discord error(s), most recent ${Math.floor(lastErrorAgo / 1000)}s ago`,
        );
      }
    }

    return {
      status,
      warnings,
      discord_ready: djcovaHealth.discordReady,
      commands_ready: djcovaHealth.commandsReady,
      error_count: djcovaHealth.errorCount,
      last_error_at: djcovaHealth.lastErrorAt
        ? new Date(djcovaHealth.lastErrorAt).toISOString()
        : null,
      uptime_ms: uptimeMs,
    };
  },
});

// Initialize MetricsService with the DJCova service name before anything else
// creates the singleton with the wrong name (health server calls getMetricsService()
// internally). DJCovaMetrics will share this same registry.
const serviceName = process.env.SERVICE_NAME || 'djcova';
getMetricsService(serviceName);
getDJCovaMetrics();
registerDJCovaHealthModule();
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
    const isE2eMode = process.env.E2E_MODE === 'true';
    const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates];
    if (isE2eMode) {
      intents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
      logger.info('E2E_MODE enabled: added GuildMessages + MessageContent intents');
    }
    const client = new Client({ intents });
    logger.debug('Discord client created successfully');

    client.on(Events.ClientReady, () => {
      logger.info('🎵 DJCova is ready and connected to Discord');
      logger.info(`Bot user: ${client.user?.tag}`);
      djcovaHealth.discordReady = true;
    });

    client.on(Events.Error, error => {
      logger.withError(error).error('Discord client error');
      djcovaHealth.errorCount++;
      djcovaHealth.lastErrorAt = Date.now();
      djcovaHealth.discordReady = false;
    });

    logger.info('Authenticating with Discord...');
    // Login to Discord
    await client.login(token);
    logger.info('✅ Discord authentication successful');

    // Initialize commands using shared registry
    logger.info('Initializing commands...');
    await initializeCommands(client, commands);
    logger.info('✅ DJCova commands initialized successfully');
    djcovaHealth.commandsReady = true;
    setApplicationHealth('healthy');

    // E2E text command handler — only active when E2E_MODE=true
    if (isE2eMode) {
      const e2eAllowedBotIds = process.env.E2E_ALLOWED_BOT_IDS?.split(',').map(s => s.trim()) ?? [];

      client.on(Events.MessageCreate, async (message: Message) => {
        if (!e2eAllowedBotIds.includes(message.author.id)) return;
        if (!message.guild) return;

        const content = message.content.trim();

        if (content.startsWith('!e2eplay ')) {
          const url = content.slice('!e2eplay '.length).trim();
          const member = message.member;
          const voiceChannel = member?.voice.channel as VoiceChannel | null;

          if (!voiceChannel) {
            await message.reply('E2E error: sender is not in a voice channel');
            return;
          }

          try {
            const service = getDJCovaService(message.guild.id);
            await service.playInVoiceChannel(voiceChannel, url, async msg => {
              await message.reply(msg);
            });
            await message.reply('🎶 E2E: Now playing!');
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            await message.reply(`E2E error: ${errMsg}`);
          }
        } else if (content === '!e2estop') {
          const service = getDJCovaService(message.guild.id);
          service.stopInGuild(message.guild.id);
          await message.reply('E2E: Stopped');
        }
      });

      logger.info('✅ E2E text command handler registered (!e2eplay, !e2estop)');
    }
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
