import { Client } from 'discord.js';
import { WebhookService as WebhookServiceImpl } from '../webhooks/webhookService';
import { Logger } from './logger';
import { container, ServiceId } from './services';

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
