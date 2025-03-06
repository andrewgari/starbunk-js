import { Guild } from 'discord.js';
import { getCurrentMemberIdentity as getIdentity } from '../../discord/discordGuildMemberHelper';
import { BotIdentity } from '../types/BotIdentity';

export async function getCurrentMemberIdentity(userID: string, guild: Guild): Promise<BotIdentity | undefined> {
	return getIdentity(userID, guild);
}
