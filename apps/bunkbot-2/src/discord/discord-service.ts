import { Client, GuildMember, Message, TextChannel } from 'discord.js';
import { WebhookService } from './webhook-service';
import { BotIdentity } from '@/reply-bots/models/bot-identity';

export class DiscordService implements DiscordService {
  private static instance: DiscordService | null = null;

	private client: Client | null = null;
	private webhookService: WebhookService | null = null;

	private constructor() {
		// Don't create client here - it will be set via setClient
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
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Discord client not initialized. Call setClient first.');
    }
    return this.client;
  }

  getWebhookService(): WebhookService {
    if (!this.webhookService) {
      throw new Error('Webhook service not initialized. Call setClient first.');
    }
    return this.webhookService;
  }

  async getMemberById(guildId: string, memberId: string): Promise<GuildMember> {
    if (!this.client) {
      throw new Error('Discord client not initialized. Call setClient first.');
    }
    const guild = await this.client.guilds.fetch(guildId);
    return await guild.members.fetch(memberId);
  }

  async getChannel(channelId: string): Promise<TextChannel> {
    if (!this.client) {
      throw new Error('Discord client not initialized. Call setClient first.');
    }
    const channel = await this.client.channels.fetch(channelId);
    if (!(channel instanceof TextChannel)) {
      throw new Error(`Channel is not a text channel: ${channelId}`);
    }
    return channel;
  }

  public async getBotIdentityFromDiscord(guildId: string, memberId: string): Promise<BotIdentity> {
    const member = await this.getMemberById(guildId, memberId);
    return {
      botName: member.nickname || member.user.username,
      avatarUrl: member.displayAvatarURL({ size: 256, extension: 'png' }) ||
        member.user.displayAvatarURL({ size: 256, extension: 'png' }),
    };
  }

  public async sendMessageWithBotIdentity(
    message: Message,
    botIdentity: BotIdentity,
    responseText: string,
  ): Promise<void> {
    if (!this.webhookService) {
      throw new Error('Webhook service not initialized. Call setClient first.');
    }
    await this.webhookService.send(message, botIdentity, responseText);
  }
}
