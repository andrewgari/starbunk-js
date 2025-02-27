/**
 * Utility functions for Discord text formatting
 */

/**
 * Converts a user ID to a Discord user mention format
 * @param userId The Discord user ID to format
 * @returns A string in the format <@userId> that Discord will render as a user mention
 */
export function formatUserMention(userId: string): string {
	return `<@${userId}>`;
}

/**
 * Extracts a user ID from a Discord user mention
 * @param mention A Discord user mention in the format <@userId> or <@!userId>
 * @returns The extracted user ID, or null if the input is not a valid mention
 */
export function extractUserIdFromMention(mention: string): string | null {
	// Match both normal mentions <@123456> and nickname mentions <@!123456>
	const match = mention.match(/^<@!?(\d+)>$/);
	return match ? match[1] : null;
}

/**
 * Converts a role ID to a Discord role mention format
 * @param roleId The Discord role ID to format
 * @returns A string in the format <@&roleId> that Discord will render as a role mention
 */
export function formatRoleMention(roleId: string): string {
	return `<@&${roleId}>`;
}

/**
 * Extracts a role ID from a Discord role mention
 * @param mention A Discord role mention in the format <@&roleId>
 * @returns The extracted role ID, or null if the input is not a valid mention
 */
export function extractRoleIdFromMention(mention: string): string | null {
	const match = mention.match(/^<@&(\d+)>$/);
	return match ? match[1] : null;
}

/**
 * Converts a channel ID to a Discord channel mention format
 * @param channelId The Discord channel ID to format
 * @returns A string in the format <#channelId> that Discord will render as a channel mention
 */
export function formatChannelMention(channelId: string): string {
	return `<#${channelId}>`;
}

/**
 * Extracts a channel ID from a Discord channel mention
 * @param mention A Discord channel mention in the format <#channelId>
 * @returns The extracted channel ID, or null if the input is not a valid mention
 */
export function extractChannelIdFromMention(mention: string): string | null {
	const match = mention.match(/^<#(\d+)>$/);
	return match ? match[1] : null;
}
