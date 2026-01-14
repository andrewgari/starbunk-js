import * as dotenv from 'dotenv';
import * as path from 'path';
import * as http from 'http';
import { BotDiscoveryService } from './reply-bots/services/bot-discovery-service';
import { YamlBotFactory } from './serialization/yaml-bot-factory';
import { BotRegistry } from './reply-bots/bot-registry';
import { Client, GatewayIntentBits, Message, Interaction, AutocompleteInteraction, ChatInputCommandInteraction, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { DiscordService } from './discord/discord-service';
import { getHealthServer } from './observability/health-server';
import { getMetricsService } from './observability/metrics-service';
import { logger } from './observability/logger';

// Import commands
import pingCommand from './commands/ping';
import clearwebhooksCommand from './commands/clearwebhooks';
import botCommand from './commands/bot';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildWebhooks,
];

// Command interface
interface Command {
	data: RESTPostAPIChatInputApplicationCommandsJSONBody;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

async function main() {
	// CI Smoke Mode: Start minimal health server and skip Discord login
	// This allows CI to verify the Docker container builds and starts correctly
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 3000;

		const server = http.createServer((req, res) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						status: 'healthy',
						service: 'bunkbot',
						mode: 'smoke',
						timestamp: new Date().toISOString(),
					}),
				);
				return;
			}

			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});

		server.listen(port, () => {
			logger.info(`[SMOKE] BunkBot health server running on port ${port}`);
		});

		const shutdown = (signal: string) => {
			logger.info(`Received ${signal}, shutting down smoke mode server...`);
			server.close(() => process.exit(0));
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}

	// Initialize observability
	logger.info('Starting BunkBot...', {
		node_version: process.version,
		platform: process.platform,
		env: process.env.NODE_ENV || 'production',
	});
	const metricsService = getMetricsService();

	// Register commands
	const commands = new Map<string, Command>();
	commands.set('ping', pingCommand);
	commands.set('clearwebhooks', clearwebhooksCommand);
	commands.set('bot', botCommand);
	logger.info(`Registered ${commands.size} commands: ${Array.from(commands.keys()).join(', ')}`);

	// Start health/metrics server
	const metricsPort = parseInt(process.env.METRICS_PORT || '3000', 10);
	logger.info('Starting health and metrics server', { port: metricsPort });
	const healthServer = getHealthServer(metricsPort);
	await healthServer.start();
	logger.info('Health and metrics server started successfully', {
		port: metricsPort,
		endpoints: ['/health', '/ready', '/live', '/metrics'],
	});

	// Create and login Discord client first
	logger.info('Initializing Discord client', {
		intents: intents.length,
	});
	const client = new Client({ intents });
	const token = process.env.BUNKBOT_TOKEN || process.env.DISCORD_TOKEN;
	if (!token) {
		logger.error('Discord token not found in environment variables');
		throw new Error('BUNKBOT_TOKEN or DISCORD_TOKEN environment variable is required');
	}

	logger.info('Logging in to Discord...');
	await client.login(token);
	logger.info('Connected to Discord successfully', {
		bot_tag: client.user?.tag,
		bot_id: client.user?.id,
		guilds_count: client.guilds.cache.size,
	});

	// Initialize Discord service with the client
	const discordService = DiscordService.getInstance();
	discordService.setClient(client);

	// Now load bots (they can use the Discord service)
	const botsDir = process.env.BUNKBOT_BOTS_DIR || path.join(__dirname, '../../../config/bots');
	logger.info('Starting bot discovery', { directory: botsDir });

	const registry = new BotRegistry();
	BotRegistry.setInstance(registry); // Make registry accessible globally
	const factory = new YamlBotFactory();
	const discovery = new BotDiscoveryService(factory, registry);
	await discovery.discover(botsDir);

	// Update active bots metric
	const botCount = registry.getBots().length;
	metricsService.setActiveBots(botCount);
	logger.info('Bot discovery complete', {
		total_bots: botCount,
		bot_names: registry.getBots().map(b => b.name).join(', '),
	});

	// Deploy commands to Discord
	logger.info('Deploying slash commands to Discord...');
	const commandData = Array.from(commands.values()).map((cmd) => cmd.data);
	const guildId = process.env.GUILD_ID;

	if (guildId) {
		logger.info(`Deploying commands to guild ${guildId}`);
		const guild = await client.guilds.fetch(guildId);
		await guild.commands.set(commandData);
	} else {
		logger.info('Deploying commands globally');
		await client.application!.commands.set(commandData);
	}
	logger.info(`Successfully deployed ${commandData.length} slash commands`);

	// Set up message handler
	logger.info('Registering Discord event handlers');
	client.on('messageCreate', async (message: Message) => {
		// Track message processing
		if (message.guildId && message.channelId) {
			metricsService.trackMessageProcessed(message.guildId, message.channelId);
		}

		await registry.processmessage(message);
	});

	// Set up interaction handler for commands
	client.on('interactionCreate', async (interaction: Interaction) => {
		if (interaction.isChatInputCommand()) {
			try {
				const command = commands.get(interaction.commandName);
				if (command) {
					logger.info('Executing command', {
						command_name: interaction.commandName,
						user_id: interaction.user.id,
						guild_id: interaction.guildId,
					});
					await command.execute(interaction);
				} else {
					logger.warn('Unknown command', { command_name: interaction.commandName });
					await interaction.reply({
						content: `Unknown command: ${interaction.commandName}`,
						ephemeral: true,
					});
				}
			} catch (error) {
				logger.error('Error executing command', error, {
					command_name: interaction.commandName,
				});
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: 'An error occurred while executing the command.',
						ephemeral: true,
					});
				}
			}
		} else if (interaction.isAutocomplete()) {
			try {
				const command = commands.get(interaction.commandName);
				if (command?.autocomplete) {
					await command.autocomplete(interaction);
				}
			} catch (error) {
				logger.error('Error in autocomplete', error, {
					command_name: interaction.commandName,
				});
			}
		}
	});

	// Log when bot joins/leaves guilds
	client.on('guildCreate', (guild) => {
		logger.info('Bot added to new guild', {
			guild_id: guild.id,
			guild_name: guild.name,
			member_count: guild.memberCount,
		});
	});

	client.on('guildDelete', (guild) => {
		logger.info('Bot removed from guild', {
			guild_id: guild.id,
			guild_name: guild.name,
		});
	});

	// Log errors
	client.on('error', (error) => {
		logger.error('Discord client error', error);
	});

	client.on('warn', (warning) => {
		logger.warn('Discord client warning', { warning });
	});

	logger.info('BunkBot is now running and listening for Discord events', {
		guilds: client.guilds.cache.size,
		active_bots: botCount,
	});

	// Graceful shutdown
	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}, shutting down gracefully...`, { signal });

		try {
			logger.info('Stopping health server...');
			await healthServer.stop();
			logger.info('Health server stopped');

			logger.info('Destroying Discord client...');
			await client.destroy();
			logger.info('Discord client destroyed');

			logger.info('Shutdown complete');
			process.exit(0);
		} catch (error) {
			logger.error('Error during shutdown', error);
			process.exit(1);
		}
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('uncaughtException', (error: Error) => {
	logger.error('Uncaught exception - process will exit', error, {
		stack: error.stack,
	});
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	logger.error('Unhandled promise rejection - process will exit', reason instanceof Error ? reason : new Error(String(reason)), {
		reason: String(reason),
	});
	process.exit(1);
});

if (require.main === module) {
	main().catch((error: Error) => {
		logger.error('Fatal error during startup - process will exit', error, {
			stack: error.stack,
		});
		process.exit(1);
	});
}
