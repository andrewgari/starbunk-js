import { container, ServiceId, logger } from '@starbunk/shared';
import { DiscordService } from '@starbunk/shared/dist/services/discordService';
import { BotIdentity } from '../types/botIdentity';

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
		// Get the Discord service from the container
		const discordService = container.get<DiscordService>(ServiceId.DiscordService);

		let identity: BotIdentity;

		if (useRandomMember) {
			logger.debug(`Getting random member identity for ${fallbackName}`);
			identity = await discordService.getRandomMemberAsBotIdentity();
		} else if (userId) {
			logger.debug(`Getting Discord identity for user ${userId} (${fallbackName})`);
			identity = await discordService.getMemberAsBotIdentity(userId);
		} else {
			throw new Error('Either userId or useRandomMember must be provided');
		}

		// Validate identity
		if (!identity || !identity.botName || !identity.avatarUrl) {
			throw new Error(`Invalid bot identity retrieved${userId ? ` for user ID: ${userId}` : ' from random member'}`);
		}

		logger.debug(`Successfully retrieved Discord identity: ${identity.botName} with avatar ${identity.avatarUrl}`);
		return identity;
	} catch (error) {
		logger.error(
			`Error getting bot identity from Discord${userId ? ` for user ID ${userId}` : ''}:`,
			error instanceof Error ? error : new Error(String(error))
		);

		// Fallback to a valid default identity
		logger.debug(`Using fallback identity for ${fallbackName} due to error`);
		return {
			botName: fallbackName,
			avatarUrl: fallbackAvatarUrl
		};
	}
}
