import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { createReplyBot, ReplyBotImpl } from './bot-builder';
import { DiscordService, logger } from '@starbunk/shared';

/**
 * Interface for bot configuration
 */
export interface BotConfig {
	name: string;
	description: string;
	defaultIdentity: BotIdentity;
	triggers: TriggerResponse[];
	defaultResponseRate?: number;
	responseRate?: number;
	skipBotMessages?: boolean;
	disabled?: boolean;
	discordService?: DiscordService; // Discord service for sending messages (optional)
}

/**
 * Factory class for creating bots
 */
export class BotFactory {
	/**
	 * Create a reply bot
	 * @param config Bot configuration
	 * @returns A reply bot
	 */
	public static createBot(config: BotConfig): ReplyBotImpl {
		return createReplyBot(config);
	}

	/**
	 * Inject DiscordService into an existing bot
	 * @param bot Bot to inject service into
	 * @param discordService DiscordService instance
	 * @returns Bot with injected service
	 */
	public static injectDiscordService(bot: ReplyBotImpl, discordService: DiscordService): ReplyBotImpl {
		// Create a new bot with the same config but with DiscordService injected
		const originalConfig = (bot as any)._config;
		if (originalConfig) {
			return createReplyBot({
				...originalConfig,
				discordService
			});
		}

		// Fallback: return the original bot if we can't access the config
		logger.warn('[BotFactory] Could not inject DiscordService - bot config not accessible');
		return bot;
	}
}
