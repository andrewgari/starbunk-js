import { Message } from 'discord.js';

export interface MessageHandler {
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<void>;
}

export abstract class BaseMessageHandler implements MessageHandler {
  abstract canHandle(message: Message): boolean;
  abstract handle(message: Message): Promise<void>;

  protected isFromBot(message: Message): boolean {
    return message.author.bot;
  }
}
