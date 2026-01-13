import { Client, GuildMember, Message, TextChannel } from 'discord.js';
import { WebhookService } from './webhook-service';
import { BotIdentity } from '@/reply-bots/models/bot-identity';
import { logger } from '@/observability/logger';

export class DiscordService implements DiscordService {
  private static instance: DiscordService | null = null;

	private client: Client | null = null;
	private webhookService: WebhookService | null = null;

	private constructor() {
		// Don't create client here - it will be set via setClient
		logger.debug('DiscordService instance created');
	}

  static getInstance() {
    if (!DiscordService.instance) {
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  public setClient(client: Client): void {
    this.client = client;
    this.webhookService = new WebhookService(this.client);
    logger.info('Discord client set in DiscordService', {
      user_id: client.user?.id,
      user_tag: client.user?.tag,
    });
  }

  getClient(): Client {
    if (!this.client) {
      logger.error('Discord client not initialized');
      throw new Error('Discord client not initialized. Call setClient first.');
    }
    return this.client;
  }

  getWebhookService(): WebhookService {
    if (!this.webhookService) {
      logger.error('Webhook service not initialized');
      throw new Error('Webhook service not initialized. Call setClient first.');
    }
    return this.webhookService;
  }

  async getMemberById(guildId: string, memberId: string): Promise<GuildMember> {
    if (!this.client) {
      logger.error('Discord client not initialized');
      throw new Error('Discord client not initialized. Call setClient first.');
    }

    logger.debug('Fetching guild member', {
      guild_id: guildId,
      member_id: memberId,
    });

    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(memberId);

    logger.debug('Guild member fetched', {
      guild_id: guildId,
      member_id: memberId,
      member_name: member.user.username,
      member_nickname: member.nickname,
    });

    return member;
  }

  async getChannel(channelId: string): Promise<TextChannel> {
    if (!this.client) {
      logger.error('Discord client not initialized');
      throw new Error('Discord client not initialized. Call setClient first.');
    }

    logger.debug('Fetching channel', { channel_id: channelId });

    const channel = await this.client.channels.fetch(channelId);
    if (!(channel instanceof TextChannel)) {
      logger.error('Channel is not a text channel', undefined, {
        channel_id: channelId,
        channel_type: channel?.type,
      });
      throw new Error(`Channel is not a text channel: ${channelId}`);
    }

    logger.debug('Channel fetched', {
      channel_id: channelId,
      channel_name: channel.name,
    });

    return channel;
  }

  public async getBotIdentityFromDiscord(guildId: string, memberId: string): Promise<BotIdentity> {
    logger.debug('Resolving bot identity from Discord', {
      guild_id: guildId,
      member_id: memberId,
    });

    const member = await this.getMemberById(guildId, memberId);
    const identity = {
      botName: member.nickname || member.user.username,
      avatarUrl: member.displayAvatarURL({ size: 256, extension: 'png' }) ||
        member.user.displayAvatarURL({ size: 256, extension: 'png' }),
    };

    logger.debug('Bot identity resolved', {
      guild_id: guildId,
      member_id: memberId,
      bot_name: identity.botName,
    });

    return identity;
  }

  public async sendMessageWithBotIdentity(
    message: Message,
    botIdentity: BotIdentity,
    responseText: string,
  ): Promise<void> {
    if (!this.webhookService) {
      logger.error('Webhook service not initialized');
      throw new Error('Webhook service not initialized. Call setClient first.');
    }

    logger.debug('Sending message with bot identity', {
      channel_id: message.channelId,
      guild_id: message.guildId,
      bot_name: botIdentity.botName,
      response_length: responseText.length,
    });

    await this.webhookService.send(message, botIdentity, responseText);

    logger.debug('Message sent with bot identity', {
      channel_id: message.channelId,
      bot_name: botIdentity.botName,
    });
  }
}
