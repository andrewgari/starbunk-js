import { Message } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { MessageHandler } from '../handlers/messageHandler';

export class MessageProcessor {
  private readonly handlers: MessageHandler[];

  constructor(handlers: MessageHandler[]) {
    this.handlers = handlers;
  }

  async processMessage(message: Message): Promise<Result<void, Error>> {
    try {
      const handlers = this.handlers.filter((h) => h.canHandle(message));

      const results = await Promise.all(handlers.map((h) => h.handle(message)));

      const errors = results
        .filter((r) => r.isFailure())
        .map((r) => (r as Failure<Error>).error);

      if (errors.length > 0) {
        return new Failure(
          new AggregateError(errors, 'Multiple handlers failed')
        );
      }

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to process message')
      );
    }
  }
}
