import { getDiscordService } from '@starbunk/shared';
import { logger } from '@starbunk/shared';
import { BotIdentity } from '@/starbunk/types/botIdentity';

interface GetBotIdentityOptions {
	userId?: string;
	fallbackName: string;
	fallbackAvatarUrl?: string;
	useRandomMember?: boolean;
}

/**
 * Gets a bot's identity from Discord with proper error handling and fallback
 */
export async function getBotIdentityFromDiscord({
	userId,
	fallbackName,
	fallbackAvatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png',
	useRandomMember = false
}: GetBotIdentityOptions): Promise<BotIdentity> {
	try {
		const discordService = getDiscordService();
		let identity: BotIdentity;

		if (useRandomMember) {
			identity = await discordService.getRandomMemberAsBotIdentity();
		} else if (userId) {
			identity = await discordService.getMemberAsBotIdentity(userId);
		} else {
			throw new Error('Either userId or useRandomMember must be provided');
		}

		// Validate identity
		if (!identity || !identity.botName || !identity.avatarUrl) {
			throw new Error(`Invalid bot identity retrieved${userId ? ` for user ID: ${userId}` : ' from random member'}`);
		}

		return identity;
	} catch (error) {
		logger.error(
			`Error getting bot identity from Discord${userId ? ` for user ID ${userId}` : ''}:`,
			error instanceof Error ? error : new Error(String(error))
		);

		// Fallback to a valid default identity
		return {
			botName: fallbackName,
			avatarUrl: fallbackAvatarUrl
		};
	}
}
