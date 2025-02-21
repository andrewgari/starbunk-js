import { Message } from 'discord.js';
import { Result } from '../../utils/result';

export interface MessageHandler {
  canHandle(message: Message): boolean;
  handle(message: Message): Promise<Result<void, Error>>;
}

export abstract class BaseMessageHandler implements MessageHandler {
  abstract canHandle(message: Message): boolean;
  abstract handle(message: Message): Promise<Result<void, Error>>;

  protected isFromBot(message: Message): boolean {
    return message.author.bot;
  }
}
