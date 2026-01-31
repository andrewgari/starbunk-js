import { Client, GuildMember, Message, TextChannel } from 'discord.js';
import { WebhookService } from './webhook-service';
import { BotIdentity } from '../types/bot-identity';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('DiscordService');

export class DiscordService implements DiscordService {
  private static instance: DiscordService | null = null;

  protected client: Client | null = null;
  protected webhookService: WebhookService | null = null;

  protected constructor() {
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
    logger
      .withMetadata({
        user_id: client.user?.id,
        user_tag: client.user?.tag,
      })
      .info('Discord client set in DiscordService');
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

    logger
      .withMetadata({
        guild_id: guildId,
        member_id: memberId,
      })
      .debug('Fetching guild member');

    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(memberId);

    logger
      .withMetadata({
        guild_id: guildId,
        member_id: memberId,
        member_name: member.user.username,
        member_nickname: member.nickname,
      })
      .debug('Guild member fetched');

    return member;
  }

  async getChannel(channelId: string): Promise<TextChannel> {
    if (!this.client) {
      logger.error('Discord client not initialized');
      throw new Error('Discord client not initialized. Call setClient first.');
    }

    logger.withMetadata({ channel_id: channelId }).debug('Fetching channel');

    const channel = await this.client.channels.fetch(channelId);
    if (!(channel instanceof TextChannel)) {
      logger
        .withMetadata({
          channel_id: channelId,
          channel_type: channel?.type,
        })
        .error('Channel is not a text channel');
      throw new Error(`Channel is not a text channel: ${channelId}`);
    }

    logger
      .withMetadata({
        channel_id: channelId,
        channel_name: channel.name,
      })
      .debug('Channel fetched');

    return channel;
  }

  public async getBotIdentityFromDiscord(guildId: string, memberId: string): Promise<BotIdentity> {
    logger
      .withMetadata({
        guild_id: guildId,
        member_id: memberId,
      })
      .debug('Resolving bot identity from Discord');

    const member = await this.getMemberById(guildId, memberId);
    const identity = {
      botName: member.nickname || member.user.username,
      avatarUrl:
        member.displayAvatarURL({ size: 256, extension: 'png' }) ||
        member.user.displayAvatarURL({ size: 256, extension: 'png' }),
    };

    logger
      .withMetadata({
        guild_id: guildId,
        member_id: memberId,
        bot_name: identity.botName,
      })
      .debug('Bot identity resolved');

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

    logger
      .withMetadata({
        channel_id: message.channelId,
        guild_id: message.guildId,
        bot_name: botIdentity.botName,
        response_length: responseText.length,
      })
      .debug('Sending message with bot identity');

    await this.webhookService.send(message, botIdentity, responseText);

    logger
      .withMetadata({
        channel_id: message.channelId,
        bot_name: botIdentity.botName,
      })
      .debug('Message sent with bot identity');
  }
}
