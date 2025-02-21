import { Client, Message, TextChannel } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { CommandRegistry } from '../services/commandRegistry';
import { MessageBot } from './types';

export abstract class CommandBot implements MessageBot {
  protected constructor(
    protected readonly name: string,
    protected readonly avatarUrl: string,
    protected readonly client: Client,
    protected readonly commandRegistry: CommandRegistry
  ) {
    if (!name) throw new Error('Bot name is required');
    if (!avatarUrl) throw new Error('Bot avatar URL is required');
    if (!client) throw new Error('Discord client is required');
    if (!commandRegistry) throw new Error('Command registry is required');
  }

  getName(): string {
    return this.name;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  abstract canHandle(message: Message): boolean;
  abstract handle(message: Message): Promise<Result<void, Error>>;

  async sendReply(
    channel: TextChannel | Message,
    content: string
  ): Promise<Result<void, Error>> {
    try {
      if (channel instanceof Message) {
        await channel.reply(content);
      }
      else {
        await channel.send(content);
      }

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(error as Error);
    }
  }
}
