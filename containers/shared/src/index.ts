// Shared utilities and services for all containers
export { logger } from './services/logger';
export { ensureError } from './utils/errorUtils';
export { validateEnvironment, getDebugMode, getTestingServerIds, getTestingChannelIds } from './utils/envValidation';
export { isDebugMode, setDebugMode } from './environment';
export { createDiscordClient, ClientConfigs } from './discord/clientFactory';
export { WebhookManager } from './services/webhookManager';
export { MessageFilter, getMessageFilter, resetMessageFilter } from './services/messageFilter';
export type { MessageContext, FilterResult } from './services/messageFilter';

// Bootstrap functions and service getters
export {
	bootstrapApplication,
	bootstrapSnowbunkApplication,
	getLogger,
	getDiscordClient,
	getDiscordService,
	getDiscordGMService,
	getLLMManager,
	getWebhookService
} from './services/bootstrap';

// Simple dependency injection container
export class Container {
	private services = new Map<string, any>();

	register<T>(id: string, service: T): void {
		this.services.set(id, service);
	}

	get<T>(id: string): T {
		const service = this.services.get(id);
		if (!service) {
			throw new Error(`Service ${id} not found in container`);
		}
		return service;
	}

	has(id: string): boolean {
		return this.services.has(id);
	}
}

export const container = new Container();

// Service IDs
export const ServiceId = {
	Logger: 'Logger',
	DiscordClient: 'DiscordClient',
	WebhookService: 'WebhookService',
	DatabaseService: 'DatabaseService',
	LLMManager: 'LLMManager',
	MessageFilter: 'MessageFilter'
} as const;
