import { Client } from 'discord.js';
import { OpenAIClient } from '../openai/openaiClient';
import BlueBot from '../starbunk/bots/reply-bots/blueBot';
import webhookService from '../webhooks/webhookService';
import { ILogger } from './logger';
import container from './serviceContainer';
import { getLogger } from './serviceRegistrar';
import { ServiceRegistry } from './serviceRegistry';

/**
 * Registers all core services with the DI container
 */
export function registerCoreServices(): void {
	// Make sure container is clean
	container.clear();

	// Register logger
	container.register(ServiceRegistry.LOGGER, getLogger());

	// Register webhook service
	container.register(ServiceRegistry.WEBHOOK_SERVICE, webhookService);

	// Register OpenAI client with factory to allow for testing
	container.registerFactory(
		ServiceRegistry.OPENAI_CLIENT,
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
	const blueBot = new BlueBot(
		container.get<ILogger>(ServiceRegistry.LOGGER)!
	);

	// You could also manually register bots
	container.register('blue-bot', blueBot);
}

/**
 * Registers a Discord client with the container
 */
export function registerDiscordClient(client: Client): void {
	container.register(ServiceRegistry.DISCORD_CLIENT, client);
}

/**
 * Bootstraps the entire application, registering all services
 * @param client The Discord client instance
 */
export function bootstrapApplication(client: Client): void {
	registerCoreServices();
	registerDiscordClient(client);
	registerBotServices();
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
