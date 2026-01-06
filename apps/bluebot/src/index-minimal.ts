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
	StartupDiagnostics,
	initializeUnifiedObservability,
	shutdownObservability,
} from '@starbunk/shared';

import { BlueBotTriggers } from './triggers';
import { BLUE_BOT_NAME } from './constants';

class BlueBotContainer {
	private client!: Client;
	private webhookManager!: WebhookManager;
	private messageFilter!: MessageFilter;
	private triggers!: BlueBotTriggers;
	private healthServer?: ReturnType<typeof createServer>;
	private observability?: ReturnType<typeof initializeUnifiedObservability>;

	async initialize(): Promise<void> {
		try {
			logger.info('[BlueBot] Starting initialization...');

			// Initialize observability using the unified setup (service-only)
			try {
				this.observability = initializeUnifiedObservability('bluebot', {
					enableUnified: false,
					enableStructuredLogging: true,
					skipHttpEndpoints: true,
				});
				logger.info('[BlueBot] Observability initialized with unified configuration (service-only)');
			} catch (error) {
				logger.warn(
					'[BlueBot] Failed to initialize unified observability; continuing with basic logging only:',
					ensureError(error),
				);
			}

			// Ensure base logger and environment reflect this service as "bluebot"
			logger.setServiceName('bluebot');
			process.env.SERVICE_NAME = 'bluebot';
			if (!process.env.CONTAINER_NAME) {
				process.env.CONTAINER_NAME = 'bluebot';
			}

			// Validate environment
			validateEnvironment({
				required: ['STARBUNK_TOKEN'],
				optional: [
					'BLUEBOT_TOKEN',
					'REDIS_HOST',
					'REDIS_PORT',
					'REDIS_PASSWORD',
					'REDIS_DB',
					'OPENAI_API_KEY',
					'DEBUG_MODE',
					'NODE_ENV',
				],
			});

			// Create Discord client
			const token = process.env.BLUEBOT_TOKEN || process.env.STARBUNK_TOKEN;
			if (!token) {
				throw new Error('BLUEBOT_TOKEN or STARBUNK_TOKEN environment variable is required');
			}

			this.client = createDiscordClient(ClientConfigs.BlueBot);

			// Initialize webhook manager
			this.webhookManager = new WebhookManager(this.client);
			container.register(ServiceId.WebhookService, this.webhookManager);

			// Initialize message filter
			this.messageFilter = getMessageFilter();

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
			const diagnostics = new StartupDiagnostics();
			const results = await diagnostics.runAllChecks();

			const hasFailures = results.some((r: { status: string }) => r.status !== 'success');
			if (hasFailures) {
				logger.warn('[BlueBot] Startup diagnostics had some failures:', results);
			} else {
				logger.info('[BlueBot] All startup diagnostics passed');
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
		const messageContext = {
			serverId: message.guildId || undefined,
			channelId: message.channel.id,
			userId: message.author.id,
			username: message.author.username,
			content: message.content,
		};

		const filterResult = this.messageFilter.shouldProcessMessage(messageContext);
		if (!filterResult.allowed) {
			return;
		}

		// Check triggers
		const triggerResult = await this.triggers.checkAllTriggers(message);

		if (triggerResult.shouldRespond && triggerResult.response) {
			// Send response via webhook
			await this.webhookManager.sendMessage(message.channel.id, {
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
				res.end(
					JSON.stringify({
						status: 'healthy',
						service: 'bluebot',
						uptime: process.uptime(),
						timestamp: new Date().toISOString(),
					}),
				);
			} else if (req.url === '/metrics') {
				const metricsService = this.observability?.metrics;
				if (metricsService) {
					const metrics = metricsService.getPrometheusMetrics();
					res.writeHead(200, {
						'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
					});
					res.end(metrics);
				} else {
					res.writeHead(503, { 'Content-Type': 'text/plain' });
					res.end('# BlueBot metrics service not available\n');
				}
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

		// Gracefully shut down observability stack (if initialized)
		try {
			await shutdownObservability();
		} catch (error) {
			logger.warn('[BlueBot] Error during observability shutdown:', ensureError(error as Error));
		}

		logger.info('[BlueBot] Shutdown complete');
	}
}

// Main execution
async function main(): Promise<void> {
	// In CI smoke mode, start a minimal health server and skip Discord login
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('[BlueBot] CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
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
			logger.info(`[BlueBot] [SMOKE] Health server listening on port ${port}`);
		});

		const shutdown = (signal: string) => {
			logger.info(`[BlueBot] [SMOKE] Received ${signal}, shutting down health server...`);
			server.close(() => process.exit(0));
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));

		return;
	}

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

	process.on('unhandledRejection', (reason) => {
		logger.error('[BlueBot] Unhandled rejection, reason:', ensureError(reason as Error));
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
