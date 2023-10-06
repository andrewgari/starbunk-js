import { Client, Events, Message, TextChannel } from 'discord.js';
import webhookService from '../webhooks/webhookService';

export default abstract class ReplyBot {
  abstract getBotName(): string;
  abstract getAvatarUrl(): string;
  abstract handleMessage(message: Message): void;
  sendReply(channel: TextChannel, response: string): void {
    webhookService.writeMessage(channel, {
      username: this.getBotName(),
      avatarURL: this.getAvatarUrl(),
      content: response,
      embeds: []
    });
  }
}
