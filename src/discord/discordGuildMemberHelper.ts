import { BotIdentity } from "@/starbunk/types/botIdentity";
import { Guild, GuildMember, User } from "discord.js";
import { getService, Logger, ServiceId } from "../services/services";

const logger = getService<Logger>(ServiceId.Logger);

export async function getCurrentMemberIdentity(userId: string, guild: Guild): Promise<BotIdentity | undefined> {
	const member: GuildMember | User | undefined =
		await guild.members.fetch(userId) ?? await guild.client.users.fetch(userId);
	if (member) {
		return {
			avatarUrl: member.displayAvatarURL() ?? member.avatarURL,
			botName: member.displayName ?? member.user.username
		};

	}
	return undefined;
}

/**
 * Gets a random guild member excluding the specified user ID
 */
export async function getRandomMemberExcept(guild: Guild, excludeUserId: string): Promise<GuildMember | null> {
	try {
		// Fetch all members
		const members = await guild.members.fetch();

		// Filter out bots and the excluded user
		const eligibleMembers = members.filter(
			member => !member.user.bot && member.id !== excludeUserId
		);

		if (eligibleMembers.size === 0) return null;

		// Convert to array and pick a random member
		const membersArray = Array.from(eligibleMembers.values());
		const randomIndex = Math.floor(Math.random() * membersArray.length);

		return membersArray[randomIndex];
	} catch (error) {
		logger.error(`Failed to get random member: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}
