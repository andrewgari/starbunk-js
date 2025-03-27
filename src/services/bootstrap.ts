import { Client } from 'discord.js';
import { ServiceId, container } from './container';
import { DiscordService } from './discordService';
import { LLMManager, LLMProviderType } from './llm';
import { Logger } from './logger';
import { WebhookService } from '../webhooks/webhookService';

/**
 * Bootstraps the entire application, registering all services
 * @param client The Discord client instance
 */
export async function bootstrapApplication(client: Client): Promise<void> {
	try {
		// Manually register services instead of relying on decorators
		const logger = new Logger();

		// Register the logger
		container.register(
			ServiceId.Logger,
			logger
		);

		// Register the Discord client
		container.register(
			ServiceId.DiscordClient,
			client
		);

		// Initialize and register DiscordService singleton
		container.register(
			ServiceId.DiscordService,
			DiscordService.initialize(client)
		);

		// Register WebhookService
		container.register(
			ServiceId.WebhookService,
			new WebhookService(logger)
		);

		// Register LLM Manager with Ollama as the default provider
		const llmManager = new LLMManager(logger, LLMProviderType.OLLAMA);
		await llmManager.initializeAllProviders();
		container.register(
			ServiceId.LLMManager,
			llmManager
		);

		logger.info('🚀 Services bootstrapped successfully');
	} catch (error) {
		console.error('Failed to bootstrap services', error);
		throw error;
	}
}

// Helper functions to get services (type-safe)
export function getLogger(): Logger {
	return container.get<Logger>(ServiceId.Logger);
}

export function getDiscordClient(): Client {
	return container.get<Client>(ServiceId.DiscordClient);
}

export function getDiscordService(): DiscordService {
	return container.get<DiscordService>(ServiceId.DiscordService);
}

export function getLLMManager(): LLMManager {
	return container.get<LLMManager>(ServiceId.LLMManager);
}

export function getWebhookService(): any {
	return container.get(ServiceId.WebhookService);
}
