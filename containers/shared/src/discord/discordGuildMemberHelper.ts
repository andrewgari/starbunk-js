import { Guild, GuildMember } from "discord.js";
import { getService, Logger, ServiceId } from "../services/container";

const logger = getService<Logger>(ServiceId.Logger);
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
