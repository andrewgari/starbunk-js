// Minimal shared exports for containers
export { logger } from './services/logger';
export { ensureError } from './utils/errorUtils';

// Simple container for dependency injection
export const container = new Map<string, any>();

// Service IDs
export const ServiceId = {
	Logger: 'Logger',
	DiscordClient: 'DiscordClient',
	WebhookService: 'WebhookService',
	LLMManager: 'LLMManager'
} as const;
