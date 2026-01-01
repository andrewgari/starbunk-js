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
	respondsToBots?: boolean; // If true, only responds to bot messages; if false/undefined, only responds to humans
	responseChance?: number; // 0-100 probability of responding after all other filters pass
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

// Re-export message filter creator for reference in custom filters
export { createDefaultMessageFilter } from './bot-builder';
