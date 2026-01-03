import {
	logger,
	container,
	ServiceId,
	createDiscordClient,
	ClientConfigs,
	WebhookManager,
	getMessageFilter,
	MessageFilter,
	runStartupDiagnostics,
	validateEnvironment,
	ensureError,
	DiscordService,
	type DiagnosticResult,
} from '@starbunk/shared';
import { Client } from 'discord.js';
import { validateAndParseConfig, getSanitizedConfig, BunkBotConfig } from '../config/validation';

export class ServiceManager {
	private static instance?: ServiceManager;
	private client?: Client;
	private webhookManager?: WebhookManager;
	private messageFilter?: MessageFilter;
	private initialized = false;
	private config?: BunkBotConfig;

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

		try {
			// Step 1: Validate configuration first
			this.config = validateAndParseConfig();
			logger.info('📋 Configuration loaded and validated', getSanitizedConfig(this.config));

			// Step 2: Run diagnostics
			await this.runDiagnostics();

			// Step 3: Legacy environment validation (for backwards compatibility)
			this.validateEnvironment();

			// Step 4: Initialize services with validated config
			await this.initializeServices();

			this.initialized = true;
			logger.info('✅ ServiceManager initialized successfully');
		} catch (error) {
			const processedError = ensureError(error);
			logger.error('❌ ServiceManager initialization failed:', processedError);
			throw new Error(`ServiceManager initialization failed: ${processedError.message}`);
		}
	}

	private async runDiagnostics(): Promise<void> {
		try {
			const diagnostics = await runStartupDiagnostics();
			const failures = diagnostics.filter((d: DiagnosticResult) => d.status === 'fail');
			const warnings = diagnostics.filter((d: DiagnosticResult) => d.status === 'warn');

			if (warnings.length > 0) {
				logger.warn('⚠️ Non-critical startup issues detected:');
				warnings.forEach((warning: DiagnosticResult) => {
					logger.warn(`  - ${warning.check}: ${warning.message}`);
				});
			}

			if (failures.length > 0) {
				logger.error('❌ Critical startup issues detected:');
				failures.forEach((failure: DiagnosticResult) => {
					logger.error(`  - ${failure.check}: ${failure.message}`);
				});

				// Check if failures are truly critical or can be handled gracefully
				const criticalFailures = failures.filter((f: DiagnosticResult & { critical?: boolean }) => {
					const crit = f.critical;
					return crit !== false && !this.canGracefullyHandle(f.check);
				});

				if (criticalFailures.length > 0) {
					throw new Error(`Startup failed due to ${criticalFailures.length} critical issues`);
				} else {
					logger.warn(`Starting with ${failures.length} non-critical issues - some features may be disabled`);
				}
			}
		} catch (error) {
			// If diagnostics themselves fail, log and continue with degraded functionality
			logger.error('Failed to run startup diagnostics:', ensureError(error));
			logger.warn('Continuing startup with unknown system state - monitoring recommended');
		}
	}

	private canGracefullyHandle(checkName: string): boolean {
		// Define which failures can be handled gracefully
		const gracefullyHandleable = [
			'optional_service_connectivity',
			'non_critical_database_connection',
			'optional_webhook_validation',
			'performance_optimization_checks',
		];

		return gracefullyHandleable.includes(checkName);
	}

	private validateEnvironment(): void {
		// Check for any valid token (BUNKBOT_TOKEN, STARBUNK_TOKEN, or DISCORD_TOKEN)
		const hasValidToken = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN || process.env.DISCORD_TOKEN;

		if (!hasValidToken) {
			throw new Error(
				'Missing required Discord token. Please set BUNKBOT_TOKEN, STARBUNK_TOKEN, or DISCORD_TOKEN environment variable.',
			);
		}

		validateEnvironment({
			required: [],
			optional: ['DATABASE_URL', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV'],
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

		const discordService = new DiscordService(this.client!);
		container.register(ServiceId.DiscordService, discordService);

		logger.debug('Discord services registered');
	}

	private initializeWebhookManager(): void {
		this.webhookManager = new WebhookManager(this.client!);
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

	getConfig(): BunkBotConfig {
		if (!this.config) {
			throw new Error('ServiceManager not initialized - configuration not available');
		}
		return this.config;
	}
}
