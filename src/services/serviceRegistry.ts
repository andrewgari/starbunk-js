/**
 * Registry of all service identifiers for type-safe dependency injection
 */
export class ServiceRegistry {
	// Logger services
	static readonly LOGGER = 'logger';
	
	// Webhook services
	static readonly WEBHOOK_SERVICE = 'webhook-service';
	
	// Discord services
	static readonly DISCORD_CLIENT = 'discord-client';
	
	// OpenAI services
	static readonly OPENAI_CLIENT = 'openai-client';
}