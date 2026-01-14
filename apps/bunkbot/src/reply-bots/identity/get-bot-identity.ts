import { BotIdentity } from '@/reply-bots/models/bot-identity';
import { GetBotIdentityOptions } from './get-identity-options';
import { GuildMember } from 'discord.js';
import { DiscordService } from '@/discord/discord-service';

export async function getBotIdentityFromDiscord(options: GetBotIdentityOptions): Promise<BotIdentity> {
  const { userId, message, useRandomMember, fallbackName = 'BunkBot' } = options;

  if(!message || !message.guild) {
    throw new Error('Message and guild are required');
  }

  let member: GuildMember | null = null;

  try {
    if (useRandomMember) {
      const members = await message.guild.members.fetch();
      const humanMembers = members.filter(m => !m.user.bot)
      member = humanMembers.random() || null;
    } else if (userId) {
      member = await DiscordService.getInstance().getMemberById(message.guild.id, userId);
    }

    if (!member) {
      throw new Error('No member found');
    }

    return {
      botName: member.nickname || member.user.username,
      avatarUrl: member.displayAvatarURL({ size: 256, extension: 'png' }) ||
        member.user.displayAvatarURL({ size: 256, extension: 'png' }),
    };

  } catch (error) {
    console.error('Error fetching member:', error);
  }

  return {
    botName: fallbackName,
    avatarUrl: '',
  };
}
