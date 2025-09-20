// DJCova - Music service container (Minimal Bootstrap Demo)
import { Events, Client, Interaction } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

import {
	logger,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	container,
	ServiceId,
} from '@starbunk/shared';

class DJCovaContainer {
	private client!: Client;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🎵 Initializing DJCova container...');

		try {
			// Validate environment
			this.validateEnvironment();

			// Create Discord client with voice capabilities
			this.client = createDiscordClient(ClientConfigs.DJCova);

			// Initialize services
			await this.initializeServices();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ DJCova container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize DJCova container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN'],
			optional: ['DEBUG', 'NODE_ENV'],
		});
		logger.info('✅ Environment validation passed for DJCova');
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Note: DJCova doesn't need database access
		logger.info('✅ DJCova services initialized (no database required)');
		logger.info('🎵 Music service ready for voice channel operations');
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🎵 DJCova is ready and connected to Discord');
			this.hasInitialized = true;
		});
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				// Demo: Simple music commands
				switch (interaction.commandName) {
					case 'play':
						await interaction.reply('🎵 DJCova music player is ready! (Demo mode)');
						break;
					case 'stop':
						await interaction.reply('⏹️ Music stopped! (Demo mode)');
						break;
					case 'volume':
						await interaction.reply('🔊 Volume adjusted! (Demo mode)');
						break;
					default:
						logger.debug(`Unknown music command: ${interaction.commandName}`);
				}
			} catch (error) {
				logger.error('Error processing music interaction:', ensureError(error));
			}
		}
	}

	async start(): Promise<void> {
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN environment variable is required');
		}

		await this.client.login(token);
		await this.waitForReady();
		logger.info('🎉 DJCova started successfully');
	}

	private waitForReady(): Promise<void> {
		return new Promise((resolve) => {
			if (this.hasInitialized) {
				resolve();
			} else {
				this.client.once(Events.ClientReady, () => resolve());
			}
		});
	}

	async stop(): Promise<void> {
		logger.info('Stopping DJCova...');
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('DJCova stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3004;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`🏥 [SMOKE] DJCova health server running on port ${port}`));
		const shutdown = (_signal: string) => {
			server.close(() => process.exit(0));
		};
		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}
	try {
		const djCova = new DJCovaContainer();
		await djCova.initialize();
		await djCova.start();
	} catch (error) {
		logger.error('Failed to start DJCova:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down DJCova...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down DJCova...');
	process.exit(0);
});

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
