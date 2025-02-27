import { Message } from 'discord.js';
import { BotIdentity } from '../botTypes';

/**
 * Dynamic identity updater for BluBot
 * @param defaultAvatar The default avatar URL
 * @param cheekyAvatar The cheeky avatar URL
 * @param murderAvatar The murder avatar URL
 * @returns A function that updates the bot's identity based on the message
 */
export function createBluBotIdentityUpdater(
	defaultAvatar: string,
	cheekyAvatar: string,
	murderAvatar: string
): (message: Message) => Promise<BotIdentity> {
	return async (message: Message): Promise<BotIdentity> => {
		const identity: BotIdentity = {
			name: 'BluBot',
			avatarUrl: defaultAvatar
		};

		// Change avatar based on message content
		if (message.content.match(/\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i)) {
			identity.avatarUrl = murderAvatar;
		} else if (
			message.content.match(/\b(yes|no|yep|yeah|(i did)|(you got it)|(sure did))\b/i) ||
			message.content.match(/blue?bot,? say something nice about/i)
		) {
			identity.avatarUrl = cheekyAvatar;
		}

		return identity;
	};
}

/**
 * Creates a dynamic identity updater that changes the avatar based on patterns
 * @param name The bot name
 * @param defaultAvatar The default avatar URL
 * @param avatarPatterns Patterns and corresponding avatar URLs
 * @returns A function that updates the bot's identity based on the message
 */
export function createPatternBasedIdentityUpdater(
	name: string,
	defaultAvatar: string,
	avatarPatterns: Array<{ pattern: RegExp; avatarUrl: string }>
): (message: Message) => Promise<BotIdentity> {
	return async (message: Message): Promise<BotIdentity> => {
		const identity: BotIdentity = {
			name,
			avatarUrl: defaultAvatar
		};

		// Check each pattern and update avatar if matched
		for (const { pattern, avatarUrl } of avatarPatterns) {
			if (pattern.test(message.content)) {
				identity.avatarUrl = avatarUrl;
				break;
			}
		}

		return identity;
	};
}
