import { Message, TextChannel, WebhookMessageCreateOptions } from 'discord.js';
import webhookService from '../../webhooks/webhookService';

export interface BotMessageOptions extends WebhookMessageCreateOptions {
  content: string;
}

export default class ReplyBot {
  public async handleMessage(message: Message): Promise<string | undefined> {
    if (message.author.bot) {
      return undefined;
    }

    if (message.content.startsWith('!help')) {
      return 'Available commands: !help';
    }

    return undefined;
  }

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
