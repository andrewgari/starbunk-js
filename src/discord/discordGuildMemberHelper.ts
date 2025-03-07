import { Guild, GuildMember, User } from "discord.js";
import { BotIdentity } from "../starbunk/bots/botIdentity";

export async function getCurrentMemberIdentity(userId: string, guild: Guild): Promise<BotIdentity | undefined> {
	const member: GuildMember | User | undefined =
		await guild.members.fetch(userId) ?? await guild.client.users.fetch(userId);
	if (member) {
		return {
			userId: member.id,
			avatarUrl: member.displayAvatarURL() ?? member.avatarURL,
			botName: member.displayName ?? member.user.username
		};

	}
	return undefined;
}
