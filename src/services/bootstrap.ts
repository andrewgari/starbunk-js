import { Client } from 'discord.js';
import { WebhookService as WebhookServiceImpl } from '../webhooks/webhookService';
import { container, Logger, ServiceId, ServiceTypes, WebhookService } from './services';

/**
 * Bootstraps the entire application, registering all services
 * @param client The Discord client instance
 */
export async function bootstrapApplication(client: Client): Promise<void> {
	try {
		// Services are auto-registered via decorators
		container.register(
			ServiceId.DiscordClient,
			() => client
		);

		// Ensure the logger is available
		const logger = container.get(ServiceId.Logger);
		if (!isLogger(logger)) {
			throw new Error('Logger service not found or invalid');
		}

		// Ensure WebhookService is registered
		try {
			container.get(ServiceId.WebhookService);
		} catch (error) {
			// If WebhookService is not registered, register it manually
			logger.info('WebhookService not found, registering manually');
			container.register(
				ServiceId.WebhookService,
				() => new WebhookServiceImpl(logger),
				{ scope: 'singleton', dependencies: [ServiceId.Logger] }
			);
		}

		logger.info('🚀 Services bootstrapped successfully');
	} catch (error) {
		const logger = container.get(ServiceId.Logger);
		if (!isLogger(logger)) {
			console.error('Failed to bootstrap services', error);
			return;
		}
		logger.error('Failed to bootstrap services', error as Error);
		throw error;
	}
}

// Helper functions to get services (type-safe)
export function getLogger(): Logger {
	const logger = container.get(ServiceId.Logger);
	if (!isLogger(logger)) {
		throw new Error('Logger service not found or invalid');
	}
	return logger;
}

export function getDiscordClient(): Client {
	const client = container.get(ServiceId.DiscordClient);
	if (!isDiscordClient(client)) {
		throw new Error('Discord client not found or invalid');
	}
	return client;
}

export function getWebhookService(): WebhookService {
	const webhookService = container.get(ServiceId.WebhookService);
	if (!isWebhookService(webhookService)) {
		throw new Error('Webhook service not found or invalid');
	}
	return webhookService;
}

/**
 * Type-safe way to get any service
 */
export function getService<K extends keyof ServiceTypes>(id: K): ServiceTypes[K] {
	return container.get(id);
}

function isLogger(service: unknown): service is Logger {
	return service !== null && typeof service === 'object' && 'info' in service && 'error' in service;
}

function isDiscordClient(service: unknown): service is Client {
	return service !== null && typeof service === 'object' && 'login' in service;
}

function isWebhookService(service: unknown): service is WebhookService {
	return service !== null && typeof service === 'object' && 'writeMessage' in service && 'sendMessage' in service;
}
