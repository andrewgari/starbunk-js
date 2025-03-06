import { Guild, GuildMember, User } from "discord.js";
import { BotIdentity } from "../starbunk/bots/botIdentity";

export async function getCurrentMemberIdentity(userID: string, guild: Guild): Promise<BotIdentity | undefined> {
	const member: GuildMember | User | undefined =
		await guild.members.fetch(userID) ?? await guild.client.users.fetch(userID);
	if (member) {
		return {
			userId: member.id,
			avatarUrl: member.displayAvatarURL() ?? member.avatarURL,
			botName: member.displayName ?? member.user.username
		};

	}
	return undefined;
}
