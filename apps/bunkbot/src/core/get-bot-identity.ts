import { container, ServiceId, logger } from '@starbunk/shared';
import { DiscordService } from '@starbunk/shared/dist/services/discordService';
import { BotIdentity } from '../types/botIdentity';
import { Message } from 'discord.js';

interface GetBotIdentityOptions {
	userId?: string;
	fallbackName: string;
	useRandomMember?: boolean;
	message?: Message; // For server context
	forceRefresh?: boolean; // Force fresh data from Discord API
}

/**
 * Gets a bot's identity from Discord with proper error handling
 * Now supports server-specific nicknames and avatars
 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
 */
export async function getBotIdentityFromDiscord({
	userId,
	fallbackName,
	useRandomMember = false,
	message,
	forceRefresh = false,
}: GetBotIdentityOptions): Promise<BotIdentity | null> {
	try {
		// Get the Discord service from the container
		const discordService = container.get<DiscordService>(ServiceId.DiscordService);

		let identity: BotIdentity;

		if (useRandomMember) {
			logger.debug(`Getting random member identity for ${fallbackName}`);
			identity = await discordService.getRandomMemberAsBotIdentity();
		} else if (userId) {
			const guildId = message?.guild?.id;
			logger.debug(
				`Getting Discord identity for user ${userId} (${fallbackName}) in guild ${guildId || 'default'}`,
			);

			if (guildId && message) {
				// Get server-specific identity
				const serverIdentity = await getServerSpecificIdentity(
					discordService,
					userId,
					guildId,
					fallbackName,
					forceRefresh,
				);
				if (!serverIdentity) {
					return null; // Server-specific identity failed
				}
				identity = serverIdentity;
			} else {
				// Fallback to old method for backward compatibility
				identity = await discordService.getMemberAsBotIdentity(userId, forceRefresh);
			}
		} else {
			throw new Error('Either userId or useRandomMember must be provided');
		}

		// Validate identity
		if (!identity || !identity.botName || !identity.avatarUrl) {
			throw new Error(
				`Invalid bot identity retrieved${userId ? ` for user ID: ${userId}` : ' from random member'}`,
			);
		}

		logger.debug(`Successfully retrieved Discord identity: ${identity.botName} with avatar ${identity.avatarUrl}`);
		return identity;
	} catch (error) {
		logger.error(
			`Error getting bot identity from Discord${userId ? ` for user ID ${userId}` : ''}:`,
			error instanceof Error ? error : new Error(String(error)),
		);

		// No fallback - return null to indicate complete failure
		logger.debug(`Identity resolution failed for ${fallbackName}, returning null`);
		return null;
	}
}

/**
 * Get server-specific identity with proper nickname and avatar resolution
 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
 */
async function getServerSpecificIdentity(
	discordService: DiscordService,
	userId: string,
	guildId: string,
	fallbackName: string,
	forceRefresh: boolean = false,
): Promise<BotIdentity | null> {
	try {
		// Get the guild member (server-specific data)
		const member = await discordService.getMemberAsync(guildId, userId);

		if (!member) {
			throw new Error(`Member ${userId} not found in guild ${guildId}`);
		}

		// Get server-specific nickname (falls back to username)
		// Priority: Server nickname > Global display name > Username
		const botName = member.nickname || member.user.globalName || member.user.username || fallbackName;

		// Get server-specific avatar (falls back to global avatar)
		// Priority: Server avatar > Global avatar
		// If no valid avatar is found, return null to indicate failure
		const avatarUrl =
			member.displayAvatarURL({ size: 256, extension: 'png' }) ||
			member.user.displayAvatarURL({ size: 256, extension: 'png' });

		if (!avatarUrl) {
			throw new Error(`No valid avatar URL found for user ${userId} in guild ${guildId}`);
		}

		logger.debug(
			`[getBotIdentity] Server-specific identity for ${userId} in ${guildId}: "${botName}" with avatar ${avatarUrl}`,
		);

		return {
			botName,
			avatarUrl,
		};
	} catch (error) {
		logger.error(`Failed to get server-specific identity for ${userId} in ${guildId}:`, error as Error);

		// Try fallback to the old method as last resort
		try {
			const discordService = container.get<DiscordService>(ServiceId.DiscordService);
			return await discordService.getMemberAsBotIdentity(userId, forceRefresh);
		} catch (fallbackError) {
			logger.error(`Fallback identity resolution also failed for ${userId}:`, fallbackError as Error);
			return null; // Complete failure
		}
	}
}
