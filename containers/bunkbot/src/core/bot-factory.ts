import { BotIdentity } from '../../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { createReplyBot, ReplyBotImpl } from './bot-builder';

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
}
