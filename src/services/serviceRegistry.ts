/**
 * Registry of all service identifiers for type-safe dependency injection
 */
export const serviceRegistry = {
	LOGGER: 'logger',
	WEBHOOK_SERVICE: 'webhook-service',
	DISCORD_CLIENT: 'discord-client',
	BLUE_BOT: 'blue-bot',
	OPENAI_CLIENT: 'openai-client',
} as const;
