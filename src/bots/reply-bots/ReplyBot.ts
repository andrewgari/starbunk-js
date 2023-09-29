import { Client, Events, Message, TextChannel } from 'discord.js';
import webhookService from '../../webhooks/WebhookService';

export abstract class ReplyBot {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
    this.client.on(Events.MessageCreate, async (message: Message) => {
      this.handleMessage(message);
    });
  }

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
