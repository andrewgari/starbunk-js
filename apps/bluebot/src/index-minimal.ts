// BlueBot - Blue detection and response bot container
import { Events, Client, Message } from 'discord.js';
import { createServer } from 'http';
import {
	logger,
	container,
	ServiceId,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	WebhookManager,
	getMessageFilter,
	MessageFilter,
	runStartupDiagnostics,
	initializeObservability,
	type DiagnosticResult,
	getDiscordToken,
} from '@starbunk/shared';

import { BlueBotTriggers } from './triggers';
import { BLUE_BOT_NAME } from './constants';

class BlueBotContainer {
	private client!: Client;
	private webhookManager!: WebhookManager;
	private messageFilter!: MessageFilter;
	private triggers!: BlueBotTriggers;
	private healthServer?: ReturnType<typeof createServer>;

	async initialize(): Promise<void> {
		try {
			logger.info('[BlueBot] Starting initialization...');

			// Initialize observability
			initializeObservability('bluebot');

			// Validate environment
			const validation = validateEnvironment(['BLUEBOT', 'STARBUNK']);
			if (!validation.valid) {
				throw new Error(`Environment validation failed: ${validation.missingVars.join(', ')}`);
			}

			// Create Discord client
			const token = getDiscordToken(['BLUEBOT', 'STARBUNK']);
			this.client = createDiscordClient(ClientConfigs.BlueBot);
			
			// Initialize webhook manager
			this.webhookManager = new WebhookManager(this.client);
			container.register(ServiceId.WebhookManager, this.webhookManager);

			// Initialize message filter
			this.messageFilter = getMessageFilter(this.client);

			// Initialize triggers
			this.triggers = new BlueBotTriggers();

			// Set up event handlers
			this.setupEventHandlers();

			// Start health server
			this.startHealthServer();

			// Login to Discord
			logger.info('[BlueBot] Logging in to Discord...');
			await this.client.login(token);

			logger.info('[BlueBot] Initialization complete');
		} catch (error) {
			logger.error('[BlueBot] Initialization failed:', ensureError(error));
			throw error;
		}
	}

	private setupEventHandlers(): void {
		this.client.once(Events.ClientReady, async (client) => {
			logger.info(`[BlueBot] Ready! Logged in as ${client.user.tag}`);

			// Run startup diagnostics
			const diagnostics: DiagnosticResult = await runStartupDiagnostics(
				this.client,
				'bluebot',
				'1.5.1',
			);

			if (!diagnostics.success) {
				logger.warn('[BlueBot] Startup diagnostics failed:', diagnostics);
			}
		});

		this.client.on(Events.MessageCreate, async (message) => {
			try {
				await this.handleMessage(message);
			} catch (error) {
				logger.error('[BlueBot] Error handling message:', ensureError(error));
			}
		});

		this.client.on(Events.Error, (error) => {
			logger.error('[BlueBot] Discord client error:', error);
		});
	}

	private async handleMessage(message: Message): Promise<void> {
		// Apply message filtering
		if (!this.messageFilter(message)) {
			return;
		}

		// Check triggers
		const triggerResult = await this.triggers.checkAllTriggers(message);

		if (triggerResult.shouldRespond && triggerResult.response) {
			// Send response via webhook
			await this.webhookManager.sendMessage(message.channel, {
				content: triggerResult.response,
				username: triggerResult.botName || BLUE_BOT_NAME,
				avatarURL: triggerResult.avatarUrl,
			});

			logger.debug('[BlueBot] Responded to message', {
				channelId: message.channel.id,
				messageId: message.id,
			});
		}
	}

	private startHealthServer(): void {
		const port = parseInt(process.env.HEALTH_PORT || process.env.METRICS_PORT || '3000', 10);

		this.healthServer = createServer((req, res) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					status: 'healthy',
					service: 'bluebot',
					uptime: process.uptime(),
					timestamp: new Date().toISOString(),
				}));
			} else if (req.url === '/metrics') {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end('# BlueBot metrics placeholder\n');
			} else {
				res.writeHead(404);
				res.end();
			}
		});

		this.healthServer.listen(port, () => {
			logger.info(`[BlueBot] Health server listening on port ${port}`);
		});
	}

	async shutdown(): Promise<void> {
		logger.info('[BlueBot] Shutting down...');

		if (this.healthServer) {
			this.healthServer.close();
		}

		if (this.client) {
			await this.client.destroy();
		}

		logger.info('[BlueBot] Shutdown complete');
	}
}

// Main execution
async function main(): Promise<void> {
	const blueBot = new BlueBotContainer();

	// Handle graceful shutdown
	process.on('SIGTERM', async () => {
		logger.info('[BlueBot] Received SIGTERM signal');
		await blueBot.shutdown();
		process.exit(0);
	});

	process.on('SIGINT', async () => {
		logger.info('[BlueBot] Received SIGINT signal');
		await blueBot.shutdown();
		process.exit(0);
	});

	// Handle uncaught errors
	process.on('uncaughtException', (error) => {
		logger.error('[BlueBot] Uncaught exception:', error);
		process.exit(1);
	});

	process.on('unhandledRejection', (reason, promise) => {
		logger.error('[BlueBot] Unhandled rejection at:', promise, 'reason:', reason);
		process.exit(1);
	});

	// Initialize the bot
	await blueBot.initialize();
}

// Run if this is the main module
if (require.main === module) {
	main().catch((error) => {
		logger.error('[BlueBot] Fatal error:', ensureError(error));
		process.exit(1);
	});
}

export default main;
