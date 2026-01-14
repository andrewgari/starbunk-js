import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Message } from 'discord.js';
import { createServer } from 'http';

import { getHealthServer } from './observability/health-server';
import { logger } from './observability/logger';
import { BLUE_BOT_NAME, BLUE_BOT_AVATARS } from './constants';
import { BlueBotTriggers } from './triggers';
import { WebhookService } from './services/webhook-manager';
import { BotIdentity } from './types/bot-identity';

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildWebhooks,
];

class BlueBotContainer {
	private client: Client;
	private triggers: BlueBotTriggers;
	private webhookService: WebhookService;

	constructor() {
		this.client = new Client({ intents });
		this.triggers = new BlueBotTriggers();
		this.webhookService = new WebhookService(this.client);
	}

	async start(): Promise<void> {
		logger.info('Starting BlueBot container...');

		this.registerEventHandlers();
		await this.startHealthServer();

		const token =
			process.env.BLUEBOT_TOKEN || process.env.DISCORD_TOKEN || process.env.STARBUNK_TOKEN;

		if (!token) {
			logger.error('Discord token not found in environment variables');
			throw new Error(
				'BLUEBOT_TOKEN, DISCORD_TOKEN or STARBUNK_TOKEN environment variable is required',
			);
		}

		logger.info('Logging in to Discord...');
		await this.client.login(token);
		logger.info('BlueBot connected to Discord');
	}

	private registerEventHandlers(): void {
		this.client.once(Events.ClientReady, (readyClient) => {
			logger.info(`BlueBot ready as ${readyClient.user.tag}`, {
				bot_id: readyClient.user.id,
			});
		});

		this.client.on(Events.MessageCreate, async (message: Message) => {
			// Basic bot-loop safety: never respond to other bots or self
			if (message.author.bot) return;

			try {
				await this.handleMessage(message);
			} catch (error) {
				logger.error('Error handling message', error);
			}
		});
	}

	private async handleMessage(message: Message): Promise<void> {
		const result = await this.triggers.checkAllTriggers(message);
		if (!result.shouldRespond || !result.response) return;

		const identity: BotIdentity = {
			botName: result.botName ?? BLUE_BOT_NAME,
			avatarUrl: result.avatarUrl ?? BLUE_BOT_AVATARS.Default,
		};

		await this.webhookService.send(message, identity, result.response);
	}

	private async startHealthServer(): Promise<void> {
		const port = parseInt(
			process.env.HEALTH_PORT || process.env.METRICS_PORT || '3000',
			10,
		);
		const healthServer = getHealthServer(port);
		await healthServer.start();
		logger.info('BlueBot health server started', { port });
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

