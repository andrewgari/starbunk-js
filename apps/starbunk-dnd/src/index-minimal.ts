// Starbunk-DND - D&D features and Snowbunk bridge container (Minimal Bootstrap Demo)
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

class StarbunkDNDContainer {
	private client!: Client;
	private snowbunkClient: Client | null = null;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🐉 Initializing Starbunk-DND container...');

		try {
			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.StarbunkDND);

			// Initialize services
			await this.initializeServices();

			// Initialize Snowbunk bridge if token is available
			await this.initializeSnowbunk();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ Starbunk-DND container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize Starbunk-DND container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN'],
			optional: [
				'SNOWBUNK_TOKEN',
				'DATABASE_URL',
				'OPENAI_API_KEY',
				'OLLAMA_API_URL',
				'VECTOR_CONTEXT_DIR',
				'DEBUG',
				'NODE_ENV',
			],
		});
		logger.info('✅ Environment validation passed for Starbunk-DND');
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize database for D&D campaigns
		if (process.env.DATABASE_URL) {
			logger.info('✅ Database connection available for D&D campaigns');
		} else {
			logger.info('ℹ️  No database URL provided, D&D features will work without persistence');
		}

		// Initialize LLM services if API keys are available
		if (process.env.OPENAI_API_KEY || process.env.OLLAMA_API_URL) {
			logger.info('✅ LLM services available for D&D features');
		} else {
			logger.info('ℹ️  No LLM API keys provided, D&D features will work without AI assistance');
		}

		// Initialize vector embeddings if directory is available
		if (process.env.VECTOR_CONTEXT_DIR) {
			logger.info('✅ Vector context directory available for campaign data');
		}

		logger.info('✅ Starbunk-DND services initialized');
	}

	private async initializeSnowbunk(): Promise<void> {
		const snowbunkToken = process.env.SNOWBUNK_TOKEN;
		if (snowbunkToken) {
			logger.info('🌉 Initializing Snowbunk bridge...');
			try {
				// Demo: Snowbunk bridge initialization
				logger.info('✅ Snowbunk bridge initialized (Demo mode)');
			} catch (error) {
				logger.error('Failed to initialize Snowbunk bridge:', ensureError(error));
			}
		} else {
			logger.info('ℹ️  SNOWBUNK_TOKEN not provided, skipping bridge initialization');
		}
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
			logger.info('🐉 Starbunk-DND is ready and connected to Discord');
			this.hasInitialized = true;
		});
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				// Demo: D&D commands
				switch (interaction.commandName) {
					case 'rpg':
						await interaction.reply('🎲 D&D RPG system is ready! (Demo mode)');
						break;
					case 'campaign':
						await interaction.reply('📚 Campaign management available! (Demo mode)');
						break;
					case 'roll': {
						const roll = Math.floor(Math.random() * 20) + 1;
						await interaction.reply(`🎲 You rolled a ${roll}!`);
						break;
					}
					default:
						logger.debug(`Unknown D&D command: ${interaction.commandName}`);
				}
			} catch (error) {
				logger.error('Error processing D&D interaction:', ensureError(error));
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
		logger.info('🎉 Starbunk-DND started successfully');
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
		logger.info('Stopping Starbunk-DND...');
		if (this.snowbunkClient) {
			await this.snowbunkClient.destroy();
		}
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('Starbunk-DND stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3005;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`[SMOKE] Starbunk-DND health server running on port ${port}`));
		const shutdown = (_signal: string) => {
			server.close(() => process.exit(0));
		};
		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}
	try {
		const starbunkDND = new StarbunkDNDContainer();
		await starbunkDND.initialize();
		await starbunkDND.start();
	} catch (error) {
		logger.error('Failed to start Starbunk-DND:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down Starbunk-DND...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down Starbunk-DND...');
	process.exit(0);
});

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
