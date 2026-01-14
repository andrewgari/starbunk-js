import 'dotenv/config';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { createServer } from 'http';
import { logger } from './observability/logger';
import { BlueBotService } from './services/bluebot-service';
import { BlueBotLLMService } from './llm/blubot-llm-service';
import { createConfiguredLLMProvider } from './llm/provider-factory';

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	// GatewayIntentBits.GuildWebhooks,
];

class BlueBotContainer {
	private client: Client;
	private blueBotService: BlueBotService | null = null;

	constructor() {
		this.client = new Client({ intents });
	}

	async start(): Promise<void> {
		logger.info('Starting BlueBot container...');

		const token = process.env.DISCORD_TOKEN;

		if (!token) {
			logger.error('Discord token not found in environment variables');
			throw new Error('BLUEBOT_TOKEN, DISCORD_TOKEN or STARBUNK_TOKEN environment variable is required');
		}

		logger.info('Logging in to Discord...');
		await this.client.login(token);
		logger.info('BlueBot connected to Discord');

		// Configure and initialize the LLM provider based on environment
		const provider = await createConfiguredLLMProvider();
		const llmService = BlueBotLLMService.getInstance(provider);
		this.blueBotService = BlueBotService.getInstance(llmService);

		await this.blueBotService.initialize();
		logger.info('BlueBot service initialized');

		this.client.on('messageCreate', async (message: Message) => {
			// Basic bot-loop safety: never respond to other bots or self
			if (message.author.bot) return;

			try {
				await this.handleMessage(message);
			} catch (error) {
				logger.error('Error handling message', error);
			}
		});

		// Set up graceful shutdown handlers
		const shutdown = (signal: string) => {
			logger.info(`Received ${signal}, shutting down gracefully...`);
			this.client.destroy();
			process.exit(0);
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
	}

	private async handleMessage(message: Message): Promise<void> {
		if (!this.blueBotService) {
			logger.warn('BlueBotService is not initialized; ignoring message');
			return;
		}

		await this.blueBotService.processMessage(message);
	}
}

async function main(): Promise<void> {
	// CI smoke mode: lightweight health endpoint without Discord login
	if (process.env.CI_SMOKE_MODE === 'true') {
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 3000;

		const server = createServer((req, res) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(
					JSON.stringify({
						status: 'healthy',
						service: 'bluebot',
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
			logger.info(`[SMOKE] BlueBot health server listening on port ${port}`);
		});

		const shutdown = (signal: string) => {
			logger.info(`[SMOKE] Received ${signal}, shutting down health server...`);
			server.close(() => process.exit(0));
		};

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}

	const bot = new BlueBotContainer();
	await bot.start();
}

if (require.main === module) {
	main().catch((error) => {
		logger.error('Fatal error during BlueBot startup', error);
		process.exit(1);
	});
}
