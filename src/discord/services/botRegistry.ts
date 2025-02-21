import { Collection } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { BaseBot } from '../bots/baseBot';

export class BotRegistry<T extends BaseBot> {
  private bots: Collection<string, T> = new Collection();

  async registerBot(bot: T): Promise<Result<void, Error>> {
    try {
      const name = bot.getBotName();
      if (!name) {
        return new Failure(new Error('Bot name is required'));
      }

      if (this.bots.has(name)) {
        return new Failure(new Error(`Bot ${name} is already registered`));
      }

      this.bots.set(name, bot);

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to register bot')
      );
    }
  }

  getBot(name: string): T | undefined {
    return this.bots.get(name);
  }

  getAllBots(): T[] {
    return Array.from(this.bots.values());
  }
}
