import { BotIdentity } from '../types/botIdentity';
import { TriggerResponse } from './trigger-response';
import { createReplyBot, ReplyBotImpl } from './bot-builder';
import { DiscordService } from '@starbunk/shared';
import { Message } from 'discord.js';

/**
 * Type for message filtering function
 */
export type MessageFilterFunction = (message: Message) => boolean | Promise<boolean>;

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
	messageFilter?: MessageFilterFunction;
	skipBotMessages?: boolean; // Deprecated - use messageFilter instead
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
}

// Re-export default message filter for reference in custom filters
export { defaultMessageFilter } from './bot-builder';
