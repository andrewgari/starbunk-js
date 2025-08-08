import { logger, container, ServiceId, createDiscordClient, ClientConfigs, WebhookManager, getMessageFilter, MessageFilter, runStartupDiagnostics, validateEnvironment } from '@starbunk/shared';
import { DiscordService } from '@starbunk/shared/dist/services/discordService';
import { Client } from 'discord.js';

export class ServiceManager {
	private static instance?: ServiceManager;
	private client?: Client;
	private webhookManager?: WebhookManager;
	private messageFilter?: MessageFilter;
	private initialized = false;

	static getInstance(): ServiceManager {
		if (!ServiceManager.instance) {
			ServiceManager.instance = new ServiceManager();
		}
		return ServiceManager.instance;
	}

	static reset(): void {
		ServiceManager.instance = undefined;
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		await this.runDiagnostics();
		this.validateEnvironment();
		await this.initializeServices();
		
		this.initialized = true;
		logger.info('✅ ServiceManager initialized successfully');
	}

	private async runDiagnostics(): Promise<void> {
		const diagnostics = await runStartupDiagnostics();
		const failures = diagnostics.filter(d => d.status === 'fail');

		if (failures.length > 0) {
			logger.error('❌ Critical startup issues detected:');
			failures.forEach(failure => {
				logger.error(`  - ${failure.check}: ${failure.message}`);
			});
			throw new Error(`Startup failed due to ${failures.length} critical issues`);
		}
	}

	private validateEnvironment(): void {
		// Check for any valid token (BUNKBOT_TOKEN, STARBUNK_TOKEN, or DISCORD_TOKEN)
		const hasValidToken = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN || process.env.DISCORD_TOKEN;
		
		if (!hasValidToken) {
			throw new Error('Missing required Discord token. Please set BUNKBOT_TOKEN, STARBUNK_TOKEN, or DISCORD_TOKEN environment variable.');
		}

		validateEnvironment({
			required: [],
			optional: ['DATABASE_URL', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV']
		});
	}

	private async initializeServices(): Promise<void> {
		this.client = createDiscordClient(ClientConfigs.BunkBot);
		
		this.registerDiscordServices();
		this.initializeWebhookManager();
		this.initializeMessageFilter();
		
		logger.info('Core services initialized');
	}

	private registerDiscordServices(): void {
		container.register(ServiceId.DiscordClient, this.client);
		
		const discordService = new DiscordService(this.client);
		container.register(ServiceId.DiscordService, discordService);
		
		logger.debug('Discord services registered');
	}

	private initializeWebhookManager(): void {
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);
	}

	private initializeMessageFilter(): void {
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);
	}

	getClient(): Client {
		if (!this.client) {
			throw new Error('ServiceManager not initialized');
		}
		return this.client;
	}

	getMessageFilter(): MessageFilter {
		if (!this.messageFilter) {
			throw new Error('MessageFilter not initialized');
		}
		return this.messageFilter;
	}

	isInitialized(): boolean {
		return this.initialized;
	}
}