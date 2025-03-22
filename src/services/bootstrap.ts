import { Client } from 'discord.js';
import { WebhookService as WebhookServiceImpl } from '../webhooks/webhookService';
import { ServiceId, container } from './container';
import { DiscordService } from './discordService';
import { LLMManager, LLMProviderType } from './llm';
import { Logger } from './logger';

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

		// Register WebhookService
		const webhookService = new WebhookServiceImpl(logger);
		container.register(
			ServiceId.WebhookService,
			webhookService
		);

		// Initialize and register DiscordService singleton
		const discordService = DiscordService.initialize(client, webhookService);
		container.register(
			ServiceId.DiscordService,
			discordService
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

export function getWebhookService(): WebhookServiceImpl {
	return container.get<WebhookServiceImpl>(ServiceId.WebhookService);
}

export function getDiscordService(): DiscordService {
	return container.get<DiscordService>(ServiceId.DiscordService);
}

export const getLLMManager = (): LLMManager | null => {
	try {
		const llmManager = container.get<LLMManager>(ServiceId.LLMManager);
		return llmManager;
	} catch (error) {
		console.warn(`LLM Manager service not available: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
};
