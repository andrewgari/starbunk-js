import { Client } from 'discord.js';
import { OpenAIClient } from '../openai/openaiClient';
import BlueBot from '../starbunk/bots/reply-bots/blueBot';
import webhookService, { IWebhookService } from '../webhooks/webhookService';
import { logger } from './logger';
import container from './serviceContainer';
import { getLogger } from './serviceRegistrar';
import { serviceRegistry } from './serviceRegistry';

/**
 * Registers all core services with the DI container
 */
export function registerCoreServices(): void {
	// Make sure container is clean
	container.clear();

	// Register logger
	container.register(serviceRegistry.LOGGER, getLogger());

	// Register webhook service
	container.register(serviceRegistry.WEBHOOK_SERVICE, webhookService);

	// Register OpenAI client with factory to allow for testing
	container.registerFactory(
		serviceRegistry.OPENAI_CLIENT,
		() => OpenAIClient,
		'singleton'
	);
}

/**
 * Registers all bot services with the DI container
 */
export function registerBotServices(): void {
	// The decorator will handle registration, but we need to import them
	// to ensure the decorators run
	// In a production app, we'd use a dynamic import system
	const blueBot = new BlueBot();

	// You could also manually register bots
	container.register(serviceRegistry.BLUE_BOT, blueBot);
}

/**
 * Registers a Discord client with the container
 */
export function registerDiscordClient(client: Client): void {
	container.register(serviceRegistry.DISCORD_CLIENT, client);
}

/**
 * Bootstraps the entire application, registering all services
 * @param client The Discord client instance
 */
export async function bootstrapApplication(client: Client): Promise<void> {
	try {
		registerCoreServices();
		registerDiscordClient(client);
		registerBotServices();

		logger.info('🚀 Services bootstrapped successfully');
	} catch (error) {
		logger.error('Failed to bootstrap services', error as Error);
		throw error;
	}
}

/**
 * Type-safe way to get a service that's required at runtime
 * This throws an error if the service is not found, making it
 * safer than direct container.get() which returns undefined
 */
export function getRequiredService<T>(key: string): T {
	const service = container.get<T>(key);
	if (!service) {
		throw new Error(`Required service ${key} not found in container`);
	}
	return service;
}

export function getWebhookService(): IWebhookService | undefined {
	return container.get<IWebhookService>(serviceRegistry.WEBHOOK_SERVICE);
}

export function getBlueBot(): BlueBot | undefined {
	return container.get<BlueBot>(serviceRegistry.BLUE_BOT);
}
