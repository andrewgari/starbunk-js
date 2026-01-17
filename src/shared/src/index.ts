// Shared utilities and services for all containers

// Core logger
export { logLayer } from './observability/log-layer';

// LogLayer mixins for structured logging
export {
	discordContextMixin,
	performanceMixin,
	botContextMixin,
	registerStarbunkMixins,
} from './observability/mixins';
export type {
	DiscordMessageContext,
	IDiscordContextMixin,
	PerformanceContext,
	IPerformanceMixin,
	BotContext,
	IBotContextMixin,
} from './observability/mixins';

// Types
export type { BotIdentity } from './types/bot-identity';

// Discord services
export { DiscordService } from './discord/discord-service';
export { WebhookService } from './discord/webhook-service';
