import { GuildMember, Message, User } from 'discord.js';
import { BotIdentity } from '../botTypes';

/**
 * Gets the most up-to-date user identity information from a Message or User/GuildMember
 * Prioritizes server-specific information (nickname, server avatar) over account information
 *
 * @param messageOrUser - The Discord Message, User, or GuildMember to get identity from
 * @returns A BotIdentity object with the user's current name and avatar URL
 */
export async function getUserIdentity(messageOrUser: Message | User | GuildMember): Promise<BotIdentity> {
	// Handle different input types
	if ('author' in messageOrUser) {
		// It's a Message
		const message = messageOrUser;
		const user = message.author;
		const member = message.member;

		// Try to fetch the member if not available
		let guildMember = member;
		if (!guildMember && message.guild) {
			try {
				guildMember = await message.guild.members.fetch(user.id);
			} catch (error) {
				console.warn(`Could not fetch guild member for user ${user.id}:`, error);
			}
		}

		return {
			// Priority: Member nickname > User display name > User username
			name: guildMember?.displayName ?? user.displayName ?? user.username,
			// Priority: Member avatar > User avatar
			avatarUrl: guildMember?.displayAvatarURL() ?? user.displayAvatarURL()
		};
	} else if ('guild' in messageOrUser) {
		// It's a GuildMember
		const member = messageOrUser;
		return {
			name: member.displayName,
			avatarUrl: member.displayAvatarURL()
		};
	} else {
		// It's a User
		const user = messageOrUser;
		return {
			name: user.displayName ?? user.username,
			avatarUrl: user.displayAvatarURL()
		};
	}
}
