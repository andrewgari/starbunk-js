import { Message } from 'discord.js';
import { Result, Success, Failure } from '@/utils/result';
import { Bot } from './types';

export const handleMessage = async (
  bot: Bot,
  message: Message
): Promise<Result<void, Error>> => {
  try {
    if (!bot.canHandle(message)) {
      return new Success(void 0);
    }

    if (message.author.bot && message.author.username === bot.getName()) {
      return new Success(void 0);
    }

    return bot.handle(message);
  } catch (error) {
    return new Failure(
      error instanceof Error ? error : new Error('Failed to handle message')
    );
  }
};
