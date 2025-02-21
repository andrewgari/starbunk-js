import { Message, TextChannel, WebhookMessageCreateOptions } from 'discord.js';
import webhookService from '../../webhooks/webhookService';

export interface BotMessageOptions extends WebhookMessageCreateOptions {
  content: string;
}

export default abstract class ReplyBot {
  abstract getBotName(): string;
  abstract getAvatarUrl(): string;
  abstract handleMessage(message: Message): Promise<void>;

  protected async sendReply(channel: TextChannel, response: string): Promise<void> {
    await webhookService.writeMessage(channel, {
      username: this.getBotName(),
      avatarURL: this.getAvatarUrl(),
      content: response,
      embeds: []
    });
  }

  protected isSelf(message: Message): boolean {
    return message.author.bot && message.author.username === this.getBotName();
  }
}
