import { BotIdentity } from '@/reply-bots/models/bot-identity';
import { GetBotIdentityOptions } from '@/reply-bots/identity/get-identity-options';
import { GuildMember } from 'discord.js';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { logger } from '@/observability/logger';

export async function getBotIdentityFromDiscord(
  options: GetBotIdentityOptions,
): Promise<BotIdentity> {
  const { userId, message, useRandomMember, fallbackName = 'BunkBot' } = options;

  if (!message || !message.guild) {
    throw new Error('Message and guild are required');
  }

  let member: GuildMember | null = null;

  try {
    if (useRandomMember) {
      const members = await message.guild.members.fetch();
      const humanMembers = members.filter(m => !m.user.bot);
      member = humanMembers.random() || null;
    } else if (userId) {
      member = await DiscordService.getInstance().getMemberById(message.guild.id, userId);
    }

    if (!member) {
      throw new Error('No member found');
    }

    return {
      botName: member.nickname || member.user.username,
      avatarUrl:
        member.displayAvatarURL({ size: 256, extension: 'png' }) ||
        member.user.displayAvatarURL({ size: 256, extension: 'png' }),
    };
  } catch (error) {
    logger
      .withError(error)
      .withMetadata({
        user_id: userId,
        use_random: useRandomMember,
      })
      .error('Error fetching member for bot identity');
  }

  return {
    botName: fallbackName,
    avatarUrl: '',
  };
}
